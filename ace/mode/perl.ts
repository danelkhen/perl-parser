"use strict";

//TODO: ? var oop = require("../lib/oop");
import {Mode as TextMode} from "./text";
import {PerlHighlightRules} from "./perl_highlight_rules";
import {MatchingBraceOutdent} from "./matching_brace_outdent";
import {Range} from "../range";
import {FoldMode as CStyleFoldMode} from "./folding/cstyle";
import {Token} from "../../src/token";
import {Tokenizer} from "../../src/tokenizer";
import {TextFile} from "../../src/text";
import "../../src/extensions";

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

    session: AceAjax.IEditSession;

    attachToSession(session: AceAjax.IEditSession) {
        if (this.session == session)
            return;
        this.session = session;
        this.sessionChanged.emit();
    }
    sessionChanged = new EventEmitter();

    getTokenizer() {
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
    session: AceAjax.IEditSession;
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
        this.lines = this.session.getDocument().getAllLines().toArray();
        this.reset();
    }

    reset() {
        console.log("resetting tokenizer");
        this.tokenizer = new Tokenizer();
        this.tokenizer.file = new TextFile("unknown.pm", this.lines.join("\n"));
        this.tokenizer.init();
    }

    getLineTokens(line: string, state: string, row?: number): AceAjax.TokenizerResult {
        let lineNumber = row + 1;
        if (this.lines[row] != line) {
            this.lines[row] = line;
            this.reset(); //TODO: optimize - clear only the tokens from this line forward, rewind to the proper pos, and continue from there.
        }

        let tok = this.tokenizer;
        while (!tok.isEof() && tok.cursor.pos.line <= lineNumber) {
            //console.log("MyTok", "tokenizer.next", tok.cursor.pos.line, tok.cursor.pos.column);
            tok.next();
        }
        let relevantTokens = [];
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
            if (newValue != "")
                relevantTokens.push({ type: token.type, value: newValue, isPartialToken: true });
        }
        let newState = "no_tokens";
        if (relevantTokens.length > 0) {
            let lastToken = relevantTokens.last();
            newState = lastToken.type.name;
            if (relevantTokens.first(t => t.type == "heredoc") != null)
                newState = "heredoc";
            if (lastToken.isPartialToken)
                newState += "_partial";
        }

        let tokens: AceAjax.TokenInfo[] = relevantTokens.map(t => this.toTokenInfo(t));//.filter(t => t != null)
        let res: AceAjax.TokenizerResult = { tokens, state: newState };//
        console.log({ line_num: row + 1, line, state: state + " -> " + newState });
        //console.log("getLineTokens", { line_num: row + 1, line, stateName, state, tokens });
        return res;
    }

    toTokenInfo(token: Token): AceAjax.TokenInfo {
        return { value: token.value, type: token.type.name };
    }

}

class EventEmitter {
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