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
        var cursor = new Cursor(this.src, this.pos);
        while (cursor.index < this.src.length) {
            var range;
            var tokenType2;
            tokenTypes.first(function (tokenType) {
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
    };
    return Tokenizer;
}());
var Cursor = (function () {
    function Cursor(src, index) {
        this.src = src;
        this.index = index;
    }
    Cursor.prototype.get = function (length) {
        return this.src.substr(this.index, length);
    };
    Cursor.prototype.next = function (regex) {
        var regex2 = new RegExp(regex.source, "g");
        regex2.lastIndex = this.index;
        var res = regex2.exec(this.src);
        if (res == null)
            return null;
        if (res.index != this.index)
            return null;
        return new TextRange2(this.src, this.index, res[0].length);
    };
    return Cursor;
}());
var TextRange2 = (function () {
    function TextRange2(src, index, length) {
        this.src = src;
        this.index = index;
        this.length = length || 0;
    }
    Object.defineProperty(TextRange2.prototype, "end", {
        get: function () { return this.index + this.length; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextRange2.prototype, "text", {
        get: function () { return this.src.substr(this.index, this.length); },
        enumerable: true,
        configurable: true
    });
    return TextRange2;
}());
