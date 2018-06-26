import { masonFileToPerl, MasonDoc, tokenizeMasonFile, MasonBlock, BlockTypeName, tokenizeMason, } from "./mason.js";
import { parseUnit, tokenize, findTopSymbols, } from "./perl.js"
import {
    AstNode, Operator, ValueExpression, HashRefCreationExpression, Expression, InvocationExpression, NamedMemberExpression,
    ElsifStatement, UnresolvedExpression, VariableDeclarationExpression, ParenthesizedList, ForEachStatement, AstWriter,
    Unit, Token, TokenType, TokenTypes, BinaryExpression, UnlessStatement, HashMemberAccessExpression, NonParenthesizedList, PrefixUnaryExpression, VariableDeclarationStatement
} from "./perl-parser/index.js"
import { arrayMin, regexExec, pathJoin, ArrayItem } from "./utils.js"
import { parseExpression2 } from "./expression.js"

let emptyPerlTokenType: TokenType = new TokenType();
let emptyPerlToken: Token = new Token(null, emptyPerlTokenType);

export function generateJs(doc: MasonDoc): string {
    if (doc.renderFuncName == null)
        doc.renderFuncName = "render";
    let writer = new PerlToJsAstWriter();
    writer.main();
    writer.write(doc.unit);
    let set = new Set<string>(["__module", "$__module", "yield", "yieldAll", "_ctx_"]);
    let symbols = findTopSymbols(doc.unit).map(t => perlIdentifierToJs(t)).filter(t => !set.has(t));
    symbols = Array.from(new Set(symbols));
    symbols.sort();

    let js = `/** 
file: ${doc.filename} 
js_require: ${(doc.js_require || []).join(',')}
css_includes: ${(doc.css_includes || []).join(',')}
*/
export function *${doc.renderFuncName || 'render'}(_ctx_) {
    var {${symbols.join(',')}} = _ctx_;
${writer.sb.join("")}\n}\n`;
    //doc.generatedJs = js;
    return js;
}



export function perlToJs(code: string): string {
    let unit = parseUnit(code);
    let writer = new PerlToJsAstWriter();
    writer.main();
    writer.write(unit);
    return writer.sb.join("");
}


function perlTokenToJs(tr: ArrayItem<Token>): string {
    let token = tr.value;
    if (token.value == "yieldAll")
        return "yield*";
    if (token.is(TokenTypes.bareString))
        return JSON.stringify(token.value);
    if (token.is(TokenTypes.keyword, "and"))
        return "&&";
    if (token.type == TokenTypes.concat)
        return "+";
    if (token.type == TokenTypes.arrow)
        return ".";
    if (token.type == TokenTypes.packageSeparator)
        return ".";
    if (token.type == TokenTypes.fatComma)
        return ",";
    if (token.type == TokenTypes.braceOpen) {
        if (tr.prev.value.type == TokenTypes.arrow)
            return "";
        return "{";
    }
    if (token.type == TokenTypes.braceClose) {
        if (tr.prev.prev.value.type == TokenTypes.braceOpen && tr.prev.prev.prev.value.type == TokenTypes.arrow)
            return "";
        return "}";
    }
    if (token.type == TokenTypes.comment)
        return "//" + token.value;
    if (token.type == TokenTypes.sigiledIdentifier) {
        return perlIdentifierToJs(token.value);
    }
    if (token.type == TokenTypes.divDiv)
        return "||";
    if (token.is(TokenTypes.keyword, "not"))
        return "!";
    if (token.is(TokenTypes.keyword, "or"))
        return "||";
    if (token.is(TokenTypes.keyword, "ne"))
        return "!=";
    if (token.is(TokenTypes.keyword, "eq"))
        return "==";
    if (token.isAny([TokenTypes.qq])) {
        for (let regex of token.type.regexes) {
            //let regex2 = new Regex("^"+regex.source)
            let res = regex.exec(token.value);
            if (res != null && res[1] != null) {
                return JSON.stringify(res[1]);
            }
            //console.log(res, regex);
        }
    }
    if (token.is(TokenTypes.sigiledIdentifier, "$__module"))
        return "__module";
    return token.value;
}

export function perlIdentifierToJs(name: string): string {
    let s = name;
    s = s.replace(/[@%]/g, "$");
    return s;

}
//function perlToJs(perl: string): string {
//    let tokens = tokenize(perl);
//    return perlTokensToJs(tokens);
//}
function perlTokensToJs(tokens: Token[]): string {
    let sb: string[] = [];
    let tr = new ArrayItem<Token>(tokens, 0, emptyPerlToken);
    while (tr.value != emptyPerlToken) {
        sb.push(perlTokenToJs(tr));
        tr = tr.next;
    }
    return sb.join("");
}





export class PerlToJsAstWriter extends AstWriter {
    main() {
        super.main();
        //for my $notification ($internal_notifications) {
        this.register(ForEachStatement, t => {
            let list = t.list;
            if (list instanceof ParenthesizedList)
                list = list.list;
            return [[t.label, ":"], "for", [t.forEachTokenPost], ["(", t.variable || "var $_ ", [t.variablePost]], "of ", list, [t.listPost], ")", t.block];
        });

        this.register(VariableDeclarationExpression, t => {
            if (!(t.parentNode instanceof VariableDeclarationStatement)) {
                //console.log(t, t.parentNodeProp, t.parentNode);
                return ["/*var*/", [t.myOurTokenPost], t.variables, [t.variablesPost], [t.assignToken, [t.assignTokenPost], t.initializer]]; //TODO:
            }
            return ["var", [t.myOurTokenPost], t.variables, [t.variablesPost], [t.assignToken, [t.assignTokenPost], t.initializer]];
        });
        this.register(UnlessStatement, t => ["if", [t.keywordTokenPost], "(!", t.parenOpenToken, [t.parenOpenTokenPost], t.expression, t.parenCloseToken, [t.parenCloseTokenPost], ")", t.block, [t.else], [t.semicolonToken]]);
        this.register(ElsifStatement, t => ["else if", [t.keywordTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.expression, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.else], [t.semicolonToken]]);
        this.register(HashMemberAccessExpression, node => {
            let hash = node.member;
            if (hash.list.items.length == 1) {
                let item = hash.list.items[0];
                if (item instanceof NamedMemberExpression)
                    return [node.target, [node.memberSeparatorToken], ".", item];
                return [node.target, [node.memberSeparatorToken], ["[", hash.list, "]"]];
            }
            return [node.target, [node.memberSeparatorToken], node.member];
        });
        this.register(HashRefCreationExpression, node => {
            //return ["[", node.list, "]"]
            //let parentNode = node.parentNode;
            //if (parentNode instanceof UnresolvedExpression) {
            //    let prev = node.prevNode;
            //    if (prev != null && prev instanceof Operator && prev.value == "->") {
            //        if (node.list.items.length == 1) {
            //            let item = node.list.items[0];
            //            if (item instanceof UnresolvedExpression && item.nodes.length == 1)
            //                item = item.nodes[0] as Expression;
            //            if (item instanceof NamedMemberExpression)
            //                return [".", node.list];
            //        }
            //        return ["[", node.list, "]"]
            //    }
            //}
            //if (parentNode instanceof BinaryExpression && parentNode.operator.token.is(TokenTypes.arrow)) {
            //    if (node.list.items.length == 1) {
            //        let item = node.list.items[0];
            //        if (item instanceof NamedMemberExpression)
            //            return [node.list];
            //    }
            //    return ["[", node.list, "]"]
            //}
            return [node.braceOpenToken, [node.braceOpenTokenPost], [node.list], node.braceCloseToken];
        });
        this.register(BinaryExpression, node => {
            let right = node.right;
            if (node.operator.token.is(TokenTypes.arrow) && right instanceof HashRefCreationExpression) {
                if (right.list.items.length == 1) {
                    let item = right.list.items[0];
                    if (item instanceof NamedMemberExpression)
                        return [node.left, node.operator, item];
                }
                return [node.left, "[", right.list, "]"];
            }
            if (node.operator.token.is(TokenTypes.keyword, "if")) {
                return [node.right, " ? ", " ( ", node.left, " ) ", " : ", " ( ", node.right, " ) "];
            }

            return [node.left, node.operator, node.right];
        });
        this.register(Operator, op => {
            if (op.value == "=~") {
                return [" == /* =~ */"];
            }
            if (op.value == "->") {
                let parentNode = op.parentNode;
                if (parentNode instanceof UnresolvedExpression) {
                    let next = op.nextNode;
                    if (next != null && next instanceof HashRefCreationExpression)
                        return [];
                }
            }
            //if (op.value == "or")
            //    console.log(op);
            //if (op.token.is(TokenTypes.fatComma)) {
            //    let parentNode = op.parentNode;
            //    if (parentNode != null) {
            //        let pp = parentNode.parentNode;
            //        if (parentNode instanceof NonParenthesizedList && pp instanceof HashRefCreationExpression)
            //            return [":"];
            //    }
            //    return [","];
            //}
            return [op.token];
        });
        this.register(PrefixUnaryExpression, node => {
            if (node.operator.token.is(TokenTypes.sigil, "@")) {
                let exp = node.expression;
                if (exp instanceof HashRefCreationExpression)
                    return [exp.list];
                return [exp];
            }
            return [node.operator, [node.operatorPost], node.expression];
        });
        this.register(NonParenthesizedList, node => {
            let parent = node.parentNode;
            let all = this.zip(node.items, node.itemsSeparators).exceptNulls();
            //all.forEach((item, index) => {
            //    if (item instanceof Operator && item.token.is(TokenTypes.fatComma)) {
            //        let prev = all[index - 1];
            //        if (prev instanceof NamedMemberExpression)
            //            all[index - 1] = JSON.stringify(prev.name) as any;
            //    }
            //});
            if (parent instanceof HashRefCreationExpression) {
                all.forEach((item, index) => {
                    let isPairSeparator = (index + 1) % 4 == 0;
                    if (item instanceof Operator && item.token.isAny([TokenTypes.fatComma, TokenTypes.comma])) {
                        all[index] = isPairSeparator ? "," : ":" as any;
                    }
                });
            }
            else {
                all.forEach((item, index) => {
                    if (item instanceof Operator && item.token.isAny([TokenTypes.fatComma])) {
                        all[index] = "," as any;
                    }
                });
            }

            return all; //[this.zip(node.items, node.itemsSeparators).exceptNulls()];
        });
        this.register(ParenthesizedList, t => {
            return [[t.parenOpenToken, [t.parenOpenTokenPost]], [t.list], [t.parenCloseToken]];
        });
        this.register(ValueExpression, t => {
            //if (t.token.is(TokenTypes.qq)) {
            //    return t.value;
            //}
            return [t.token];
        });//.token]);

        this.register(InvocationExpression, t => {
            if (!(t.arguments instanceof ParenthesizedList))
                return [t.target, [t.targetPost], [t.memberSeparatorToken], "(", [t.arguments], ")"];
            return [t.target, [t.targetPost], [t.memberSeparatorToken], [t.arguments]];
        });

        //this.register(UnresolvedExpression, t => {
        //    let t2 = fixUnresolvedExpression(t);
        //    //let code = t2.toCode();
        //    //if (code.length < 300 && code.contains("ranking_preferred_message_to_internal_contracts_team"))
        //    //    console.log(t);
        //    let tokens = getAllTokens(t2);
        //    return perlTokensToJs(tokens);
        //});

    }
    write(obj: any) {
        if (obj instanceof Token) {
            this.sb.push(perlTokensToJs([obj]));
            return;
        }
        return super.write(obj);
    }

}





//export async function generateJs2(file: string, opts?: { skipHeader?: boolean, baseUrl?: string }): Promise<string> {
//    if (opts == null)
//        opts = {};

//    let tokens = await tokenizeMasonFile(file, opts);
//    let i = 0;
//    let expressions = tokens.filter(t => t.type == "expressionBlock").map(t => t.value);
//    //console.log(expressions);
//    let js = await toJs(tokens, opts);
//    return js;
//}



//async function toJs(tokens: MasonBlock[], opts?: { skipHeader?: boolean, baseUrl?: string }): Promise<string> {
//    if (opts == null)
//        opts = {};
//    let sb = [];
//    if (!opts.skipHeader) {
//        sb.push(`export function* render() {\n`)
//    }
//    for (let token of tokens) {
//        if (token.type == "literal")
//            sb.push(`yield ${JSON.stringify(token.code)}\n`);
//        else if (token.type == "expressionBlock") {
//            let exp = token.value;
//            sb.push(`yield ${masonExpToJs(exp)}\n`);
//            //sb.push(`yield evalExp(${JSON.stringify(token.match[1].trim())});\n`);
//        }
//        else if (token.type == "codeLine")
//            sb.push(perlToJs(token.value), "\n");
//        else if (token.type == "subCompBlock") {
//            let code = token.value;
//            if (code.indexOf("->") > 0) {
//                sb.push(perlToJs(code), "\n");
//            }
//            else {
//                let file = /([a-zA-Z0-9_\.]+)/.exec(code)[1];
//                sb.push(await generateJs2(file, { skipHeader: true, baseUrl: opts.baseUrl }), "\n");
//            }
//        }
//        //else if (token.type == "methodBlock")
//        //    sb.push(perlToJs(token.match[1].trim()), "\n");
//        else {
//            //console.warn("toJs not implemented for token", token.type);
//            //sb.push(token.code);
//        }
//    }
//    if (!opts || !opts.skipHeader)
//        sb.push(`}\n`)
//    return sb.join("");
//}



//function perlToJs2(perl: string): string {
//    return perl
//        .replace(/\.'>/g, "+'") //string concat
//        .replace(/\-\>/g, ".")
//        .replace(/\=\>/g, ":")
//        .replace(/ \/\/ /g, "||")
//        .replace(/elsif/g, "else if")
//        .replace(/ ne /g, " != ")
//        .replace(/ eq /g, " == ")
//        .replace(/\.\{([a-zA-Z0-9_]+)\}/g, ".$1")
//        .replace(/\.\{'([a-zA-Z0-9_]+)'\}/g, ".$1")
//        ;
//}


export async function process(req: { file: string }): Promise<{ js: string, doc: MasonDoc }> {
    let doc = await processMason(req.file);
    let docs = Array.from(getAllDocs(doc));
    //console.log({ docs });
    let md = docs.map(t => generateMetadata(t)).join(",\n");
    let js = [];
    js.push(`export module __module {\n\n`);
    //js.push(`export let $__module = __module;\n\n`);
    js.push(`export let metadata = [\n${md}\n];\n\n`);
    js.push(docs.map(t => t.generatedJs).join("\n\n\n\n"));
    js.push(`\n}\n`);
    js.push(`export default __module;\n`);
    let finalJs = js.join("");
    return { js: finalJs, doc }
}

export function* getAllDocs(doc: MasonDoc): IterableIterator<MasonDoc> {
    yield doc;
    for (let subDoc of doc.subDocs) {
        yield* getAllDocs(subDoc);
    }
}

export async function processMason(url: string, opts?: { renderFuncName?: string, processedUrls?: Set<string> }): Promise<MasonDoc> {
    if (opts == null)
        opts = {};
    if (opts.processedUrls == null)
        opts.processedUrls = new Set<string>();
    if (opts.renderFuncName == null) {
        opts.renderFuncName = "render";
        if (opts.processedUrls.size > 0)
            opts.renderFuncName += opts.processedUrls.size;
    }
    if (opts.processedUrls.has(url))
        return null;
    opts.processedUrls.add(url);
    let doc = await masonFileToPerl(url);
    doc.renderFuncName = opts.renderFuncName;
    doc.js_require = extractJsRequires(doc);
    doc.css_includes = extractCssRequires(doc);
    doc.generatedJs = generateJs(doc);

    for (let subComp of doc.subComps) {
        let url2 = getSubCompUrl(subComp, url);
        if (url2 == null) {
            console.warn("can't resolve subcomp url", { subComp, url });
            continue;
        }
        //let exp = parseExpression2(subComp);
        //let code = exp.toCode();
        //let val = exp.query().first(t => t instanceof ValueExpression) as ValueExpression;
        //if (val == null)
        //    continue;//TODO: warn
        //let url2 = val.value;
        //url2 = url2.replace(/['"]/g, "");
        //console.log({ subComp, url2 });
        //url2 = pathJoin(url, url2);
        ////console.log({ url2, testFilename, subComp });
        try {
            let doc2 = await processMason(url2, { processedUrls: opts.processedUrls });
            if (doc2 != null)
                doc.subDocs.push(doc2);
        }
        catch (err) {
            console.warn(err);
        }
    }
    return doc;
}

export function getSubCompUrl(code: string, baseUrl: string): string {
    let exp = parseExpression2(code);
    let val = exp.query().first(t => t instanceof ValueExpression) as ValueExpression;
    if (val == null) {
        console.warn("getSubCompUrl failed for", code, exp);
        return null;//TODO: warn
    }
    let url = val.value;
    url = url.replace(/['"]/g, "");
    url = pathJoin(baseUrl, url);
    return url;
}
export function generateMetadata(doc: MasonDoc): string {
    let json = JSON.stringify;
    return `{ filename:${json(doc.filename)}, js_require:${json(doc.js_require)}, css_includes:${json(doc.css_includes)}, renderFunc:${doc.renderFuncName} }`;
}


export function findBlock(doc: MasonDoc, type: BlockTypeName, attributes: string) {
    return doc.tokens.find(t => t.type == type && t.attributes.contains(attributes));
}

export function extractJsRequires(doc: MasonDoc): string[] {
    var block = findBlock(doc, "methodBlock", "js_require");
    if (block == null)
        return null;
    return evalMasonMethodBlock(block);
}

export function extractCssRequires(doc: MasonDoc): string[] {
    var block = findBlock(doc, "methodBlock", "css_includes");
    if (block == null)
        return null;
    return evalMasonMethodBlock(block);
}

export function evalMasonMethodBlock(block2: MasonBlock) {
    for (let block of tokenizeMason(block2.value)) {
        if (block.type == "perlBlock") {
            let perl = block.value;
            let js = perlToJs(perl);
            let func = new Function(js);
            let res = func();
            return res;
        }
    }
    return null;
}
