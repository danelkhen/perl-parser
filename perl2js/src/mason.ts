import { parseExpression, parseUnit, tokenize, findTopSymbols } from "./perl.js"
import {
    AstNode, Operator, ValueExpression, HashRefCreationExpression, Expression, InvocationExpression, NamedMemberExpression,
    ElsifStatement, UnresolvedExpression, VariableDeclarationExpression, ParenthesizedList, ForEachStatement, AstWriter,
    Unit, Token, TokenType, TokenTypes
} from "./perl-parser/index.js"
import { arrayMin, regexExec, pathJoin, xhr } from "./utils.js"
import { parseExpression2 } from "./expression.js"

export interface MasonDoc {
    filename: string;
    tokens: MasonBlock[];
    unit: Unit;
    subComps: string[];
    subDocs: MasonDoc[];
    generatedJs?: string;
    js_require?: string[]
    css_includes?: string[];
    renderFuncName?: string;
    perlCode: string;
}
export async function masonFileToPerl(file: string): Promise<MasonDoc> {
    let res: MasonDoc = { unit: null, subComps: [], tokens: null, filename: file, subDocs: [], perlCode: null };
    let tokens = await tokenizeMasonFile(file);
    res.tokens = tokens;
    //console.log(res);
    let exps = tokens.filter(t => ["expressionBlock", "codeLine", "literal", "subCompBlock"].contains(t.type));
    let allCode = exps.map(t => {
        if (t.type == "literal")
            return `yield(${JSON.stringify(t.code)});`;
        let code = t.value;
        if (t.type == "expressionBlock") {
            code = removeMasonExpTrailings(code);// code.replace(/\|\s*[a-z]+\s*$/, "");//.exec(code);
            let tokens = tokenize(code);
            if (tokens.find(t => t.is(TokenTypes.comment)))
                code = `yield(${code}\n);`;
            else
                code = `yield(${code});`;
        }
        else if (t.type == "subCompBlock") {
            let perl = subCompBlockToPerl(code);
            res.subComps.push(perl);
            code = `yieldAll(subComp(${perl}, _ctx_, __module));`

            //console.log({ code, perl: subCompBlockToPerl(code) });
            //if (code.indexOf("->") > 0) {
            //    res.subComps.push(code);
            //    code = `yieldAll(subComp(${code}, _ctx_));`
            //}
            //else {
            //    let file = /([a-zA-Z0-9_\.]+)/.exec(code)[1];
            //    code = `yieldAll(subComp(${JSON.stringify(file)}, _ctx_));`; //TODO:
            //    res.subComps.push(file);
            //    //sb.push(await generateJs(file, { skipHeader: true, baseUrl: opts.baseUrl }), "\n");
            //}
        }

        return code;
    }).join("\n");
    //console.log(allCode);
    res.perlCode = allCode;
    let unit = parseUnit(allCode);
    //TEMP:
    //unit.query().getDescendants().filter(t => t instanceof UnresolvedExpression).map(t => console.log(t.toCode(), parseExpression2(t as any)));

    res.unit = unit;
    return res;
}

function removeMasonExpTrailings(code: string): string {
    //if(code.indexOf("maybeXSS")>=0)
    //    debugger;
    code = code.replace(/\s\|\s*[a-zA-Z_]+\s*$/, "");
    return code;
}

export function subCompBlockToPerl(code: string) {
    code = code.trim();
    code = removeMasonExpTrailings(code);
    let reSelf = /^SELF\:(.*)/;
    let res = reSelf.exec(code);
    if (res != null) {
        code = code.replace(reSelf, "$self->$1");
        return code;
    }
    let reFile = /^([\.\/a-zA-Z0-9_]+)/;
    res = reFile.exec(code);
    if (res != null) {
        code = code.replace(reFile, "'$1'");
    }
    let reComma = /^([^\,]*)\,([\s\S]*)$/m;
    res = reComma.exec(code);
    if (res != null) {
        code = code.replace(reComma, "$1,{$2}");
    }
    else {
        code = code + ",{}";
    }
    code = "[" + code + "]";
    return code;
    ////if(code.startsWith(""))
    ///*
    ///^['"]/


    //*/

}

export async function getFile(path: string): Promise<string> {
    let res: string = await xhr({ method: "GET", url: path });
    if (res.length > 0 && res.indexOf("\n") < 0) {
        //let url = new URL(path, location.href)
        let newUrl = pathJoin(path, res); //new URL(res, url.toString()).toString();
        let res2: string = await xhr({ method: "GET", url: newUrl });
        return res2;
    }
    return res;
}

export async function tokenizeMasonFile(file: string, opts?: { skipHeader?: boolean, baseUrl?: string }): Promise<MasonBlock[]> {
    let file2 = file;
    //if (opts == null)
    //    opts = {};
    //if (opts.baseUrl == null)
    //    opts.baseUrl = urlCombine(file, "./");
    //else
    //    file2 = urlCombine(opts.baseUrl, file);
    //console.log("tokenizeMason", file2);
    let res = await getFile(file2);
    let tokens = Array.from(tokenizeMason(res));
    return tokens;
}



function toHtml(tokens: MasonBlock[]): string {
    let sb = [];
    for (let token of tokens) {
        if (token.type == "literal")
            sb.push(token.code);
        else if (token.type == "expressionBlock")
            sb.push(evalExp(token.value));
        else
            console.warn("toHtml not implemented for token", token.type);
    }
    return sb.join("");
}

function evalExp(exp: string): string {
    let res = _evalExp(exp);
    //console.log(exp.padEnd(100) + "      = " + res);
    return res;
}

function _evalExp(exp: string): string {
    let results = Array.from(regexExec(/[a-zA-Z_0-9]+/g, exp));
    if (results.length == 0)
        return "$exp$";
    if (results.length > 1 && results[0][0] == "translate")
        return results[1][0];
    if (results.length > 1 && results[0][0] == "static_url")
        return results[1][0];
    if (results.length > 2 && results[1][0] == "url")
        return results[2][0];
    //console.log(exp, results);
    return results[0][0];
}




//function regex(s: string): Part {
//    return new Part(s, "regex");
//}
//function regex(s: string): Part {
//    return new Part(s, "regex");
//}

export function* tokenizeMason(code: string): IterableIterator<MasonBlock> {
    let cursor = code;
    let blocks: BlockType[] = [
        { name: "methodBlock", regex: /\<\%method([^!\>]*)?\>([\s\S]*?)\<\/\%method\>/gm },
        { name: "initBlock", regex: /\<\%init([^!\>]*)?\>([\s\S]*?)\<\/\%init\>/gm },
        { name: "onceBlock", regex: /\<\%once([^!\>]*)?\>([\s\S]*?)\<\/\%once\>/gm },
        { name: "sharedBlock", regex: /\<\%shared([^!\>]*)?\>([\s\S]*?)\<\/\%shared\>/gm },
        { name: "argsBlock", regex: /\<\%args([^!\>]*)?\>([\s\S]*?)\<\/\%args\>/gm },
        { name: "defBlock", regex: /\<\%def([^!\>]*)?\>([\s\S]*?)\<\/\%def\>/gm },
        { name: "cleanupBlock", regex: /\<\%cleanup([^!\>]*)?\>([\s\S]*?)\<\/\%cleanup\>/gm },
        { name: "perlBlock", regex: /\<\%perl([^!\>]*)?\>([\s\S]*?)\<\/\%perl\>/gm },
        { name: "codeLine", regex: /^\%(.*)\r?\n/gm },
        { name: "expressionBlock", regex: /\<\%([\s\S]*?)\%\>/gm },
        { name: "subCompBlock", regex: /\<\&'?([\s\S]*?)'?\&\>/gm },
    ];

    let index = 0;
    while (true) {
        let matches: BlockMatch[] = blocks.map(t => {
            t.regex.lastIndex = index;
            return { blockType: t, match: t.regex.exec(cursor) } as BlockMatch;
        });
        matches = matches.filter(t => t.match != null);
        let res = arrayMin(matches, t => t.match.index);
        if (res == null)
            break;
        let nextIndex = res.match.index;
        if (nextIndex > index) {
            yield { type: "literal", code: code.substring(index, nextIndex), index, value: code.substring(index, nextIndex), };
            index = nextIndex;
        }
        nextIndex += res.match[0].length;
        let block: MasonBlock = { type: res.blockType.name, code: code.substring(index, nextIndex), block: res.blockType, match: res.match, index, value: null };
        if (res.match.length == 3) {
            block.attributes = res.match[1];
            block.value = res.match[2];
        }
        else if (res.match.length == 2) {
            block.value = res.match[1];
        }
        else {
            console.warn("unexpected match", res);
        }
        yield block;
        index = nextIndex;
    }
    yield { type: "literal", code: code.substring(index), index, value: code.substring(index), };
}

export interface BlockMatch {
    match: RegExpExecArray;
    blockType: BlockType;
}

export type BlockTypeName = "literal" | "methodBlock" | "initBlock" | "onceBlock" | "argsBlock" | "cleanupBlock" | "perlBlock" | "codeLine" | "expressionBlock" | "subCompBlock" | "sharedBlock" | "defBlock";
export interface BlockType {
    name: BlockTypeName;
    regex: RegExp;
    match?();
}
export interface MasonBlock {
    type: BlockTypeName;
    code: string;
    match?: RegExpExecArray;
    block?: BlockType;
    index: number;
    value: string;
    /** */
    attributes?: string;
}










function tryGetSingleBracedBareword(node: HashRefCreationExpression): string {
    if (node == null || node.list == null || node.list.items == null || node.list.items.length != 1)
        return null;
    let item = node.list.items[0];
    if (item instanceof NamedMemberExpression && item.token.isAny([TokenTypes.identifier, TokenTypes.keyword]))
        return item.name;
    if (item instanceof ValueExpression && item.token.isAny([TokenTypes.identifier, TokenTypes.keyword]))
        return item.value;
    return null;
}


//function nodeToJs(ni: ArrayItem<AstNode>, writer: PerlToJsAstWriter) {
//    let node = ni.value;
//    while (node != null) {
//        writer.write(node);
//        ni = ni.next();
//        node = ni.value;
//    }

//}



////    `<%${identifier}${/.*/}>.*</%${identifier}>`

//regex().text("<%").regexCapture(identifier).anyExceptCapture("[)
//export function regex() { return new RegexBuilder(); }

//export class RegexBuilder {
//    parts: Part[] = [];
//    text(s: string): this {
//        this.parts.push(new Part("text", s));
//        return this;
//    }
//    regex(s: string): this {
//        this.parts.push(new Part("regex", s));
//        return this;
//    }
//    regexCapture(regex: string): this {
//        return this.regex("("+regex+")");
//    }

//}

//export function fixUnresolvedExpression(exp: UnresolvedExpression): Expression {
//    let tokens = getAllTokens(exp);
//    if (tokens.length <= 1)
//        return exp;
//    if (tokens.length > 2) {
//        console.log(exp, exp.toCode(), getAllTokens(exp));
//        return exp;
//    }
//    if (tokens[0].is(PerlTokenTypes.sigiledIdentifier && tokens[1].is(PerlTokenTypes.) {
//        let exp2 = new InvocationExpression();
//        exp2.arguments = nodes[1] as ParenthesizedList;
//        exp2.target = nodes[0] as NamedMemberExpression;
//        return exp2;
//    }
//    console.log(exp.toCode(), exp.nodes);
//    return exp;
//}
//export function fixUnresolvedExpression(exp: UnresolvedExpression): Expression {
//    return exp;
//    //let nodes = exp.nodes;
//    //if (nodes.length <= 1)
//    //    return exp;
//    //if (nodes.length > 2) {
//    //    console.log(exp, exp.toCode(), getAllTokens(exp));
//    //    return exp;
//    //}
//    //if (nodes[0] instanceof NamedMemberExpression && nodes[1] instanceof ParenthesizedList) {
//    //    let exp2 = new InvocationExpression();
//    //    exp2.arguments = nodes[1] as ParenthesizedList;
//    //    exp2.target = nodes[0] as NamedMemberExpression;
//    //    return exp2;
//    //}
//    //else if (nodes[0] instanceof NamedMemberExpression && nodes[1] instanceof Operator && (nodes[1] as Operator).token.is(PerlTokenTypes.arrow)) {
//    //    let exp2 = new InvocationExpression();
//    //    exp2.arguments = nodes[1] as ParenthesizedList;
//    //    exp2.target = nodes[0] as NamedMemberExpression;
//    //    return exp2;
//    //}
//    //console.log(exp.toCode(), exp.nodes);
//    //return exp;
//}
    //new ArrayItem([token]));
    //if (token.type == TokenTypes.arrow)
    //    return ".";
    //if (token.type == TokenTypes.fatComma)
    //    return ":";
    //if (token.type == TokenTypes.braceOpen)
    //    return "{";
    //if (token.type == TokenTypes.braceClose)
    //    return "}";
    //if (token.type == TokenTypes.comment)
    //    return "//";
    //if (token.type == TokenTypes.concat)
    //    return "+";
    //if (token.type == TokenTypes.sigiledIdentifier) {
    //    let s = token.value;
    //    s = s.replace(/@/g, "$");
    //    return s;
    //}
    //return token.value;
