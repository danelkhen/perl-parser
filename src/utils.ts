
class Logger {
    log(...args) {
        console.log.apply(console, args);
    }
    errors = 0;
    error(...args) {
        this.errors++;
        if (this.errors > 10)
            throw new Error();
        console.error.apply(console, args);
    }
}
class TokenReader {
    tokens: Token[];
    token: Token;
    tokenIndex = -1;
    logger: Logger;
    get context(): string {
        let index = this.token.range.index;
        let src = this.token.range.src;
        var start = src.lastIndexOf("\n", index) || 0;
        var end = src.indexOf("\n", index) || index + 30;
        return src.substring(start, end);
    }
    getPrevToken() {
        return this.tokens[this.tokenIndex-1];
    }
    nextToken() {
        this.tokenIndex++;
        this.token = this.tokens[this.tokenIndex];
        if (this.token != null)
            this.logger.log(this.token.value);
    }
    nextNonWhitespaceToken() {
        this.nextToken();
        this.skipWhitespaceAndComments();
    }
    skipWhitespaceAndComments() {
        while (this.token != null && (this.token.is(TokenTypes.whitespace) || this.token.is(TokenTypes.comment)))
            this.nextToken();
    }
    expectIdentifier(value?: string) {
        return this.expect(TokenTypes.identifier, value);
    }
    expectKeyword(value?: string) {
        return this.expect(TokenTypes.keyword, value);
    }
    expect(type: TokenType, value?: string) {
        if (!this.token.is(type, value))
            this.onUnexpectedToken();
    }
    onUnexpectedToken(): any {
        this.logger.error("unexecpted token type", this.token);
        return null;
    }
}


class ParserBase {
    onUnexpectedToken(): any {
        this.reader.onUnexpectedToken();
        return null;
    }
    expectIdentifier(value?: string) {
        return this.reader.expectIdentifier(value);
    }
    expectKeyword(value?: string) {
        return this.reader.expectKeyword(value);
    }
    expect(type: TokenType, value?: string) {
        return this.reader.expect(type, value);
    }
    log(...args) {
        this.logger.log(args);
    }
    error(...args) {
        this.logger.error(args);
    }
    logger: Logger;
    reader: TokenReader;
    get token(): Token { return this.reader.token; }
    get currentLine(): string {
        return this.reader.context;
    }
    getPrevToken() {
        return this.reader.getPrevToken();
    }
    nextToken() {
        return this.reader.nextToken();
    }
    nextNonWhitespaceToken() {
        return this.reader.nextNonWhitespaceToken();
    }
    skipWhitespaceAndComments() {
        return this.reader.skipWhitespaceAndComments();
    }

}