/// <reference path="extensions.ts" />
import {Token, TokenType} from "./token";
import {AstWriter} from "./ast-writer";
import {AstNode} from "./ast";
import {TokenReader, Logger, LogItem, LogLevel} from "./utils";
import {TokenTypes} from "./token-types";


export interface TokenQuery {
    (token: Token): boolean;
}
export interface TokenSetter {
    (token: Token): boolean;
}

//class AstNodeBuilder<T extends AstNode>{
    
//}

export class ParserBase {
    onUnexpectedToken(): any {
        this.reader.onUnexpectedToken();
        return null;
    }
    expectIdentifier(value?: string): Token {
        return this.reader.expectIdentifier(value);
    }
    expectKeyword(value?: string): Token {
        if (this.reader.expectKeyword(value))
            return this.token;
        return null;
    }
    expectAny(types: TokenType[], node?: AstNode): Token {
        let res = this.reader.expectAny(types);
        if (res && node != null)
            node.tokens.add(this.token);
        return this.token;
    }
    expect(type: TokenType, node?: AstNode): Token {
        let res = this.reader.expect(type);
        if (res && node != null)
            node.tokens.add(this.token);
        return this.token;
    }
    expectToken(query: TokenQuery, node?: AstNode): Token {
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
    log(...args:any[]) {
        this.logger.log(args);
    }
    //error(...args:any[]) {
    //    this.logger.error(args);
    //}
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
    nextNonWhitespaceToken(node?: AstNode): Token[] {
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
