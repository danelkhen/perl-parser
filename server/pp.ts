import * as fs from "fs";
import * as fs2 from "./fs2";
import "../../../libs/corex";
import {Token, TokenType, } from "perl-parser";
import {TextFile, TextFilePos, TextFileRange, Cursor} from "perl-parser";
import {AstWriter} from "perl-parser";
import {ParserBase} from "perl-parser";
import {ExpressionParser} from "perl-parser";
import {Parser} from "perl-parser";
import {
AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
HasArrow, HasLabel,
} from "perl-parser";
import {PrecedenceResolver} from "perl-parser";
import {TokenTypes} from "perl-parser";
import {Tokenizer} from "perl-parser";
import {safeTry, TokenReader, Logger, AstNodeFixator} from "perl-parser";
import {Deparse} from "./deparse";
import {Refactor} from "perl-parser";
import {ExpressionTester, EtReport, EtItem} from "perl-parser";

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
    args: PerlParserArgs;
    save: boolean;
    quiet: boolean;
    run(): Promise<any> {
        this.args = new PerlParserArgs();
        this.argsToObject(this.args, this.rawArgs);
        console.log("ARGS", this.args);
        this.save = this.args.s != null;
        this.quiet = this.args.q != null;
        if (this.args.e != null) {
            this.filename = "";
            this.code = this.args.e;
            return this.run2();
        }
        else if (this.args.t) {
            return this.test();
        }
        else if (this.args.r) {
            this.report();
            return Promise.resolve();
        }
        else if (this.args.rest.length > 0) {
            this.filename = this.args.rest[0];//this.args[2]; //0=node 1=pp.js 2=real_arg
            return fs2.readFile(this.filename, "utf8").then(t=> this.code = t.data).then(t=> this.run2());
        }
        else
            throw new Error("no params");
    }
    expressionsFilename = "C:\\Users\\Dan-el\\github\\perl-parser\\test\\expressions.pm";

    test() {
        console.log("testing ", this.expressionsFilename);
        let report = new EtReport();
        report.filename = this.expressionsFilename;
        report.loadSync(fs);
        let successBefore = report.items.where(t=> t.success).length;
        report.items.forEach(item=> item.exp = this.parseExpression(item.code));

        if (this.args.d) { //re-deparse
            let tester = this.createTester();
            //console.log(report.items);
            let promises = report.items.select(t => tester.deparseAndTestExp(t.exp));
            return Promise.all(promises).then(items2=> {
                let items = <EtItem[]><any>items2; //tsc bug
                console.log("NULLS", items.select((t, i) => t == null ? report.items[i].exp.toCode() : null).where(t=> t != null));
                let successAfter = items.where(t=> t.success).length;
                console.log("before", successBefore, "after", successAfter, "total", items2.length);
                report.items = items;
                if (this.save) {
                    console.log("saving");
                    report.saveSync(fs);
                }
            });
        }
        else {
            let tester = this.createTester();
            report.items.forEach(t => tester.testDeparsedItem(t));
            let successAfter = report.items.where(t=> t.success).length;
            console.log("before", successBefore, "after", successAfter, "total", report.items.length);
            if (this.save) {
                console.log("saving");
                report.saveSync(fs);
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
        let report2 = new EtReport();
        report2.filename = this.expressionsFilename;
        report2.loadSync(fs);
        console.log(report2);

        console.log("success: ", report2.items.where(t=> t.success).length, "/", report2.items.length);
    }

    parseUnit(filename: string, code: string): Unit {
        let file = new TextFile(filename, code);
        let tok = new Tokenizer();
        tok.file = file;
        tok.process();
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
        new AstNodeFixator().process(unit);
        let st = unit.statements[0];
        if (st instanceof ExpressionStatement) {
            return st.expression;
        }

        throw new Error();
    }
    createTester(): ExpressionTester {
        let tester = new ExpressionTester();
        tester.quiet = this.quiet;
        tester.deparseItem = t=> this.deparseItem(t, tester);

        return tester;

    }
    deparseItem(item: EtItem, tester:ExpressionTester): Promise<EtItem> {
        let subs = [];
        for (let i = 0; i < 20; i++) {
            subs.push("func_" + i);
        }
        item.filename = tester.generateFilename(item.exp);
        if (item.filename != null)
            item.filename = "C:\\temp\\perl\\" + item.filename + "_" + (tester.filenameIndex++) + ".pm";
        return new Deparse().deparse(item.code, { filename: item.filename, tryAsAssignment: true, assumeSubs: subs })
            .then(deparsedRes=> item.dprs = tester.replaceNewLinesWithSpaces(deparsedRes.deparsed))
            .then(() => item);
    }

    run2(): Promise<EtReport> {
        let expressionsFilename = this.expressionsFilename;// "c:\\temp\\perl\\expressions.pm";

        this.unit = this.parseUnit(this.filename, this.code);

        let tester = this.createTester();
        //let expressions: string[] = [];
        //tester.onExpressionFound = e => {
        //    expressions.push(e.code);
        //    //console.log("onExpressionFound", expressions.length);
        //    //fs.writeFileSync(expressionsFilename, expressions.select(t=> t.trim()).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]).join("\n------------------------------------------------------------------------\n"));
        //};
        return tester.testUnit(this.unit).then(list=> {
            console.log("Finished: ", list.where(t=> t.success).length, "/", list.length);
            let report = new EtReport();
            report.filename = expressionsFilename;
            report.loadSync(fs);
            report.items.addRange(list);
            report.cleanup();
            if (this.save) {
                console.log("merging and saving results");
                report.saveSync(fs);
            }
            return report;
            
            //let expressions = list.select(t=> t.code).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]);
            //let reports = expressions.select(s=> list.first(x=> x.code == s));
            //console.log("SAVING");
            //return fs.writeFileSync(expressionsFilename, reports.select(t=> [JSON.stringify({success:t.success}), t.code, t.dprs, t.mine].join("\n")).join("\n------------------------------------------------------------------------\n"));
        });
        //console.log("DONE");//, unit);

    }

    rawArgs: string[];
    argsToObject<T>(obj2: T, args:string[]) {
        let obj: any = obj2 || {};
        let index = -1;
        while (index < args.length) {
            index++;
            let arg = args[index];
            if (arg == null)
                break;
            let name = "rest";;
            let value = null;
            let dashLength = arg[0] == "-" ? 1 : 0;
            if (dashLength && arg[1] == "-")
                dashLength = 2;
            if (dashLength > 0) {
                let eqIndex = arg.indexOf("=");
                if (eqIndex > 1) {
                    name = arg.substring(dashLength, eqIndex);
                    value = arg.substring(eqIndex + 1);
                }
                else {
                    name = arg.substring(dashLength);
                    value = true;
                }
            }
            else {
                value = arg;
            }
            if (obj[name] != null && obj[name] instanceof Array)
                obj[name].push(value);
            else
                obj[name] = value;
        }
        return obj;
    }

}

class PerlParserArgs {
    e: string;
    t: string | boolean; //test
    d: string | boolean; //re-deparse
    r: string | boolean;
    s: string | boolean; //save
    q: boolean; //quiet
    rest: string[] = [];
}


process.on('uncaughtException', (err) => {
    console.error("Uncaught exception", err, err.stack);
});
process.on('unhandledRejection', (reason, p) => {
    console.error("Unhandled Rejection at: Promise ", p, " reason: ", reason, reason.stack);
    // application specific logging, throwing an error, or other logic here
});

let tool = new PerlParserTool();
tool.rawArgs = process.argv.skip(2);
console.log(tool.rawArgs);
tool.run();
