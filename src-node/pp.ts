import * as fs from "fs";
import "../../libs/corex";
let x = require("../src/perl-parser");


class PerlParserTool {
    filename: string;
    data: string;
    code: string;
    tokens;//: x.Token[];
    unit;//: x.Unit;

    run() {

        console.log(x);
        fs.readFile(this.filename, 'utf8', (err, data) => {
            if (err)
                throw err;
            this.data = data;
            this.run2();
        });
    }
    run2() {
        this.code = this.data;
        let file = new x.File2(this.filename, this.data);
        let tok = new x.Tokenizer();
        tok.file = file;
        tok.main();
        let parser = new x.Parser();
        parser.logger = new x.Logger();
        parser.reader = new x.TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = tok.tokens;
        parser.init();

        this.tokens = tok.tokens;
        var statements = parser.parse();
        console.log(statements);
        let unit = new x.Unit();
        unit.statements = statements;
        this.unit = unit;
    }
}



let tool = new PerlParserTool();
tool.filename = process.argv[0];
tool.run();