/// <reference path="../typings/browser.d.ts" />
"use strict";
//import * as fs from "fs";
//import "./libs/corex";
//var fs = require("fs");
var Tokenizer = (function () {
    function Tokenizer() {
        this.tempTokenTypes = [];
        TokenTypes.init();
        this.tokenTypes = TokenTypes.all.toArray();
    }
    Tokenizer.prototype.next = function () {
        var _this = this;
        //console.log("tokenizer next "+this.cursor.pos.line);
        var tt = this.tempTokenTypes.first(function (tokenType) {
            var count = tokenType.tryTokenize(_this);
            return count > 0;
        });
        if (tt != null) {
            this.tempTokenTypes.remove(tt);
            return;
        }
        tt = this.tokenTypes.first(function (tokenType) {
            var count = tokenType.tryTokenize(_this);
            return count > 0;
        });
        if (tt == null)
            throw new Error();
    };
    Tokenizer.prototype.main = function () {
        this.tokens = [];
        //let tokenTypes = TokenTypes.all;
        this.cursor = new Cursor(this.file.startPos);
        var cursor = this.cursor;
        while (cursor.index < this.file.text.length) {
            //if(this.cursor.pos.line>6000)
            //    break;
            this.next();
        }
    };
    return Tokenizer;
}());
