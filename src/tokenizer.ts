/// <reference path="../typings/browser.d.ts" />
"use strict";


//import * as fs from "fs";
//import "./libs/corex";

//var fs = require("fs");
class Tokenizer {
    src: string;
    pos: number;

    main() {
        TokenTypes.init();
        this.tokens = [];
        var tokenTypes = TokenTypes.all;
        var cursor = new Cursor(this.src, this.pos);
        while (cursor.index < this.src.length) {
            var range: TextRange2;
            var tokenType2: TokenType;
            tokenTypes.first(tokenType => {
                range = tokenType.match(cursor);
                tokenType2 = tokenType;
                return range != null;
            });
            if (range == null)
                throw new Error("unknown token " + JSON.stringify(cursor.get(30)));
            this.tokens.push(tokenType2.create(range));
            if (tokenType2 == TokenTypes.end)
                break;
            //console.log(tokenType2.name, JSON.stringify(range.text));
            cursor.index += range.text.length;
        }
    }

    tokens: Token[];

}


interface TokenTypes {
    [key: string]: TokenType;
}

class Cursor {
    constructor(src, index) {
        this.src = src;
        this.index = index;
    }
    src: string;
    index: number;
    get(length) {
        return this.src.substr(this.index, length);
    }
    next(regex: RegExp): TextRange2 {
        let regex2 = new RegExp(regex.source, "g");
        regex2.lastIndex = this.index;
        var res = regex2.exec(this.src);
        if (res == null)
            return null;
        if (res.index != this.index)
            return null;
        return new TextRange2(this.src, this.index, res[0].length);
    }

}
class TextRange2 {
    constructor(src, index, length?) {
        this.src = src;
        this.index = index;
        this.length = length || 0;
    }
    src: string;
    index: number;
    length: number;
    get end() { return this.index + this.length; }
    get text(): string { return this.src.substr(this.index, this.length); }
}
