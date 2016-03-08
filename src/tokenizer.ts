/// <reference path="../typings/browser.d.ts" />
"use strict";

class Tokenizer {
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
    main() {
        this.tokens = [];
        this.cursor = new Cursor(this.file.startPos);
        let cursor = this.cursor;
        while (cursor.index < this.file.text.length) {
            this.next();
        }
    }

    tokens: Token[];

}


