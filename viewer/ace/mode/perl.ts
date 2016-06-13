"use strict";

import {Mode as TextMode}           from "ace/mode/text";
import {PerlHighlightRules}         from "ace/mode/perl_highlight_rules";
import {MatchingBraceOutdent}       from "ace/mode/matching_brace_outdent";
import {FoldMode as CStyleFoldMode} from "ace/mode/folding/cstyle";
import {Range} from "ace/range";
import {IEditSession} from "ace/edit_session";
import {TokenizerResult} from "ace/tokenizer";
import {TokenInfo} from "ace/token_info";
import {Completer, Completion} from "ace/ext/language_tools";
import {Position} from "ace/position";
import {Editor} from "ace/editor";
import {TokenIterator} from "ace/token_iterator";
import {
    Token, TokenType,
    AstWriter, ParserBase, ExpressionParser, Parser,
    AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
    BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
    ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
    NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
    Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
    ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, TokenReader, Logger, AstNodeFixator, TextFile, TextFilePos, TextFileRange, Cursor,
    ExpressionTester, EtReport, EtItem, RefArrayToRefUtil,
    EntityResolver, Package, Subroutine, Global
} from "perl-parser";
import * as util from "ace/autocomplete/util";
import {PerlTokenizer} from "./perl-tokenizer";
import {PerlCompleter} from "./perl-completer";



export class Mode extends TextMode {
    constructor() {
        super();
        this.HighlightRules = PerlHighlightRules;
        this.$highlightRules = this.HighlightRules;
        this.$highlightRules.$keywordList = TokenTypes.builtinFunctions.concat(TokenTypes.pragmas);
        this.$outdent = new MatchingBraceOutdent();
        this.foldingRules = new CStyleFoldMode({ start: "^=(begin|item)\\b", end: "^=(cut)\\b" });
        this.completer = new PerlCompleter(this);
        this.tokenizer = new PerlTokenizer(this);
        this.tokenizer.init();

        //https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts
    }
    HighlightRules: PerlHighlightRules;
    $outdent: MatchingBraceOutdent;
    foldingRules: CStyleFoldMode;
    completer: PerlCompleter;
    getCompletionPrefix(editor: Editor, base: Function) {
        return this.completer.getCompletionPrefix(editor);//, base);
    }

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

    tokenizer: PerlTokenizer;
    getTokenizer(): any {
        return this.tokenizer;
    }
    $id: string;
}
Mode.prototype.$id = "viewer/ace/mode/perl";

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
