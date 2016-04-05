import * as fs from "fs";
import "../../../libs/corex";
import {Token, TokenType, File2, } from "../src/token";
import {AstWriter} from "../src/ast-writer";
import {ParserBase} from "../src/parser-base";
import {ExpressionParser} from "../src/expression-parser";
import {Parser} from "../src/parser";
import {
AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
HasArrow, HasLabel,
} from "../src/ast";
import {PrecedenceResolver} from "../src/precedence-resolver";
import {TokenTypes} from "../src/token-types";
import {Tokenizer} from "../src/tokenizer";
import {safeTry, TokenReader, Logger, AstNodeFixator} from "../src/utils";
import "../src/extensions";
import {Deparse} from "./deparse";
import {Refactor} from "../src/refactor";


export class ExpressionTester extends Refactor {
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
    process() {
        new AstNodeFixator().process(this.unit);
        let exps = this.getDescendants(this.unit).ofType(Expression).where(t=> this.shouldCheck(t));

        //return new Promise((resolve, reject) => {
        //exps.take(100).forEachAsyncProgressive((exp, cb) => this.processExp(exp).then(cb), list=> {
        //    list = list.exceptNulls();
        //    console.log("FINISHED TESTING", { success: list.where(t=> t.success).length, fail: list.where(t=> !t.success).length });
        //    resolve(list);
        //});
        //});
        console.log("GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG");
        let promises = exps.select(exp => this.processExp(exp));
        //let i = 0;
        //promises.forEach(t=> t.then(x=> console.log("damn", i++)));
        //return;
        console.log(Promise.all.toString());
        let x = <Promise<ExpressionTesterReport[]>><any>Promise.all(promises); //tsc bug
        return x.then(list=> {
            list = list.exceptNulls();
            console.log("FINISHED TESTING", { success: list.where(t=> t.success).length, fail: list.where(t=> !t.success).length });
            return list;
        }).catch(e=> console.log("FINISHED CATCH", e));
    }

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
    onExpressionFound(e: { code: string }) {
    }

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
                    return "b";
                if (t.token.is(TokenTypes.string))
                    return "'c'";
                if (t.token.is(TokenTypes.interpolatedString))
                    return '"$x_i"';
                return t.value;
            });
            writer.register(NamedMemberExpression, t=> [[t.target, t.memberSeparatorToken], this.redactVariableOrFunction(t.name)]);
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
    processExp(exp: Expression): Promise<ExpressionTesterReport> {
        let expCode = this.toCode(exp, { collapseWhitespace: true, redact: true, ignoreComments:true });//writer.sb.join("");
        this.onExpressionFound({ code: expCode });

        //let expCode = exp.toCode();
        let filename = this.generateFilename(exp);
        if (filename != null)
            filename = "C:\\temp\\perl\\" + filename + "_" + (this.filenameIndex++) + ".pm";
        let subs = this.extractImplicitInvocationSubs(exp);
        //if (subs.length > 0) {
        //    //console.log("subs", subs);
        //}
        //else if (expCode.contains("croak")) {
        //    throw new Error("didn't detect the sub!");
        //}

        return new Deparse().deparse(expCode, { filename: filename, tryAsAssignment: true, assumeSubs: subs }).then(deparsedRes=> {
            let deparsed = deparsedRes.deparsed;
            if (!deparsedRes.success) {
                console.error("couldn't deparse: ", expCode);//, exp);
                return { success: false, mine: mineClean, code: expCode, dprs: deparsedClean, filename: filename, exp: exp };;
            }
            //console.log("testing", expCode);
            let mine = this.toCode(exp, { addParentheses: true, deparseFriendly: true, redact: true });
            var deparsedClean = deparsed.trim();//.replace(/\s/g, "");
            if (deparsedClean.endsWith(";"))
                deparsedClean = deparsedClean = deparsedClean.substr(0, deparsedClean.length - 1);
            var mineClean = mine.trim();//.replace(/\s/g, "");
            if (deparsedClean.startsWith("(") && !mineClean.startsWith("("))
                mineClean = "(" + mineClean + ")";
            let report: ExpressionTesterReport = { success: deparsedClean == mineClean, mine: mineClean, code: expCode, dprs: deparsedClean, filename: filename, exp: exp };
            //if (!report.success) {
            console.log("");
            console.log(filename);
            console.log(report.code);
            console.log(report.mine);
            console.log(report.dprs);
            console.log(report.success ? "SUCCESS" : "FAIL");
            //console.log(report.exp);
            console.log("");
            //}
            return report;
        }).catch(t=> console.error(t));
    }
}

interface ExpressionTesterReport {
    filename: string;
    success: boolean;
    code: string;
    dprs: string;
    mine: string;
    exp: Expression;
}
