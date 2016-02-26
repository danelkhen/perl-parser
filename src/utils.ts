
class Logger {
    log(...args) {
        //console.log.apply(console, args);
    }
    errors = 0;
    error(...args) {
        console.error.apply(console, args);
        throw new Error();
        //this.errors++;
        //if (this.errors > 10)
        //    throw new Error();
    }
}

class TokenReader {
    tokens: Token[];
    token: Token;
    tokenIndex = -1;
    logger: Logger;
    get currentLineText(): string {
        return this.token.range.file.getLineText(this.token.range.start.line);
    }
    goto(tokenIndex: number) {
        this.tokenIndex = tokenIndex;
        this.token = this.tokens[this.tokenIndex];
    }
    getPrevToken() {
        return this.tokens[this.tokenIndex - 1];
    }
    getNextToken() {
        return this.tokens[this.tokenIndex + 1];
    }
    getNextNonWhitespaceToken() {
        let r = this.clone();
        r.nextNonWhitespaceToken();
        return r.token;
    }
    getRange(start: number, end: number): Token[] {
        return this.tokens.slice(start, end);
    }
    findClosingBraceIndex(open: TokenType, close: TokenType): number {
        this.expect(open);
        let depth = 1;
        while (depth > 0) {
            this.nextToken();
            if (this.token == null)
                return -1;
            if (this.token.is(open))
                depth++;
            else if (this.token.is(close))
                depth--;
        }
        return this.tokenIndex;
    }
    clone(): TokenReader {
        let r = new TokenReader();
        r.tokens = this.tokens;
        r.token = this.token;
        r.tokenIndex = this.tokenIndex;
        r.logger = this.logger;
        return r;
    }
    nextToken() {
        this.tokenIndex++;
        this.token = this.tokens[this.tokenIndex];
        if (this.token != null)
            this.logger.log(this.token.value);
    }
    nextNonWhitespaceToken(): Token[] {
        this.nextToken();
        return this.skipWhitespaceAndComments();
    }
    skipWhitespaceAndComments(): Token[] {
        let skipped: Token[] = [];
        while (this.token != null && (this.token.isAny([TokenTypes.whitespace, TokenTypes.comment, TokenTypes.pod]))) {
            skipped.push(this.token);
            this.nextToken();
        }
        return skipped;
    }
    expectIdentifier(value?: string) {
        return this.expect(TokenTypes.identifier, value);
    }
    expectKeyword(value?: string) {
        return this.expect(TokenTypes.keyword, value);
    }
    expect(type: TokenType, value?: string) {
        let res = this.token.is(type, value);
        if (!res)
            this.onUnexpectedToken();
        return res;
    }
    expectAny(types: TokenType[]): boolean {
        let res = this.token.isAny(types);
        if (!res)
            this.onUnexpectedToken();
        return res;
    }
    onUnexpectedToken(): any {
        this.logger.error("unexecpted token type", this.token, this.token.range.start.line, this.token.range.start.column);
        return null;
    }
}



interface RegExp {
    execFrom(index: number, s: string): RegExpExecArray;
    testFrom(index: number, s: string): boolean;
}

RegExp.prototype.execFrom = function (index: number, s: string): RegExpExecArray {
    let re: RegExp = this;
    re.lastIndex = index;
    return re.exec(s);
}
RegExp.prototype.testFrom = function (index: number, s: string): boolean {
    let re: RegExp = this;
    re.lastIndex = index;
    return re.test(s);
}


