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
class PerlParserTool {
    filename: string;
    data: string;
    code: string;
    tokens: Token[];
    unit: Unit;

    readFile(filename: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(this.filename, 'utf8', (err, data) => {
                if (err)
                    throw err;
                resolve(data);
            });
        });
    }
    run(): Promise<any> {
        return this.readFile(this.filename).then(t=> this.data = t).then(t=> this.run2());
    }
    run2() {
        this.code = this.data;
        let file = new File2(this.filename, this.data);
        let tok = new Tokenizer();
        tok.file = file;
        tok.main();
        let parser = new Parser();
        parser.logger = new Logger();
        parser.reader = new TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = tok.tokens;
        parser.init();

        this.tokens = tok.tokens;
        var statements = parser.parse();
        //console.log(statements);
        let unit = new Unit();
        unit.statements = statements;
        this.unit = unit;
        let tester = new ExpressionTester();
        tester.unit = this.unit;
        return tester.process();
        //console.log("DONE");//, unit);

    }
}




let tool = new PerlParserTool();
tool.filename = process.argv[2]; //0=node 1=pp.js 2=real_arg
tool.run().catch(t=> console.log("CATCH", t)).then(t=> console.log("FINISHED", t));


export class ExpressionTester extends Refactor {
    unit: Unit;
    shouldCheck(node: Expression): boolean {
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
        if (node instanceof BinaryExpression || node instanceof MemberExpression)
            return true;
        return false;
    }
    process() {
        new AstNodeFixator().process(this.unit);
        let exps = this.getDescendants(this.unit).ofType(Expression).where(t=> this.shouldCheck(t));

        let promises = exps.select(exp => this.processExp(exp));
        let x = <Promise<ExpressionTesterReport[]>><any>Promise.all(promises); //tsc bug
        x.then(list=> {
            list = list.exceptNulls();
            console.log("FINISHED TESTING", { success: list.where(t=> t.success).length, fail: list.where(t=> !t.success).length });
        });
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
        if (node instanceof NamedMemberExpression && node.target == null) { //bareword
            console.log("found bareword", node.toCode());
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
    processExp(exp: Expression): Promise<ExpressionTesterReport> {
        let expCode = exp.toCode();
        let filename = this.generateFilename(exp);
        if (filename != null)
            filename = "C:\\temp\\perl\\" + filename + "_" + (this.filenameIndex++) + ".pm";
        let subs = this.extractImplicitInvocationSubs(exp);
        if (subs.length > 0)
            console.log("subs", subs);
        else if (expCode.contains("croak")) {
            throw new Error("didn't detect the sub!");
        }

        return new Deparse().deparse(expCode, { filename: filename, tryAsAssignment: true, assumeSubs: subs }).then(deparsedRes=> {
            let deparsed = deparsedRes.deparsed;
            if (!deparsedRes.success) {
                console.log("couldn't deparse: ", expCode);//, exp);
                return;
            }
            //console.log("testing", expCode);
            let mine = exp.toCode({ addParentheses: true, deparseFriendly: true });
            var deparsedClean = deparsed.trim();//.replace(/\s/g, "");
            if (deparsedClean.endsWith(";"))
                deparsedClean = deparsedClean = deparsedClean.substr(0, deparsedClean.length - 1);
            var mineClean = mine.trim();//.replace(/\s/g, "");
            if (deparsedClean.startsWith("(") && !mineClean.startsWith("("))
                mineClean = "(" + mineClean + ")";
            let report: ExpressionTesterReport = { success: deparsedClean == mineClean, mine: mineClean, code: expCode, dprs: deparsedClean, filename: filename, exp: exp };
            if (!report.success) {
                console.log("");
                console.log(filename);
                console.log(report.code);
                console.log(report.mine);
                console.log(report.dprs);
                //console.log(report.exp);
                console.log("");
            }
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

