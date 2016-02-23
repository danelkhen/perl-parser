
class Logger {
    log(...args) {
        //console.log.apply(console, args);
    }
    errors = 0;
    error(...args) {
        throw new Error();
        //this.errors++;
        //if (this.errors > 10)
        //    throw new Error();
        //console.error.apply(console, args);
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
    getPrevToken() {
        return this.tokens[this.tokenIndex - 1];
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
        while (this.token != null && (this.token.is(TokenTypes.whitespace) || this.token.is(TokenTypes.comment))) {
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
    expectAny(types: TokenType[]):boolean {
        let res = this.token.isAny(types);
        if (!res)
            this.onUnexpectedToken();
        return res;
    }
    onUnexpectedToken(): any {
        this.logger.error("unexecpted token type", this.token);
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


