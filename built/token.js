"use strict";
var TokenType = (function () {
    function TokenType(regex) {
        this.regex = regex;
    }
    TokenType.prototype.create = function (range) {
        return new Token(range, this);
    };
    TokenType.prototype.match = function (cursor) {
        return cursor.next(this.regex);
    };
    return TokenType;
}());
var Token = (function () {
    function Token(range, type) {
        this.range = range;
        this.type = type;
        this.value = this.range.text;
    }
    Token.prototype.toString = function () {
        return this.type.name + " " + this.value;
    };
    Token.prototype.is = function (type) {
        return this.type.name == type.name;
    };
    Token.prototype.isKeyword = function (keyword) {
        return this.is(TokenTypes.keyword) && this.value == keyword;
    };
    return Token;
}());
var TokenTypes = (function () {
    function TokenTypes() {
    }
    TokenTypes.init = function () {
        var _this = this;
        if (this.all != null)
            return;
        this.all = [];
        Object.keys(TokenTypes).forEach(function (k) {
            var tt = TokenTypes[k];
            if (!(tt instanceof TokenType))
                return;
            tt.name = k;
            _this.all.push(tt);
        });
    };
    TokenTypes.identifierRegex = /[a-zA-Z_][a-zA-Z_0-9]*/;
    TokenTypes.qq = new TokenType(/qq\|.*\|/);
    TokenTypes.keyword = new TokenType(/package|use|my|sub/);
    TokenTypes.end = new TokenType(/__END__/);
    TokenTypes.whitespace = new TokenType(/[ \t\r\n]+/);
    TokenTypes.packageSeparator = new TokenType(/\:\:/);
    TokenTypes.semicolon = new TokenType(/;/);
    TokenTypes.sigiledIdentifier = new TokenType(new RegExp("[\\$@]" + TokenTypes.identifierRegex.source));
    TokenTypes.comment = new TokenType(/\#.*/);
    TokenTypes.equals = new TokenType(/=/);
    TokenTypes.comma = new TokenType(/\,/);
    TokenTypes.integer = new TokenType(/[0-9]+/);
    TokenTypes.parenOpen = new TokenType(/\(/);
    TokenTypes.parenClose = new TokenType(/\)/);
    TokenTypes.braceOpen = new TokenType(/\{/);
    TokenTypes.braceClose = new TokenType(/\}/);
    TokenTypes.bracketOpen = new TokenType(/\[/);
    TokenTypes.bracketClose = new TokenType(/\]/);
    TokenTypes.smallerThan = new TokenType(/\</);
    TokenTypes.greaterThan = new TokenType(/\>/);
    TokenTypes.arrow = new TokenType(/\-\>/);
    TokenTypes.dot = new TokenType(/\./);
    TokenTypes.interpolatedString = new TokenType(/\".*\"/);
    TokenTypes.string = new TokenType(/\'.*\'/);
    TokenTypes.divDiv = new TokenType(/\/\//);
    TokenTypes.tilda = new TokenType(/\~/);
    TokenTypes.regex = new TokenType(/\/.*\/\/[g]*/);
    TokenTypes.or = new TokenType(/\|\|/);
    TokenTypes.and = new TokenType(/\&\&/);
    TokenTypes.minus = new TokenType(/\-/);
    TokenTypes.mul = new TokenType(/\*/);
    TokenTypes.plus = new TokenType(/\+/);
    TokenTypes.identifier = new TokenType(TokenTypes.identifierRegex);
    TokenTypes.pod = new TokenType(/\=pod.*/);
    return TokenTypes;
}());
;
