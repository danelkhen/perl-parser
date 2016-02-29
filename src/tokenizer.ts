/// <reference path="../typings/browser.d.ts" />
"use strict";


//import * as fs from "fs";
//import "./libs/corex";

//var fs = require("fs");
class Tokenizer {
    //src: string;
    //pos: number;
    file: File2;
    cursor: Cursor;
    tempTokenTypes: TokenType[] = [];
    tokenTypes: TokenType[];
    constructor() {
        TokenTypes.init();
        this.tokenTypes = TokenTypes.all.toArray();
    }

    next() {
        //console.log("tokenizer next "+this.cursor.pos.line);
        let tt = this.tempTokenTypes.first(tokenType => {
            let count = tokenType.tryTokenize(this);
            return count > 0;
        });
        if (tt != null) {
            this.tempTokenTypes.remove(tt);
            return;
        }
        tt = this.tokenTypes.first(tokenType => {
            let count = tokenType.tryTokenize(this);
            return count > 0;
        });
        if (tt == null)
            throw new Error();
    }
    main() {
        this.tokens = [];
        //let tokenTypes = TokenTypes.all;
        this.cursor = new Cursor(this.file.startPos);
        let cursor = this.cursor;
        while (cursor.index < this.file.text.length) {
            //if(this.cursor.pos.line>6000)
            //    break;
            this.next();

            //let tokenType2 = tokenTypes.first(tokenType => {
            //    let count = tokenType.tryTokenize(this);
            //    return count > 0;
            //});


            ////console.log(cursor.pos.line, cursor.pos.column);
            //var range: TextRange2;
            //var tokenType2: TokenType;
            //tokenTypes.first(tokenType => {
            //    range = tokenType.match(this);
            //    if (range != null && range.length == 0)
            //        throw new Error();
            //    tokenType2 = tokenType;
            //    return range != null;
            //});
            //if (range == null) 
            //    throw new Error("unknown token " + JSON.stringify(cursor.get(30)));
            //if(range.end==null)
            //    throw new Error();
            //this.tokens.push(tokenType2.create(range));
            //if (tokenType2 == TokenTypes.end)
            //    break;
            ////console.log(tokenType2.name, JSON.stringify(range.text));
            // cursor.pos = range.end;// cursor.pos.skip(range.text.length); //
        }
    }

    tokens: Token[];

}


