/// <reference path="../typings/main/ambient/es6-shim/es6-shim.d.ts" />
import {Token, TokenType} from "./token";
import {TokenTypes} from "./token-types";
import {AstNode} from "./ast";

export class Logger {
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

export class TokenReader {
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
    getPrevNonWhitespaceToken(): Token {
        let index = this.tokenIndex;
        while (index > 0) {
            index--;
            let token = this.tokens[index];
            if (!token.is(TokenTypes.whitespace))
                return token;
        }
        return null;
    }
    getNextNonWhitespaceToken(): Token {
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
        while (this.token != null && (this.token.isAny([TokenTypes.whitespace, TokenTypes.comment, TokenTypes.pod, TokenTypes.heredocValue]))) {
            skipped.push(this.token);
            this.nextToken();
        }
        return skipped;
    }
    expectIdentifier(value?: string): Token {
        return this.expect(TokenTypes.identifier, value);
    }
    expectKeyword(value?: string) {
        return this.expect(TokenTypes.keyword, value);
    }
    expect(type: TokenType, value?: string): Token {
        let res = this.token.is(type, value);
        if (!res)
            this.onUnexpectedToken();
        return this.token;
    }
    expectAny(types: TokenType[]): boolean {
        let res = this.token.isAny(types);
        if (!res)
            this.onUnexpectedToken();
        return res;
    }
    onUnexpectedToken(): any {
        this.logger.error("unexecpted token type", this.token, this.token.range.start);
        return null;
    }
}






export class AstNodeFixator {
    process(node: AstNode) {
        let props = Object.keys(node);
        props.forEach(prop=> {
            if (prop == "parentNode")
                return;
            let value = node[prop];
            this.processProp(node, prop, value);
        });
    }

    processProp(node: AstNode, prop: string, value: any) {
        if (value == null)
            return;
        if (value instanceof AstNode) {
            let child = <AstNode>value;
            child.parentNode = node;
            child.parentNodeProp = prop;
            this.process(child);
        }
        else if (value instanceof Array) {
            value.forEach(t=> this.processProp(node, prop, t));
        }
    }
}



export let DEBUG = true;
export function safeTry<T>(action: (...args: any[]) => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        if (DEBUG) {
            let res = action();
            resolve(res);
        }
        else {
            try {
                let res = action();
                resolve(res);
            }
            catch (e) {
                reject(e);
            }
        }

    });
}
