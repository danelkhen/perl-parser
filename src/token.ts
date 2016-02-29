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
    constructor(public range: TextRange2, public type: TokenType) {
        this.value = this.range.text;
    }
    value: string
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

}



class HereDocTokenType extends TokenType {

    tryTokenize(tokenizer: Tokenizer): number {
        let range = tokenizer.cursor.next(/^<<"[a-zA-Z0-9]+"/);
        if (range == null)
            return 0;
        let ender = range.text.substring(3, range.text.length - 1);
        let newTokenType = TokenTypes._r(new RegExp("\\n[\\S\\s]*" + ender + "\\n", "m"));
        newTokenType.name = "heredocValue";
        tokenizer.tempTokenTypes.push(newTokenType);
        let token = this.create(range);
        tokenizer.tokens.push(token);
        tokenizer.cursor.pos = range.end;
        return 1;
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

    static _rs(list: RegExp[]): TokenType {
        let tt = new TokenType();
        tt.tag = list;
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
    static heredoc = new HereDocTokenType();// TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    static qq = TokenTypes._rs([/qq\|[^|]*\|/, /qq\{[^\}]*\}/]);
    static qw = TokenTypes._rs([/qw\/[^\/]*\//m, /qw<[^>]*>/m, /qw\([^\)]*\)/m]);
    static qr = TokenTypes._rs([/qr\/.*\//, /qr\(.*\)/]);//Regexp-like quote
    static tr = TokenTypes._r(/tr\/.*\/.*\//); //token replace
    static pod = TokenTypes._custom(TokenTypes._matchPod);
    //static pod = TokenTypes._r(/=pod.*=cut/m);
    static keyword = TokenTypes._rs([
        "BEGIN", "package", "use", "my", "sub", "return", "elsif", "else", "unless", "__END__",
        "and", "not",  "eq", 
        "foreach", "while", "for",
        "if", "unless", "while", "until", "for", "foreach", "when"    //statement modifiers
    ].map(t=> new RegExp(t + "\\b"))); //\b|use\b|my\b|sub\b|return\b|if\b|defined\b/
    //, "defined", "ref", "exists"
    static end = TokenTypes._r(/__END__/);
    static whitespace = TokenTypes._r(/[ \t\r\n]+/);
    static packageSeparator = TokenTypes._r(/\:\:/);
    static semicolon = TokenTypes._r(/;/);
    static sigiledIdentifier = TokenTypes._r(new RegExp("[\\$@%]" + TokenTypes.identifierRegex.source));
    static evalErrorVar = TokenTypes._r(/\$@/);
    static comment = TokenTypes._r(/\#.*/);
    static equals = TokenTypes._r(/==/);
    static concatAssign = TokenTypes._r(/\.=/);
    static addAssign = TokenTypes._r(/\+=/);
    static subtractAssign = TokenTypes._r(/\-=/);
    static multiplyAssign = TokenTypes._r(/\+=/);
    static divideAssign = TokenTypes._r(/\/=/);
    static comma = TokenTypes._r(/\,/);
    static integer = TokenTypes._r(/[0-9]+/);
    static parenOpen = TokenTypes._r(/\(/);
    static parenClose = TokenTypes._r(/\)/);
    static braceOpen = TokenTypes._r(/\{/);
    static braceClose = TokenTypes._r(/\}/);
    static bracketOpen = TokenTypes._r(/\[/);
    static bracketClose = TokenTypes._r(/\]/);
    static smallerOrEqualsThan = TokenTypes._r(/\<=/);
    static greaterOrEqualsThan = TokenTypes._r(/\>=/);
    static interpolatedString = TokenTypes._r(/\"[^"]*\"/);
    static string = TokenTypes._r(/\'[^\']*\'/);
    static regex = TokenTypes._custom(TokenTypes._matchRegex);//_r(/\/.*\/[a-z]*/);
    static regexSubstitute = TokenTypes._r(/s\/.*\/.*\/[a-z]*/);  // s/abc/def/mg

    static colon = TokenTypes._r(/\:/);
    static question = TokenTypes._r(/\?/);
    
    //unary:
    static inc = TokenTypes._r(/\+\+/);
    static dec = TokenTypes._r(/\-\-/);
    static codeRef = TokenTypes._r(/\\\&/);
    static lastIndexVar = TokenTypes._r(/\$#/);
    
    //binary
    static numericCompare = TokenTypes._r(/\<=\>/);
    static regExpEquals = TokenTypes._r(/=\~/);
    static regExpNotEquals = TokenTypes._r(/\!\~/);
    static smallerThan = TokenTypes._r(/\</);
    static greaterThan = TokenTypes._r(/\>/);
    static arrow = TokenTypes._r(/\-\>/);
    static fatComma = TokenTypes._r(/\=\>/);
    static assignment = TokenTypes._r(/=/);
    static range = TokenTypes._r(/\.\./);
    static concat = TokenTypes._r(/\./);
    static divDiv = TokenTypes._r(/\/\//);
    static tilda = TokenTypes._r(/\~/);
    static or = TokenTypes._r(/\|\|/);
    static and = TokenTypes._r(/\&\&/);
    static minus = TokenTypes._r(/\-/);
    static multiply = TokenTypes._r(/\*/);  //also typeglob
    static div = TokenTypes._r(/\//);
    static plus = TokenTypes._r(/\+/);
    static multiplyString = TokenTypes._r(/x/);
    
    
    //static label = TokenTypes._r(new RegExp(TokenTypes.identifierRegex.source+"[\t\r\n ]*\:"));
    static identifier = TokenTypes._r(TokenTypes.identifierRegex);


    static deref = TokenTypes._r(/\\/);
    static not = TokenTypes._r(/\!/);
    static sigil = TokenTypes._r(/[\$@%]/);

    static _matchPod(tokenizer: Tokenizer): TextRange2 {
        let cursor = tokenizer.cursor;
        if (cursor.pos.column > 1)
            return null;
        let start = cursor.next(/=[a-z]+/);
        if (start == null)
            return null;
        //if (!cursor.startsWith("=pod") && !cursor.startsWith("=encoding"))
        //    return null;
        //let start = cursor.index;
        let cursor2 = cursor.clone();
        cursor2.pos = start.end;

        let end: number;
        let cut = cursor2.next(/=cut/);
        if (cut != null)
            end = cut.index + 4;
        else
            end = cursor.file.text.length;
        //cursor.pos.index = end;
        let range = new TextRange2(cursor.file, start.start, cursor.file.getPos(end));
        return range;
    }

    static _findLastNonWhitespaceOrCommentToken(tokens: Token[]) {
        for (let i = tokens.length - 1; i >= 0; i--) {
            let token = tokens[i];
            if (!token.isAny([TokenTypes.comment, TokenTypes.whitespace]))
                return token;
        }
        return null;
    }
    static _matchRegex(tokenizer: Tokenizer): TextRange2 { //figure out how to distinguish between regex and two divisions. a / b / c, is it a(/b/c), or (a / b) / c ?
        let cursor = tokenizer.cursor;
        let lastToken = TokenTypes._findLastNonWhitespaceOrCommentToken(tokenizer.tokens);
        if (lastToken == null)
            return null;
        if (lastToken.isAny([TokenTypes.braceClose, TokenTypes.parenClose]))
            return null;
        let pattern = /\/.*\/[a-z]*/;
        let res = cursor.next(pattern);
        if (res == null)
            return null;
        let code = res.text.substring(0, res.text.lastIndexOf("/") + 1);
        if (code == "//")
            return null;
        console.log("Detected regex", res.text, lastToken);
        return res;
        //try {
        //    let func = new Function("return " + code + ";");
        //    let res2 = func();
        //    return res;
        //}
        //catch (e) {
        //    return null;
        //}
    }

}

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
        let regex2 = new RegExp("^" + regex.source, (regex.multiline ? "m" : "") + (regex.global ? "g" : ""));
        let s = this.src.substr(this.index);
        //regex2.lastIndex = this.index;
        var res = regex2.exec(s);
        if (res == null)
            return null;
        //if (res.index != this.index)
        //    return null;
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