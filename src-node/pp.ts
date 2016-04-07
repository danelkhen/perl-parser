import * as fs from "fs";
import * as fs2 from "./fs2";
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
import {ExpressionTester, ExpressionTesterReport} from "./expression-tester";

class PerlParserTool {
    filename: string;
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
    args2: PerlParserArgs;
    save: boolean;
    run(): Promise<any> {
        this.args2 = <PerlParserArgs>this.argsToObject(["-e", "-t", "-r", "-s", "-d"]);
        console.log("ARGS", this.args2);
        this.save = this.args2["-s"] != null;
        if (this.args2["-e"] != null) {
            this.filename = "";
            this.code = this.args2["-e"];
            return this.run2();
        }
        else if (this.args2["-t"]) {
            return this.test();
        }
        else if (this.args2["-r"]) {
            this.report();
            return Promise.resolve();
        }
        else if (this.args2.rest.length > 0) {
            this.filename = this.args2.rest[0];//this.args[2]; //0=node 1=pp.js 2=real_arg
            return fs2.readFile(this.filename, "utf8").then(t=> this.code = t.data).then(t=> this.run2());
        }
        else
            throw new Error("no params");
    }
    expressionsFilename = "C:\\Users\\Dan-el\\github\\perl-parser\\test\\expressions.pm";

    test() {
        console.log("testing ", this.expressionsFilename);
        let report = new ExpressionTesterReport();
        report.filename = this.expressionsFilename;
        report.loadSync();
        let successBefore = report.items.where(t=> t.success).length;
        report.items.forEach(item=> item.exp = this.parseExpression(item.code));

        if (this.args2["-d"]) { //re-deparse
            let tester = new ExpressionTester();
            //console.log(report.items);
            let promises = report.items.select(t => tester.testExp(t.exp));
            return Promise.all(promises).then(items2=> {
                console.log("NULLS", items2.select((t, i) => t == null ? report.items[i].exp.toCode() : null).where(t=> t != null));
                let successAfter = items2.where(t=> t.success).length;
                console.log("before", successBefore, "after", successAfter, "total", items2.length);
                report.items = items2;
                if (this.save) {
                    console.log("saving");
                    report.saveSync();
                }
            });
        }
        else {
            let tester = new ExpressionTester();
            report.items.forEach(t => tester.testDeparsedItem(t));
            let successAfter = report.items.where(t=> t.success).length;
            console.log("before", successBefore, "after", successAfter, "total", report.items.length);
            if (this.save) {
                console.log("saving");
                report.saveSync();
            }
        }
        //console.log("parsing", item.code);
        //let exp = this.parseExpression(item.code);
        ////console.log("parsed", exp);
        //console.log("running test");
        //return tester.testExp(exp).then(t=> console.log(t.success));
        //console.log("success: ", report.items.where(t=> t.success).length, "/", report.items.length);
    }


    report() {
        console.log("testing ", this.expressionsFilename);
        let report2 = new ExpressionTesterReport();
        report2.filename = this.expressionsFilename;
        report2.loadSync();
        console.log(report2);
        
        console.log("success: ", report2.items.where(t=> t.success).length, "/", report2.items.length);
    }

    parseUnit(filename: string, code: string): Unit {
        let file = new File2(filename, code);
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
        return unit;
    }
    parseExpression(code: string) {
        let unit = this.parseUnit("", code);
        let st = unit.statements[0];
        if (st instanceof ExpressionStatement) {
            return st.expression;
        }
        throw new Error();
    }
    run2(): Promise<ExpressionTesterReport> {
        let expressionsFilename = this.expressionsFilename;// "c:\\temp\\perl\\expressions.pm";

        this.unit = this.parseUnit(this.filename, this.code);

        let tester = new ExpressionTester();
        //let expressions: string[] = [];
        //tester.onExpressionFound = e => {
        //    expressions.push(e.code);
        //    //console.log("onExpressionFound", expressions.length);
        //    //fs.writeFileSync(expressionsFilename, expressions.select(t=> t.trim()).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]).join("\n------------------------------------------------------------------------\n"));
        //};
        return tester.testUnit(this.unit).then(list=> {
            let report = new ExpressionTesterReport();
            report.filename = expressionsFilename;
            report.loadSync();
            report.items.addRange(list);
            report.cleanup();
            if (this.save) {
                console.log("merging and saving results");
                report.saveSync();
            }
            return report;
            
            //let expressions = list.select(t=> t.code).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]);
            //let reports = expressions.select(s=> list.first(x=> x.code == s));
            //console.log("SAVING");
            //return fs.writeFileSync(expressionsFilename, reports.select(t=> [JSON.stringify({success:t.success}), t.code, t.dprs, t.mine].join("\n")).join("\n------------------------------------------------------------------------\n"));
        });
        //console.log("DONE");//, unit);

    }

    args: string[];
    argsToObject(flags: string[]) {
        let index = -1;
        let args = this.args;
        let obj = { rest: <string[]>[] };
        while (index < args.length) {
            index++;
            let arg = args[index];
            if (flags.contains(arg)) {
                index++;
                let arg2 = args[index];
                console.log(arg, arg2);
                if (arg2 == null || flags.contains(arg2)) {
                    obj[arg] = true;
                    index--;
                    continue;
                }
                obj[arg] = arg2;
            }
            else {
                obj.rest.push(arg);
            }
        }
        return obj;
    }

}

interface PerlParserArgs {
    "-e": string;
    "-t": string; //test
    "-d": string; //re-deparse
    "-r": string; 
    "-s": string; //save
    rest: string[];
}


process.on('uncaughtException', (err) => {
    console.error("Uncaught exception", err, err.stack);
});
process.on('unhandledRejection', (reason, p) => {
    console.error("Unhandled Rejection at: Promise ", p, " reason: ", reason, reason.stack);
    // application specific logging, throwing an error, or other logic here
});

let tool = new PerlParserTool();
tool.args = process.argv.skip(2);
console.log(tool.args);
tool.run();
