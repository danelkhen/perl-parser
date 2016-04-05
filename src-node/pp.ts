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
import {ExpressionTester} from "./expression-tester";

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
    run(): Promise<any> {
        this.args2 = <PerlParserArgs>this.argsToObject(["-e"]);
        console.log(this.args2);
        if (this.args2["-e"] != null) {
            this.filename = "";
            this.code = this.args2["-e"];
            this.run2();
            return Promise.resolve();
        }
        else if (this.args2.rest.length > 0) {
            this.filename = this.args2.rest[0];//this.args[2]; //0=node 1=pp.js 2=real_arg
            return this.readFile(this.filename).then(t=> this.code = t).then(t=> this.run2());
        }
        else
            throw new Error("no params");


    }
    run2() {
        let expressionsFilename = "c:\\temp\\perl\\expressions.pm";
        //fs.writeFileSync(expressionsFilename, "");
        //fs.unlinkSync(expressionsFilename);
        let file = new File2(this.filename, this.code);
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
        //let expressions: string[] = [];
        //tester.onExpressionFound = e => {
        //    expressions.push(e.code);
        //    //console.log("onExpressionFound", expressions.length);
        //    //fs.writeFileSync(expressionsFilename, expressions.select(t=> t.trim()).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]).join("\n------------------------------------------------------------------------\n"));
        //};
        return tester.process().then(list=> {
            let expressions = list.select(t=> t.code).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]);
            let reports = expressions.select(s=> list.first(x=> x.code == s));


            console.log("SAVING");
            return fs.writeFileSync(expressionsFilename, reports.select(t=> [JSON.stringify({success:t.success}), t.code, t.dprs, t.mine].join("\n")).join("\n------------------------------------------------------------------------\n"));
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
    rest: string[];
}


process.on('uncaughtException', (err) => {
    console.error(`Caught exception: ${err}`);
});
process.on('unhandledRejection', (reason, p) => {
    console.error("Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging, throwing an error, or other logic here
});

let tool = new PerlParserTool();
tool.args = process.argv.skip(2);
console.log(tool.args);
tool.run();
