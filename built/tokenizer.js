/// <reference path="../typings/browser.d.ts" />
"use strict";
//import * as fs from "fs";
//import "./libs/corex";
//var fs = require("fs");
var Tokenizer = (function () {
    function Tokenizer() {
    }
    Tokenizer.prototype.main = function () {
        var _this = this;
        TokenTypes.init();
        this.tokens = [];
        var tokenTypes = TokenTypes.all;
        this.cursor = new Cursor(this.file.startPos);
        var cursor = this.cursor;
        while (cursor.index < this.file.text.length) {
            //console.log(cursor.pos.line, cursor.pos.column);
            var range;
            var tokenType2;
            tokenTypes.first(function (tokenType) {
                range = tokenType.match(_this);
                if (range != null && range.length == 0)
                    throw new Error();
                if (range != null && range.length > 100) {
                    console.log("a");
                }
                tokenType2 = tokenType;
                return range != null;
            });
            if (range == null) {
                tokenTypes.first(function (tokenType) {
                    range = tokenType.match(_this);
                    tokenType2 = tokenType;
                    return range != null;
                });
                throw new Error("unknown token " + JSON.stringify(cursor.get(30)));
            }
            if (range.end == null)
                throw new Error();
            this.tokens.push(tokenType2.create(range));
            if (tokenType2 == TokenTypes.end)
                break;
            //console.log(tokenType2.name, JSON.stringify(range.text));
            cursor.pos = range.end; // cursor.pos.skip(range.text.length); //
        }
    };
    return Tokenizer;
}());
