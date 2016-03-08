"use strict";
class TokenType {
    //constructor(regex: RegExp) {
    //    this.regex = regex;
    //}

    name: string;
    tag: any;

    //regex: RegExp;

    create(range: TextRange2) {
        return new Token(range, this);
    }
    create2(value: string) {
        return new Token(null, this, value);
    }
    match(tokenizer: Tokenizer): TextRange2 {
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
    //match(tokenizer: Tokenizer): TextRange2 {
    //    return this.matcher(tokenizer);
    //    //return cursor.next(this.regex);
    //}
}

interface TokenMatcher {
    (tokenizer: Tokenizer): TextRange2;
}

class Token {
    constructor(public range: TextRange2, public type: TokenType, value?: string) {
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
        return this.is(TokenTypes.keyword) && values.contains(this.value);
    }
    isAny(types: TokenType[]): boolean {
        return types.any(t=> this.is(t));
    }
    is(type: TokenType, value?: string) {
        if (this.type.name != type.name)
            return false;
        if (value != null && this.value != value)
            return false;
        return true;
    }
    isKeyword(value?: string) {
        return this.is(TokenTypes.keyword, value);
    }
    isIdentifier(value?: string) {
        return this.is(TokenTypes.identifier, value);
    }
    isAnyIdentifier(values: string[]) {
        return this.is(TokenTypes.identifier) && values.contains(this.value);
    }

}




class TextRange2 {
    constructor(public file: File2, public start: File2Pos, public end?: File2Pos) {
        if (this.end == null)
            this.end = this.start;
    }
    get index(): number { return this.start.index; }
    get length(): number { return this.end.index - this.start.index; }
    get text(): string { return this.file.text.substr(this.index, this.length); }
}

class File2 {
    constructor(name, text) {
        this.name = name;
        this.text = text;
        this.scanNewLines();
    }
    name: string;
    text: string;

    get startPos(): File2Pos { return this.getPos(0); }
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
            if (li > index)
                break;
            line++;
        }
        return line;
    }
    getPos(index: number): File2Pos {
        let line = this.findLine(index);
        let lineIndex = this.getLineStartIndex(line);
        let pos = new File2Pos();
        pos.line = line; //lineIndex + 1;
        pos.column = index - lineIndex + 1;
        pos.index = index;
        pos.file = this;
        return pos;
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

class File2Pos {
    line: number;
    column: number;
    index: number;
    file: File2;
    skip(length: number): File2Pos {
        return this.file.getPos(this.index + length);
    }
}


class Cursor {
    constructor(public pos: File2Pos) {
    }

    clone(): Cursor {
        return new Cursor(this.pos);
    }
    get file(): File2 { return this.pos.file; }
    get src(): string { return this.file.text; }
    get index(): number { return this.pos.index; }
    startsWith(s: string): boolean {
        return this.get(s.length) == s;
    }
    get(length) {
        return this.src.substr(this.index, length);
    }
    next(regex: RegExp): TextRange2 {
        let regex2 = regex;
        let s = this.src.substr(this.index);
        //regex2.lastIndex = this.index;
        var res = regex2.exec(s);
        if (res == null)
            return null;
        //if (res.index != this.index)
        //    return null;
        let start = this.file.getPos(this.index + res.index);
        let end = this.file.getPos(this.index + res.index + res[0].length);
        let range = new TextRange2(this.file, start, end);
        return range;
    }

}



class ArrayHelper {
    static firstIndex<T>(list: T[], predicate: (item: T) => boolean): number {
        for (let i = 0; i < list.length; i++) {
            if (predicate(list[i]))
                return i;
        }
        return -1;
    }
}