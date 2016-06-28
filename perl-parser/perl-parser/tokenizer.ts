"use strict";

import {Token, TokenType} from "./token";
import {TextFile, TextFilePos, TextFileRange, Cursor} from "./text";
import {TokenTypes} from "./token-types";
import {Logger} from "./utils";

export class Tokenizer {
    file: TextFile;
    cursor: Cursor;
    tempTokenTypes: TokenType[] = [];
    tokenTypes: TokenType[];
    logger: Logger;

    constructor() {
        this.logger = new Logger();
        TokenTypes.init();
        this.tokenTypes = TokenTypes.all.toArray();
    }

    next() {
        //console.log("tokenizer next "+this.cursor.pos.line);
        let tt = this.tempTokenTypes.first(tokenType => {
            let count = tokenType.tryTokenize(this);
            return count > 0;
        });
        if (tt != null) {
            this.tempTokenTypes.remove(tt);
            return;
        }
        tt = this.tokenTypes.first(tokenType => {
            let count = tokenType.tryTokenize(this);
            return count > 0;
        });
        if (tt.name == "unknown")
            this.logger.warn(["unknown tokentype detected"]);
        if (tt == null)
            throw new Error();
    }
    init() {
        this.tokens = [];
        this.cursor = new Cursor(this.file.startPos);
    }
    process() {
        this.init();
        let cursor = this.cursor;
        while (!this.isEof()) {
            this.next();
        }
    }
    private resolve: Function;
    private reject: Function;
    private lastStatusTime: number;
    cancel() {
        this.isCancelled = true;
    }
    private isCancelled: boolean;
    onStatus() {
    }
    processAsync(): Promise<any> {
        this.init();
        return new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
            this.lastStatusTime = Date.now();
            this.continueProcessAsync();
        });
    }
    private continueProcessAsync() {
        let timeout = 15;
        let continued = Date.now();
        while (!this.isEof() && !this.isCancelled) {
            this.next();
            let now = Date.now();
            if (now - continued > timeout)
                break;
            if (now - this.lastStatusTime > 1000) {
                this.lastStatusTime = now;
                this.onStatus();
            }
        }
        if (this.isEof()) {
            let resolve = this.resolve;
            this.resolve = null;
            this.lastStatusTime = null;
            resolve();
        }
        else if (this.isCancelled) {
            this.reject();
        }
        else {
            window.setTimeout(() => this.continueProcessAsync(), 0);
        }
    }

    isEof(): boolean {
        return this.cursor.index >= this.file.text.length;
    }

    tokens: Token[];

}


