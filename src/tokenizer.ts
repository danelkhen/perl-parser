﻿"use strict";

import {Token, File2, Cursor, TokenType} from "./token";
import {TokenTypes} from "./token-types";

export class Tokenizer {
    file: File2;
    cursor: Cursor;
    tempTokenTypes: TokenType[] = [];
    tokenTypes: TokenType[];
    constructor() {
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
        if (tt == null)
            throw new Error();
    }
    process() {
        this.tokens = [];
        this.cursor = new Cursor(this.file.startPos);
        let cursor = this.cursor;
        while (cursor.index < this.file.text.length) {
            this.next();
        }
    }
    private resolve: Function;
    private lastStatusTime: number;
    onStatus() {
    }
    processAsync(): Promise<any> {
        this.tokens = [];
        this.cursor = new Cursor(this.file.startPos);
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.lastStatusTime = Date.now();
            this.continueProcessAsync();
        });
    }
    private continueProcessAsync() {
        let timeout = 15;
        let continued = Date.now(); //performance.now();
        while (!this.isEof()) {
            this.next();
            let now = Date.now(); //performance.now();
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
        else {
            window.setTimeout(() => this.continueProcessAsync(), 0);
        }
    }

    isEof(): boolean {
        return this.cursor.index >= this.file.text.length;
    }

    tokens: Token[];

}


