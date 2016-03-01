
interface TokenQuery {
    (token: Token): boolean;
}
interface TokenSetter {
    (token: Token): boolean;
}

//class AstNodeBuilder<T extends AstNode>{
    
//}

class ParserBase {
    onUnexpectedToken(): any {
        this.reader.onUnexpectedToken();
        return null;
    }
    expectIdentifier(value?: string) {
        return this.reader.expectIdentifier(value);
    }
    expectKeyword(value?: string):Token {
        if(this.reader.expectKeyword(value))
            return this.token;
        return null;
    }
    expectAny(types: TokenType[], node?: AstNode) {
        let res = this.reader.expectAny(types);
        if (res && node != null)
            node.tokens.add(this.token);
        return res;
    }
    expect(type: TokenType, node?: AstNode):Token {
        let res = this.reader.expect(type);
        if (res && node != null)
            node.tokens.add(this.token);
        return this.token;
    }
    expectToken(query: TokenQuery, node?: AstNode):Token {
        if (query(this.token)) {
            if (node != null)
                node.tokens.add(this.token);
            return this.token;
        }
        this.onUnexpectedToken();
        return null;
    }
    expectValue(type: TokenType, value: string, node?: AstNode) {
        let res = this.reader.expect(type, value);
        if (res && node != null)
            node.tokens.add(this.token);
        return res;
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
    get currentRangeText(): string {
        if (this.token == null)
            return null;
        return this.token.range.text;
    }
    get currentLineText(): string {
        return this.reader.currentLineText;
    }
    getPrevToken() {
        return this.reader.getPrevToken();
    }
    nextToken() {
        return this.reader.nextToken();
    }
    nextNonWhitespaceToken(node?: AstNode):Token[] {
        let skipped = this.reader.nextNonWhitespaceToken();
        if (node != null)
            node.tokens.addRange(skipped);
        return skipped;
    }
    skipWhitespaceAndComments(node?: AstNode) {
        let skipped = this.reader.skipWhitespaceAndComments();
        if (node != null)
            node.tokens.addRange(skipped);
        return skipped;
    }
    expectAndSkipWhitespace(node?: AstNode) {
        this.expect(TokenTypes.whitespace);
        return this.skipWhitespaceAndComments(node);
    }

    //expectCreate<T extends AstNode>(query: TokenQuery, ctor: Type<T>): T {
    //    this.expectToken(query);
    //    this.create(ctor);

    //}
    create<T extends AstNode>(ctor: Type<T>): T {
        let node = new ctor();
        node.token = this.token;
        node.tokens.add(this.token);
        return node;
    }

}
