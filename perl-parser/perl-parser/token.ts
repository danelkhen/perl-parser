/// <reference path="extensions.ts" />
"use strict";
import {Tokenizer} from "./tokenizer";
import {TextFile, TextFilePos, TextFileRange} from "./text";

export class TokenType {
    name: string;
    tag: any;

    words: string[];
    regex: RegExp;
    regexes: RegExp[];

    create(range: TextFileRange) {
        return new Token(range, this);
    }
    create2(value: string) {
        return new Token(null, this, value);
    }
    match(tokenizer: Tokenizer): TextFileRange {
        throw new Error();
    }


    tryTokenize(tokenizer: Tokenizer): number {
        let range = this.match(tokenizer);
        if (range == null)
            return 0;
        if (range.length == 0)
            throw new Error();
        let token = this.create(range);
        tokenizer.tokens.push(token);
        tokenizer.cursor.pos = range.end;
        return 1;
    }


    static _fixRegex(regex: RegExp): RegExp {
        let regex2 = new RegExp("^" + regex.source, (regex.multiline ? "m" : "") + (regex.global ? "g" : ""));
        return regex2;
    }
    static words(list: string[]): TokenType {
        let tt = TokenType.anyRegex(list.map(t => new RegExp(t + "\\b")));
        tt.words = list;
        return tt;
    }
    static anyRegex(list: RegExp[]): TokenType {
        let tt = new TokenType();
        list = list.select(t => TokenType._fixRegex(t));
        tt.regexes = list;
        tt.match = tokenizer => {
            let res = null;
            list.first(regex => {
                let res2 = tokenizer.cursor.next(regex);
                if (res2 != null) {
                    res = res2;
                    return true;
                }
                return false;
            });
            return res;
            //return cursor.next(regex);
        };
        return tt;
    }
    static regex(regex: RegExp): TokenType {
        let tt = new TokenType();
        regex = TokenType._fixRegex(regex);
        tt.match = tokenizer => {
            return tokenizer.cursor.next(regex);
        };
        return tt;
    }
    static custom(matcher: TokenMatcher): TokenType {
        let tt = new TokenType();
        tt.match = matcher;
        return tt;
    }
    static _capture(regex: RegExp): TokenType {
        let tt = new TokenType();
        regex = TokenType._fixRegex(regex);
        tt.match = tokenizer => {
            return tokenizer.cursor.capture(regex);
        };
        return tt;
    }
}

export interface TokenMatcher {
    (tokenizer: Tokenizer): TextFileRange;
}

export class Token {
    constructor(public range: TextFileRange, public type: TokenType, value?: string) {
        if (this.range == null)
            this.value = value;
        else
            this.value = this.range.text;
    }
    value: string;
    toString() {
        return this.type.name + " " + this.value;
    }
    isAnyKeyword(values: string[]): boolean {
        return this.is2("keyword") && values.contains(this.value);
    }
    isAny(types: TokenType[]): boolean {
        return types.any(t => this.is(t));
    }
    is(type: TokenType, value?: string) {
        if (this.type.name != type.name)
            return false;
        if (value != null && this.value != value)
            return false;
        return true;
    }
    is2(typeName: string, value?: string) {
        if (this.type.name != typeName)
            return false;
        if (value != null && this.value != value)
            return false;
        return true;
    }
    isKeyword(value?: string) {
        return this.is2("keyword", value);
    }
    isIdentifier(value?: string) {
        return this.is2("identifier", value);
    }
    isAnyIdentifier(values: string[]) {
        return this.is2("identifier") && values.contains(this.value);
    }

}


