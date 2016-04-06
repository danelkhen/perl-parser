import {Token, TokenType, TextRange2, File2, File2Pos} from "./token";
import {TokenTypes} from "./token-types";
import {AstNode} from "./ast";

export class Logger {
    items: LogItem[] = [];
    add(item: LogItem) {
        this.items.add(item);
        if (item.level == LogLevel.error || item.level==LogLevel.warning)
            console.log(item.toCompilerMessage());
    }
    log(args: any[]) {
        let item = LogItem.fromArgs(args);
        this.add(item);
    }
    error(args: any[]) {
        let item = LogItem.fromArgs(args);
        item.level = LogLevel.error;
        this.add(item);
    }
    warn(args: any[]) {
        let item = LogItem.fromArgs(args);
        item.level = LogLevel.warning;
        this.add(item);
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
        //if (this.token != null)
        //    this.logger.log(this.token.value);
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
        let item = new LogItem();
        item.msg = "Unexpected token";
        item.token = this.token;
        item.level = LogLevel.error;
        this.logger.add(item);
        return null;
    }
}



export class LogItem {
    msg: string;
    level: LogLevel;
    token: Token;
    node: AstNode;
    range: TextRange2;
    data: any;
    error: Error;





    static fromArgs(args: any[]): LogItem {
        //console.log("fromArgs", args);
        let item = new LogItem();
        for (let arg of args) {
            let type = typeof (arg);
            if (type == "string") {
                if (item.msg != null)
                    item.msg += ", " + arg;
                else
                    item.msg = arg;
            }
            else if (type == "object") {
                if (arg instanceof TextRange2)
                    item.range = arg;
                else if (arg instanceof Token)
                    item.token = arg;
                else if (arg instanceof AstNode)
                    item.node = arg;
                else if (arg instanceof Error) {
                    item.error = arg;
                    item.msg = (<Error>arg).message;
                }
                item[arg.constructor.name] = arg;
            }
            else {
                if (item.data == null)
                    item.data = [arg];
                else
                    item.data.push(arg);
            }
        }
        return item;
    }

    getRange(): TextRange2 {
        if (this.range != null)
            return this.range;
        if (this.token != null && this.token.range != null)
            return this.token.range;
        if (this.node != null && this.node.token != null && this.node.token.range != null)
            return this.node.token.range;
        return null;
    }
    toCompilerMessage(): string {
        let range = this.getRange();
        if (range == null) {
            if (this.msg != null)
                return this.msg;
            if (this.data != null)
                return this.data;
            return this.msg;
        }
        let filename = range.file.name;
        let line = range.start.line;
        let col = range.start.column;
        let level = LogLevel[this.level || 1];
        let code = "0000";
        let msg = this.msg;
        let final = `${filename}(${line},${col}): ${level} ${code}: ${msg}`;
        final += "\n" + range.file.getLineText(line);
        return final;
    }

    stringify(obj: Object) {
        if (obj == null)
            return "";
        if (typeof (obj) != "object")
            return obj.toString();
        if (obj instanceof TextRange2)
            return this.stringify(obj.start);
        if (obj instanceof File2Pos)
            return obj.line + ":" + obj.column;
        return obj.toString();
        //if(obj instanceof LogItem)
        //    return [obj obj.line+":"+obj.column;
    }

}

export enum LogLevel {
    debug = 1,
    info = 2,
    warning = 3,
    error = 4,
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
