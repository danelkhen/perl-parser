"use strict";

//TODO: ? var oop = require("../lib/oop");
import {Mode as TextMode} from "./text";
import {PerlHighlightRules} from "./perl_highlight_rules";
import {MatchingBraceOutdent} from "./matching_brace_outdent";
import {Range} from "../range";
import {FoldMode as CStyleFoldMode} from "./folding/cstyle";
import {Tokenizer} from "../../src/tokenizer";
import {TextFile} from "../../src/text";


export class Mode extends TextMode {
    constructor() {
        super();
        this.HighlightRules = PerlHighlightRules;
        this.$outdent = new MatchingBraceOutdent();
        this.foldingRules = new CStyleFoldMode({ start: "^=(begin|item)\\b", end: "^=(cut)\\b" });
        this._tokenizer = new MyTokenizer();
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

    _tokenizer: MyTokenizer;
    _session: AceAjax.IEditSession;

    attachToSession(session) {
        this._session = session;
        this._tokenizer._session = session;
        console.log("attachToSession", session);
    }

    getTokenizer() {
        return this._tokenizer;
    }
    $id:string;

    //$id = "ace/mode/perl";
}
Mode.prototype.$id = "ace/mode/perl";


//TODO:? oop.inherits(Mode, TextMode);


class MyTokenizer {
    _session: AceAjax.IEditSession;
    getLineTokens(line, state, row?) {
        if (state == null || typeof (state) == "string")
            state = {};
        if (state.lines == null) {
            if (this._session != null) {
                console.log("using session doc", this._session.doc);
                state.lines = this._session.getDocument().getAllLines().toArray();
            }
            else {
                state.lines = [];
            }
        }
        //let tok = state.tokenizer;
        //if (tok == null)
        let tok = new Tokenizer();

        state.lines[row] = line;
        tok.file = new TextFile("unknown.pm", state.lines.join("\n"));
        tok.process();
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
            //if (newValue != "")
            relevantTokens.push({ type: token.type, value: newValue, isPartialToken: true });
        }
        let resetState = false;
        if (relevantTokens.length > 0 && relevantTokens.last().isPartialToken)
            resetState = true;
        //let filteredTokens = state.tokenizer.tokens.filter(t=> row >= t.range.start.line && row <= t.range.end.line);
        //tokens.forEach(token=> {
        //    if (token.value.contains("\n")) {
        //        token.value = token.value.lines()[0];
        //    }
        //});
        let stateName = "no_tokens";
        if (relevantTokens.length > 0) {
            let lastToken = relevantTokens.last();
            stateName = lastToken.type.name;
            if (relevantTokens.first(t => t.type == "heredoc") != null)
                stateName = "heredoc";
            if (lastToken.isPartialToken)
                stateName += "_partial";
        }

        let tokens = relevantTokens.filter(t => t != null).map(t => ({ value: t.value, type: t.type.name }));
        //tokens.removeAll(t=>t == "");

        let res = { stateName, tokens, state: { lines: state.lines, toString: function () { return stateName; } } };//
        //console.log("getLineTokens", { line_num: row + 1, line, stateName, state, tokens });
        return res;
    }

}