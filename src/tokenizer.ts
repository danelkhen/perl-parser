/// <reference path="../typings/browser.d.ts" />
"use strict";


//import * as fs from "fs";
//import "./libs/corex";

//var fs = require("fs");
class Tokenizer {
    //src: string;
    //pos: number;
    file: File2;
    cursor:Cursor;

    main() {
        TokenTypes.init();
        this.tokens = [];
        let tokenTypes = TokenTypes.all;
        this.cursor = new Cursor(this.file.startPos);
        let cursor = this.cursor;
        while (cursor.index < this.file.text.length) {
            //console.log(cursor.pos.line, cursor.pos.column);
            var range: TextRange2;
            var tokenType2: TokenType;
            tokenTypes.first(tokenType => {
                range = tokenType.match(this);
                if (range != null && range.length == 0)
                    throw new Error();
                if (range!=null && range.length > 100) {
                    console.log("a");
                }
                tokenType2 = tokenType;
                return range != null;
            });
            if (range == null) {
                tokenTypes.first(tokenType => {
                    range = tokenType.match(this);
                    tokenType2 = tokenType;
                    return range != null;
                });
                throw new Error("unknown token " + JSON.stringify(cursor.get(30)));
            }
            if(range.end==null)
                throw new Error();
            this.tokens.push(tokenType2.create(range));
            if (tokenType2 == TokenTypes.end)
                break;
            //console.log(tokenType2.name, JSON.stringify(range.text));
            cursor.pos = range.end;// cursor.pos.skip(range.text.length); //
        }
    }

    tokens: Token[];

}


