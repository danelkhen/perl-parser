/// <reference path="../typings/browser.d.ts" />
"use strict";
//import * as fs from "fs";
//import "./libs/corex";
//var fs = require("fs");
var Tokenizer = (function () {
    function Tokenizer() {
    }
    Tokenizer.prototype.main = function () {
        TokenTypes.init();
        this.tokens = [];
        var tokenTypes = TokenTypes.all;
        var cursor = new Cursor(this.file.startPos);
        while (cursor.index < this.file.text.length) {
            var range;
            var tokenType2;
            tokenTypes.first(function (tokenType) {
                range = tokenType.match(cursor);
                if (range != null && range.length == 0) {
                    range = tokenType.match(cursor);
                    throw new Error();
                }
                tokenType2 = tokenType;
                return range != null;
            });
            if (range == null)
                throw new Error("unknown token " + JSON.stringify(cursor.get(30)));
            this.tokens.push(tokenType2.create(range));
            if (tokenType2 == TokenTypes.end)
                break;
            //console.log(tokenType2.name, JSON.stringify(range.text));
            cursor.pos = range.end; // cursor.pos.skip(range.text.length); //
        }
    };
    return Tokenizer;
}());
