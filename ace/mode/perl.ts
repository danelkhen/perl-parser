"use strict";

//TODO: ? var oop = require("../lib/oop");
import {Mode as TextMode} from "ace/mode/text";
import {PerlHighlightRules} from "./perl_highlight_rules";
import {MatchingBraceOutdent} from "./matching_brace_outdent";
import {Range} from "ace/range";
import {FoldMode as CStyleFoldMode} from "./folding/cstyle";
import {Token} from "perl-parser";
import {Tokenizer} from "perl-parser";
import {TextFile} from "perl-parser";
import {IEditSession} from "ace/edit_session";
import {TokenizerResult} from "ace/tokenizer";
import {TokenInfo} from "ace/token_info";
import {TokenTypes} from "perl-parser/token-types";

export class Mode extends TextMode {
    constructor() {
        super();
        this.HighlightRules = PerlHighlightRules;
        this.$outdent = new MatchingBraceOutdent();
        this.foldingRules = new CStyleFoldMode({ start: "^=(begin|item)\\b", end: "^=(cut)\\b" });
    }
    HighlightRules: PerlHighlightRules;
    $outdent: MatchingBraceOutdent;
    foldingRules: CStyleFoldMode;

    lineCommentStart = "#";
    blockComment = [
        { start: "=begin", end: "=cut", lineStartOnly: true },
        { start: "=item", end: "=cut", lineStartOnly: true }
    ];


    getNextLineIndent(state, line, tab) {
        var indent = this.$getIndent(line);

        var tokenizedLine = this.getTokenizer().getLineTokens(line, state);
        var tokens = tokenizedLine.tokens;

        if (tokens.length && tokens[tokens.length - 1].type == "comment") {
            return indent;
        }

        if (state == "start") {
            var match = line.match(/^.*[\{\(\[\:]\s*$/);
            if (match) {
                indent += tab;
            }
        }

        return indent;
    };

    checkOutdent(state, line, input) {
        return this.$outdent.checkOutdent(line, input);
    };

    autoOutdent(state, doc, row) {
        this.$outdent.autoOutdent(doc, row);
    };

    session: IEditSession;

    attachToSession(session: IEditSession) {
        if (this.session == session)
            return;
        this.session = session;
        this.sessionChanged.emit();
    }
    sessionChanged = new EventEmitter();

    getTokenizer(): any {
        let x = new MyTokenizer();
        x.mode = this;
        x.init();
        return x;
    }
    $id: string;
}
Mode.prototype.$id = "ace/mode/perl";


//TODO:? oop.inherits(Mode, TextMode);


class MyTokenizer {
    session: IEditSession;
    tokenizer: Tokenizer;
    mode: Mode;
    lines: string[] = [];
    init() {
        if (this.mode != null) {
            let handler = () => {
                this.mode.sessionChanged.remove(handler); //session is set immediatly after creating the tokenizer
                this.attachToSession(this.mode.session);
            };
            this.mode.sessionChanged.add(handler);
        }
    }
    attachToSession(session) {
        this.session = session;
        this.session.on("change", e => {
            this.lines = this.session.getDocument().getAllLines().toArray();
            this.reset();
        });
        this.lines = this.session.getDocument().getAllLines().toArray();
        this.reset();
    }

    reset() {
        console.log("resetting tokenizer");
        this.tokenizer = new Tokenizer();
        this.tokenizer.file = new TextFile("unknown.pm", this.lines.join("\n"));
        this.tokenizer.init();
    }

    getLineTokens(line: string, state: string, row?: number): TokenizerResult {
        let lineNumber = row + 1;
        if (this.lines[row] != line) {
            console.log({ lineNumber, prev: this.lines[row], now: line });
            this.lines[row] = line;
            this.reset(); //TODO: optimize - clear only the tokens from this line forward, rewind to the proper pos, and continue from there.
        }

        let tok = this.tokenizer;
        try {
            while (!tok.isEof() && tok.cursor.pos.line <= lineNumber) {
                //console.log("MyTok", "tokenizer.next", tok.cursor.pos.line, tok.cursor.pos.column);
                tok.next();
            }
        }
        catch (e) {
            if (tok.cursor.pos.line <= lineNumber)
                return { state: "error", tokens: [] };
        }
        let relevantTokens: TokenEx[] = [];
        for (let token of tok.tokens) {
            let startRow = token.range.start.line - 1;
            let endRow = token.range.end.line - 1;
            if (startRow > row)
                continue;
            if (endRow < row)
                continue;
            if (startRow == row && endRow == row) {
                relevantTokens.push(token);
                continue;
            }
            let lines = token.value.lines();
            let newValue = lines[row - startRow];
            if (newValue != "") {
                let token2:TokenEx = token.type.create2(newValue);
                token2.isPartialToken = true;
                relevantTokens.push(token2);
            }
        }
        let newState = "no_tokens";
        if (relevantTokens.length > 0) {
            let lastToken = relevantTokens.last();
            newState = lastToken.type.name;
            if (relevantTokens.first(t => t.type.name == "heredoc") != null)
                newState = "heredoc";
            if (lastToken.isPartialToken)
                newState += "_partial";
        }

        let tokens: TokenInfo[] = relevantTokens.map(t => this.toTokenInfo(t));//.filter(t => t != null)
        let res: TokenizerResult = { tokens, state: newState };//
        //console.log({ line_num: row + 1, line, fromState: state, toState: newState, stateChanged: state != newState });
        //console.log("getLineTokens", { line_num: row + 1, line, stateName, state, tokens });
        return res;
    }

    toTokenInfo(token: Token): TokenInfo {
        let type = token.type.name;
        if (token.isAnyIdentifier(TokenTypes.builtinFunctions))
            type = "keyword";
        else if (token.isAnyIdentifier(TokenTypes.pragmas))
            type = "keyword";
        return { value: token.value, type: type };
    }

}

export class EventEmitter {
    handlers = [];
    emit() {
        this.handlers.forEach(handler => handler());
    }
    add(handler) {
        this.handlers.push(handler);
    }
    remove(handler) {
        this.handlers.remove(handler);
    }
}

export interface TokenEx extends Token {
    isPartialToken?:boolean;
}