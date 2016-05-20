/// <reference path="extensions.ts" />
"use strict";
import {Tokenizer} from "./tokenizer";

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
    static _words(list: string[]): TokenType {
        let tt = TokenType._rs(list.map(t => new RegExp(t + "\\b")));
        tt.words = list;
        return tt;
    }
    static _rs(list: RegExp[]): TokenType {
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
    static _r(regex: RegExp): TokenType {
        let tt = new TokenType();
        regex = TokenType._fixRegex(regex);
        tt.match = tokenizer => {
            return tokenizer.cursor.next(regex);
        };
        return tt;
    }
    static _custom(matcher: TokenMatcher): TokenType {
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




export class TextFileRange {
    constructor(public file: TextFile, public start: TextFilePos, public end?: TextFilePos) {
        if (this.end == null)
            this.end = this.start;
    }
    get index(): number { return this.start.index; }
    get length(): number { return this.end.index - this.start.index; }
    get text(): string { return this.file.text.substr(this.index, this.length); }
}

export class TextFile {
    constructor(name, text) {
        this.name = name;
        this.text = text;
        this.scanNewLines();
    }
    name: string;
    text: string;

    get startPos(): TextFilePos { return this.getPos(0); }
    getLineStartIndex(line: number): number {
        if (line == 1)
            return 0;
        return this.newLineIndexes[line - 2] + 1;
    }
    //last index relative to start of line, without the line ending char. empty line has startIndex=endIndex=0
    getLineEndIndex(line: number): number {
        let nextLineStartIndex = this.getLineStartIndex(line + 1);
        if (nextLineStartIndex == null)
            return this.text.length - 1;
        return nextLineStartIndex - 1;
    }
    getLineText(line: number): string {
        let startIndex = this.getLineStartIndex(line);
        let endIndex = this.getLineEndIndex(line);
        return this.text.substring(startIndex, endIndex);
    }
    findLine(index: number): number {
        let line = 1;
        for (let i = 0; i < this.newLineIndexes.length; i++) {
            let li = this.newLineIndexes[i];
            if (li >= index)
                break;
            line++;
        }
        return line;
    }
    getPos(index: number): TextFilePos {
        let line = this.findLine(index);
        let lineIndex = this.getLineStartIndex(line);
        let pos = new TextFilePos();
        pos.line = line; //lineIndex + 1;
        pos.column = index - lineIndex + 1;
        pos.index = index;
        if (pos.column == 0)
            throw new Error();
        pos.file = this;
        return pos;
    }
    getPos2(start: TextFilePos, length: number) {
        if (length == 0)
            return start;
        let col = start.column;
        let line = start.line;
        let index = start.index;
        for (let i = 1; i <= length; i++) {
            index++;
            if (start.file.text[index - 1] == "\n") {
                line++;
                col = 1;
            }
            else {
                col++
            }
        }
        let pos = new TextFilePos();
        pos.file = start.file;
        pos.line = line;
        pos.column = col;
        pos.index = index;
        return pos;
    }
    getRange(index: number, length: number): TextFileRange {
        let start = this.getPos(index);
        let end = this.getPos(index + length);
        let range = new TextFileRange(this, start, end);
        return range;
    }
    getRange2(start: TextFilePos, length: number): TextFileRange {
        let end = this.getPos2(start, length);
        let range = new TextFileRange(this, start, end);
        return range;
    }

    scanNewLines() {
        let regex = /\n/g;
        while (true) {
            let match = regex.exec(this.text);
            if (match == null)
                break;
            this.newLineIndexes.push(match.index);
        }
    }
    newLineIndexes: number[] = [];
}

export class TextFilePos {
    line: number;
    column: number;
    index: number;
    file: TextFile;
    skip(length: number): TextFilePos {
        return this.file.getPos2(this, length);//this.index + length);
    }
    selectNext(length: number): TextFileRange {
        return this.file.getRange2(this, length);
    }
    _nextText: string;
    get nextText(): string {
        if (this._nextText == null)
            this._nextText = this.file.text.substr(this.index);
        return this._nextText;
    }
    evalNext(regex: RegExp): TextFileRange {
        var res = regex.exec(this.nextText);
        if (res == null)
            return null;
        let start = this.skip(res.index);
        let range = start.selectNext(res[0].length);
        return range;
    }
    next(length: number): string {
        return this.file.text.substr(this.index, length);
    }

    startsWith(s: string): boolean {
        return this.next(s.length) == s;
    }

}


export class Cursor {
    constructor(public pos: TextFilePos) {
    }

    clone(): Cursor {
        return new Cursor(this.pos);
    }
    get file(): TextFile { return this.pos.file; }
    get src(): string { return this.file.text; }
    get index(): number { return this.pos.index; }
    startsWith(s: string): boolean {
        return this.pos.startsWith(s);
    }
    next(regex: RegExp): TextFileRange {
        return this.pos.evalNext(regex);
    }

    nextAny(list: RegExp[]): TextFileRange {
        return list.selectFirstNonNull(t => this.next(t));
    }
    captureAny(list: RegExp[]): TextFileRange {
        return list.selectFirstNonNull(t => this.capture(t));
    }

    capture(regex: RegExp): TextFileRange {
        let regex2 = regex;
        let s = this.src.substr(this.index);
        var res = regex2.exec(s);
        if (res == null || res[1] == null) //res.length <= 1
            return null;
        let index = s.indexOf(res[1]);
        let range = this.file.getRange(this.index + index, res[1].length);
        return range;
    }


}



export class ArrayHelper {
    static firstIndex<T>(list: T[], predicate: (item: T) => boolean): number {
        for (let i = 0; i < list.length; i++) {
            if (predicate(list[i]))
                return i;
        }
        return -1;
    }
}
