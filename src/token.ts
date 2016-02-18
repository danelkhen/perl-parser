"use strict";
class TokenType {
    constructor(regex: RegExp) {
        this.regex = regex;
    }

    name: string;

    regex: RegExp;

    create(range: TextRange2) {
        return new Token(range, this);
    }

    match(cursor: Cursor) {
        return cursor.next(this.regex);
    }

}

class Token {
    constructor(public range: TextRange2, public type: TokenType) {
        this.value = this.range.text;
    }
    value: string
    toString() {
        return this.type.name + " " + this.value;
    }
    is(type: TokenType, value?:string) {
        if(this.type.name != type.name)
            return false;
        if(value!=null && this.value!=value)
            return false;
        return true;
    }
    isKeyword(value?: string) {
        return this.is(TokenTypes.keyword, value);
    }
    isIdentifier(value?: string) {
        return this.is(TokenTypes.identifier, value);
    }

}

class TokenTypes {
    static identifierRegex = /[a-zA-Z_][a-zA-Z_0-9]*/;
    static all: TokenType[];
    static init() {
        if(this.all!=null)
            return;
        this.all = [];
        Object.keys(TokenTypes).forEach(k => {
            var tt = TokenTypes[k];
            if(!(tt instanceof TokenType))
                return;
            tt.name = k;
            this.all.push(tt);
        });

    }
    static qq = new TokenType(/qq\|.*\|/);
    static keyword = new TokenType(/package|use|my|sub|return|if/);
    static end = new TokenType(/__END__/);
    static whitespace = new TokenType(/[ \t\r\n]+/);
    static packageSeparator = new TokenType(/\:\:/);
    static semicolon = new TokenType(/;/);
    static sigiledIdentifier = new TokenType(new RegExp("[\\$@]" + TokenTypes.identifierRegex.source));
    static comment = new TokenType(/\#.*/);
    static equals = new TokenType(/=/);
    static comma = new TokenType(/\,/);
    static integer = new TokenType(/[0-9]+/);
    static parenOpen = new TokenType(/\(/);
    static parenClose = new TokenType(/\)/);
    static braceOpen = new TokenType(/\{/);
    static braceClose = new TokenType(/\}/);
    static bracketOpen = new TokenType(/\[/);
    static bracketClose = new TokenType(/\]/);
    static smallerThan = new TokenType(/\</);
    static greaterThan = new TokenType(/\>/);
    static arrow = new TokenType(/\-\>/);
    static dot = new TokenType(/\./);
    static interpolatedString = new TokenType(/\".*\"/);
    static string = new TokenType(/\'.*\'/);
    static divDiv = new TokenType(/\/\//);
    static tilda = new TokenType(/\~/);
    static regex = new TokenType(/\/.*\/\/[g]*/);
    static or = new TokenType(/\|\|/);
    static and = new TokenType(/\&\&/);
    static minus = new TokenType(/\-/);
    static mul = new TokenType(/\*/);
    static plus = new TokenType(/\+/);
    static identifier = new TokenType(TokenTypes.identifierRegex);
    static pod = new TokenType(/\=pod.*/);
};
