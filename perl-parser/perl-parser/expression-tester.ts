import "../../../libs/corex";
import {Token, TokenType, } from "./token";
import {TextFile, TextFilePos, TextFileRange, Cursor} from "./text";
import {AstWriter} from "./ast-writer";
import {ExpressionParser} from "./expression-parser";
import {Parser} from "./parser";
import {
AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
HasArrow, HasLabel,
AstQuery,
} from "./ast";
import {PrecedenceResolver} from "./precedence-resolver";
import {TokenTypes} from "./token-types";
import {Tokenizer} from "./tokenizer";
import {safeTry, TokenReader, Logger, AstNodeFixator} from "./utils";
import "./extensions";
import {Refactor} from "./refactor";


export class ExpressionTester {
    unit: Unit;
    shouldCheck(node: Expression): boolean {
        let parent = node.parentNode;
        if (parent instanceof Expression && this.shouldCheck(parent))
            return false;
        if (node instanceof BlockExpression)
            return false;
        if (node instanceof NamedMemberExpression && node.target == null)
            return false;
        if (node instanceof InvocationExpression) {
            let target = node.target;
            if (target instanceof NamedMemberExpression && target.name == "use")
                return false;
            return true;
        }
        if (node instanceof BinaryExpression) {
            if (TokenTypes.statementModifiers.contains(node.operator.value))
                return false;
            return true;
        }
        if (node instanceof MemberExpression)
            return true;
        return false;
    }

    testUnit(unit: Unit): Promise<EtItem[]> {
        new AstNodeFixator().process(unit);
        let exps = new AstQuery(unit).getDescendants().ofType(Expression).where(t=> this.shouldCheck(t));

        let promises = exps.select(exp => this.deparseAndTestExp(exp));
        let x = <Promise<EtItem[]>><any>Promise.all(promises); //tsc bug
        return x.then(list=> {
            //list = list.exceptNulls();
            console.log("FINISHED TESTING", { success: list.where(t=> t.success).length, fail: list.where(t=> !t.success).length });
            return list;
        }).catch(e=> console.log("FINISHED CATCH", e, e.stack));
    }

    //testUnit2(unit: Unit): Promise<EtItem[]> {
    //    new AstNodeFixator().process(unit);
    //    let exps = new AstQuery(unit).getDescendants().ofType(Expression).where(t=> this.shouldCheck(t));

    //    let promises = exps.select(exp => this.testExp(exp));
    //    let x = <Promise<EtItem[]>><any>Promise.all(promises); //tsc bug
    //    return x.then(list=> {
    //        list = list.exceptNulls();
    //        console.log("FINISHED TESTING", { success: list.where(t=> t.success).length, fail: list.where(t=> !t.success).length });
    //        return list;
    //    }).catch(e=> console.log("FINISHED CATCH", e, e.stack));
    //}

    generateFilename(node: Expression) {
        let token = node.token
        if (token == null) {
            let refactor = new Refactor();
            token = refactor.getTokens(node)[0];
            if (token == null) {
                token = refactor.getChildren(node).selectFirstNonNull(t=> refactor.getTokens(t)[0]);
                if (token == null) {
                    console.warn("generateFilename - token is null for", node.constructor);
                    return null;
                }
            }
        }
        let pos = token.range.start;
        let filename = token.range.file.name.split(/[\\\/]/).last();
        let s = `${filename}_${pos.line}_${pos.column}`;
        //console.log("generateFilename", s);
        return s;

    }

    extractImplicitInvocationSubs(node: AstNode) {
        if (node instanceof NamedMemberExpression && node.target == null && node.token.isAny([TokenTypes.identifier, TokenTypes.keyword])) { //bareword
            //console.log("found bareword", node.toCode());
            if (node.token != null && (node.token.isKeyword() || node.token.isAnyIdentifier(TokenTypes.namedUnaryOperators)))
                return [];
            let parentNode = node.parentNode;
            if (parentNode != null && parentNode instanceof InvocationExpression && node.parentNodeProp == "target" && parentNode.arguments != null && !(parentNode.arguments instanceof ParenthesizedList)) {
                return [node.name];
            }
        }
        return new Refactor().getChildren(node).selectMany(t=> this.extractImplicitInvocationSubs(t));
    }
    filenameIndex = 0;

    variableIndex = 1;
    funcIndex = 1;
    variableMap: { [key: string]: string } = {};

    redactVariableOrFunction(name: string) {
        if (!["$", "@"].contains(name[0])) {
            if (TokenTypes.builtinFunctions.contains(name))
                return name;
            let x = this.funcIndex[name];
            if (x == null) {
                x = "func_" + this.funcIndex++;
                this.variableMap[name] = x;
            }
            return x;
        }
        let x = this.variableMap[name];
        if (x == null) {
            x = "$x_" + this.variableIndex++;
            this.variableMap[name] = x;
        }
        return x;
    }
    redactSingleBracedBareword(name: string) {
        return "b";
    }

    toCode(exp: Expression, opts?: { addParentheses?: boolean, deparseFriendly?: boolean, collapseWhitespace?: boolean, redact?: boolean, ignoreComments?: boolean }) {
        this.variableMap = {};
        this.variableIndex = 1;
        this.funcIndex = 1;
        if (opts == null)
            opts = {};

        let writer = new AstWriter();
        writer.addParentheses = opts.addParentheses;
        writer.deparseFriendly = opts.deparseFriendly;
        writer.collapseWhitespace = opts.collapseWhitespace;
        writer.ignoreComments = opts.ignoreComments;
        writer.main();
        if (opts.redact) {
            writer.register(Block, t=> "{;}");
            writer.register(ValueExpression, t=> {
                if (t.token == null)
                    return t.value;
                if (t.token.is(TokenTypes.bareString))
                    return "'b'";
                if (t.token.is(TokenTypes.string))
                    return "'c'";
                if (t.token.is(TokenTypes.interpolatedString))
                    return '"$x_i"';
                return t.value;
            });
            writer.register(NamedMemberExpression, node=> {
                //
                //if (node.isBareword() && node.target != null) //== null && parent instanceof InvocationExpression && node.parentNodeProp == "target")
                //    return [[node.target, node.memberSeparatorToken], this.redactVariableOrFunction(node.name)];

                if (node.isBareword() && node.target == null) {
                    let parent = node.parentNode;
                    if (parent != null && parent instanceof InvocationExpression && node.parentNodeProp == "target") {
                    }
                    else {
                        return [[node.target, node.memberSeparatorToken], this.redactVariableOrFunction(node.name), "()"];
                    }
                }
                return [[node.target, node.memberSeparatorToken], this.redactVariableOrFunction(node.name)];
            });
            writer.register(HashMemberAccessExpression, t=> {
                let name = writer.tryGetSingleBracedBareword(t.member);
                if (name != null) {
                    let name2 = this.redactSingleBracedBareword(name);
                    if (opts.deparseFriendly)
                        name2 = "'" + name2 + "'";
                    return [t.target, [t.memberSeparatorToken], "{" + name2 + "}"];
                }
                return [t.target, [t.memberSeparatorToken], t.member];
            });
        }

        writer.write(exp);
        let code = writer.sb.join("");
        return code;
    }
    testExpCode(code: string): Promise<EtItem> {
        return null;
    }

    sanitizeExpCode(code: string) {
        if (code == null)
            return null;
        code = code.trim();
        if (code.endsWith(";"))
            code = code.substr(0, code.length - 1);
        if (!code.startsWith("(") || !code.endsWith(")"))
            code = "(" + code + ")";
        return code;
    }
    deparseAndTestExp(exp: Expression): Promise<EtItem> {
        let item: EtItem = { exp: exp };
        item.code = this.toCode(exp, { collapseWhitespace: true, redact: true, ignoreComments: true });//writer.sb.join("");
        return this.deparseItem(item)
            .then(() => this.testDeparsedItem(item))
            .then(() => item);
    }
    testExp(exp: Expression): EtItem {
        let item: EtItem = { exp: exp };
        item.code = this.toCode(exp, { collapseWhitespace: true, redact: true, ignoreComments: true });//writer.sb.join("");
        this.testDeparsedItem(item);
        return item;
    }

    deparseItem(item: EtItem): Promise<EtItem> {
        console.log("deparseItem not available");
        return Promise.resolve(item);
        //let subs = [];
        //for (let i = 0; i < 20; i++) {
        //    subs.push("func_" + i);
        //}
        //item.filename = this.generateFilename(item.exp);
        //if (item.filename != null)
        //    item.filename = "C:\\temp\\perl\\" + item.filename + "_" + (this.filenameIndex++) + ".pm";
        //return new Deparse().deparse(item.code, { filename: item.filename, tryAsAssignment: true, assumeSubs: subs })
        //    .then(deparsedRes=> item.dprs = this.replaceNewLinesWithSpaces(deparsedRes.deparsed))
        //    .then(() => item);
    }

    replaceNewLinesWithSpaces(s: string): string {
        if (s == null)
            return null;
        return s.replaceAll("\n", " ");
    }

    testDeparsedItem(item: EtItem) {
        item.mine = this.toCode(item.exp, { addParentheses: true, deparseFriendly: true, redact: true });
        let success;
        let mine, dprs;
        if (item.dprs == null) {
            success = false;
        }
        else {
            mine = this.sanitizeExpCode(item.mine);
            dprs = this.sanitizeExpCode(item.dprs);
            success = dprs == mine;
            if (!success) {
                dprs = dprs.replaceAll(" ", "");
                mine = mine.replaceAll(" ", "");
                success = dprs == mine;
                if (!success) {
                    dprs = dprs.replaceAll("=>", ",");
                    mine = mine.replaceAll("=>", ",");
                    success = dprs == mine;
                    if (!success) {
                        dprs = dprs.replaceAll("&&", "and").replaceAll("||", "or").replaceAll("!", "not");
                        mine = mine.replaceAll("&&", "and").replaceAll("||", "or").replaceAll("!", "not");
                        success = dprs == mine;
                        if (!success) {
                            dprs = dprs.replaceAll(";", "");
                            mine = mine.replaceAll(";", "");
                            success = dprs == mine;
                        }
                    }
                }
            }
        }
        item.success = success;

        //if (!item.success) {
        if (!this.quiet) {
            console.log("");
            console.log(item.filename || "");
            console.log("ORIG : ", item.code);
            console.log("DPRS : ", item.dprs);
            console.log("MINE : ", item.mine);
            //console.log("DPRS2: ", dprs);
            //console.log("MINE2: ", mine);
            //console.log("EQ   : ", dprs == mine);
            console.log(item.success ? "SUCCESS" : "FAIL");
            //console.log(report.exp);
            console.log("");
        }
        //}
        return item;

    }
    quiet: boolean;
}


export interface EtItem {
    filename?: string;
    success?: boolean;
    code?: string;
    dprs?: string;
    mine?: string;
    exp?: Expression;
}




export class EtReport {
    items: EtItem[] = [];
    filename: string;
    sepText = "#######################################################################";
    sep = /\r?\n#######################################################################\r?\n/;
    loadSync(fs: any) {
        if (!fs.existsSync(this.filename))
            return;
        let s = fs.readFileSync(this.filename, "utf8");
        this.parse(s);
    }
    parse(s: string) {
        let groups = s.split(this.sep);
        let list = groups.select(group=> {
            let lines = group.lines();
            let item: EtItem = JSON.parse(lines[0]);
            item.code = lines[1];
            item.dprs = lines[2];
            item.mine = lines[3];
            return item;
        });
        this.items = list;
    }
    removeDoubles() {
        let set = new Set<string>();
        let length = this.items.length;
        this.items.reversed().forEach((t, i) => {
            if (set.has(t.code)) {
                let index = length - i - 1;
                let t2 = this.items[index];
                this.items.removeAt(index);
            }
            else
                set.add(t.code);
        });
    }
    sort() {
        this.items = this.items.orderBy([t=> t.code.contains("\n"), t=> t.code.length, t=> t.code]);
    }
    cleanup() {
        this.removeDoubles();
        this.sort();
    }
    saveSync(fs: any) {
        fs.writeFileSync(this.filename, this.items.select(t=> [JSON.stringify({ success: t.success }), t.code, t.dprs, t.mine, this.sepText].join("\n")).join("\n"));
    }
}



