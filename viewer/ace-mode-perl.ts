//define(function (require, exports, module) {
//    "use strict";

//    var oop = require("../lib/oop");
//    var TextMode = require("./text").Mode;
//    var PerlHighlightRules = require("./perl_highlight_rules").PerlHighlightRules;
//    var MatchingBraceOutdent = require("./matching_brace_outdent").MatchingBraceOutdent;
//    var Range = require("../range").Range;
//    var CStyleFoldMode = require("./folding/cstyle").FoldMode;

//    var Mode = function () {
//        this.HighlightRules = PerlHighlightRules;

//        this.$outdent = new MatchingBraceOutdent();
//        this.foldingRules = new CStyleFoldMode({ start: "^=(begin|item)\\b", end: "^=(cut)\\b" });
//    };
//    oop.inherits(Mode, TextMode);

//    (function () {

//        this.lineCommentStart = "#";
//        this.blockComment = [
//            { start: "=begin", end: "=cut", lineStartOnly: true },
//            { start: "=item", end: "=cut", lineStartOnly: true }
//        ];


//        this.getNextLineIndent = function (state, line, tab) {
//            var indent = this.$getIndent(line);

//            var tokenizedLine = this.getTokenizer().getLineTokens(line, state);
//            var tokens = tokenizedLine.tokens;

//            if (tokens.length && tokens[tokens.length - 1].type == "comment") {
//                return indent;
//            }

//            if (state == "start") {
//                var match = line.match(/^.*[\{\(\[\:]\s*$/);
//                if (match) {
//                    indent += tab;
//                }
//            }

//            return indent;
//        };

//        this.checkOutdent = function (state, line, input) {
//            return this.$outdent.checkOutdent(line, input);
//        };

//        this.autoOutdent = function (state, doc, row) {
//            this.$outdent.autoOutdent(doc, row);
//        };
//        let _this = this;

//        this._tokenizer = {
//            getLineTokens: function (line, state, row) {
//                if (state == null || typeof (state) == "string")
//                    state = {};
//                if (state.lines == null) {
//                    if (_this._session != null) {
//                        console.log("using session doc", _this._session.doc);
//                        state.lines = _this._session.getDocument().getAllLines().toArray();
//                    }
//                    else {
//                        state.lines = [];
//                    }
//                }
//                //let tok = state.tokenizer;
//                //if (tok == null)
//                let tok = new Tokenizer();

//                state.lines[row] = line;
//                tok.file = new TextFile("unknown.pm", state.lines.join("\n"));
//                tok.process();
//                let relevantTokens = [];
//                for(let token of tok.tokens) {
//                    let startRow = token.range.start.line - 1;
//                    let endRow = token.range.end.line - 1;
//                    if (startRow > row)
//                        continue;
//                    if (endRow < row)
//                        continue;
//                    if (startRow == row && endRow == row) {
//                        relevantTokens.push(token);
//                        continue;
//                    }
//                    let lines = token.value.lines();
//                    let newValue = lines[row - startRow];
//                //if (newValue != "")
//                    relevantTokens.push({ type: token.type, value: newValue, isPartialToken: true });
//                }
//                let resetState = false;
//                if (relevantTokens.length > 0 && relevantTokens.last().isPartialToken)
//                    resetState = true;
//                //let filteredTokens = state.tokenizer.tokens.filter(t=> row >= t.range.start.line && row <= t.range.end.line);
//                //tokens.forEach(token=> {
//                //    if (token.value.contains("\n")) {
//                //        token.value = token.value.lines()[0];
//                //    }
//                //});
//                let stateName = "no_tokens";
//                if (relevantTokens.length > 0) {
//                    let lastToken = relevantTokens.last();
//                    stateName = lastToken.type.name;
//                    if (relevantTokens.first(t=>t.type == "heredoc") != null)
//                        stateName = "heredoc";
//                    if (lastToken.isPartialToken)
//                        stateName += "_partial";
//                }
                
//                let tokens = relevantTokens.filter(t=>t!=null).map(t=>({ value: t.value, type: t.type.name }));
//                //tokens.removeAll(t=>t == "");

//                let res = { stateName, tokens, state: { lines: state.lines, toString: function () { return stateName; } } };//
//                //console.log("getLineTokens", { line_num: row + 1, line, stateName, state, tokens });
//                return res;
//            }
//        };

//        this.attachToSession = function (session) {
//            _this._session = session;
//            console.log("attachToSession", session);
//        }

//        this.getTokenizer = function () {
//            return _this._tokenizer;
//        }

//        this.$id = "ace/mode/perl";
//    }).call(Mode.prototype);

//    exports.Mode = Mode;
//});



