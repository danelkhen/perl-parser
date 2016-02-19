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

}

class TokenTypes {
    static identifierRegex = /[a-zA-Z_][a-zA-Z_0-9]*/;
    static all: TokenType[];
    static init() {
        if (this.all != null)
            return;
        this.all = [];
        Object.keys(TokenTypes).forEach(k => {
            var tt = TokenTypes[k];
            if (!(tt instanceof TokenType))
                return;
            tt.name = k;
            this.all.push(tt);
        });

    }
    static qq = new TokenType(/qq\|.*\|/);
    static keyword = new TokenType(new RegExp(["package","use","my","sub","return","if","defined","ref","exists"].map(t=>t+="\\b").join("|"))); //\b|use\b|my\b|sub\b|return\b|if\b|defined\b/
    static end = new TokenType(/__END__/);
    static whitespace = new TokenType(/[ \t\r\n]+/);
    static packageSeparator = new TokenType(/\:\:/);
    static semicolon = new TokenType(/;/);
    static sigiledIdentifier = new TokenType(new RegExp("[\\$@]" + TokenTypes.identifierRegex.source));
    static comment = new TokenType(/\#.*/);
    static regExpEquals = new TokenType(/=\~/);
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
    static fatArrow = new TokenType(/\=\>/);
    static dot = new TokenType(/\./);
    static interpolatedString = new TokenType(/\".*\"/);
    static string = new TokenType(/\'.*\'/);
    static divDiv = new TokenType(/\/\//);
    static tilda = new TokenType(/\~/);
    static regex = new TokenType(/\/.*\/[a-z]*/);
    static regexSubstitute = new TokenType(/s\/.*\/.*\/[a-z]*/);  // s/abc/def/mg
    static or = new TokenType(/\|\|/);
    static and = new TokenType(/\&\&/);
    static minus = new TokenType(/\-/);
    static mul = new TokenType(/\*/);
    static plus = new TokenType(/\+/);
    static identifier = new TokenType(TokenTypes.identifierRegex);
    static pod = new TokenType(/\=pod.*/);
};


class TextRange2 {
    constructor(public file: File2, public start: File2Pos, public end?: File2Pos) {
        //this.src = src;
        //this.index = index;
        //this.length = length || 0;
        if (this.end == null)
            this.end = this.start;
    }
    //src: string;
    get index(): number { return this.start.index; }
    get length(): number { return this.end.index - this.start.index; }
    //length: number;
    //get end() { return this.index + this.length; }
    get text(): string { return this.file.text.substr(this.index, this.length); }
    //start: File2Pos;
    //end2: File2Pos;
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
        //let lineIndex = 0;
        //for (let i = 0; i < this.newLineIndexes.length; i++) {
        //    let li = this.newLineIndexes[i];
        //    if (li > index)
        //        break;
        //    lineIndex = li;
        //}
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

    get file(): File2 { return this.pos.file; }
    get src(): string { return this.file.text; }
    get index(): number { return this.pos.index; }
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
        let start = this.file.getPos(this.index);
        let end = this.file.getPos(this.index + res[0].length);
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