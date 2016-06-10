"use strict";

//TODO: ? var oop = require("../lib/oop");
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
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, safeTry, TokenReader, Logger, AstNodeFixator, TextFile, TextFilePos, TextFileRange, Cursor,
    ExpressionTester, EtReport, EtItem, RefArrayToRefUtil,
    EntityResolver, Package, Subroutine, Global
} from "perl-parser";
import * as util from "ace/autocomplete/util";



export class Mode extends TextMode {
    constructor() {
        super();
        this.HighlightRules = PerlHighlightRules;
        this.$highlightRules = this.HighlightRules;
        this.$highlightRules.$keywordList = TokenTypes.builtinFunctions.concat(TokenTypes.pragmas);
        this.$outdent = new MatchingBraceOutdent();
        this.foldingRules = new CStyleFoldMode({ start: "^=(begin|item)\\b", end: "^=(cut)\\b" });
        this.completer = new PerlCompleter(this);
        this.tokenizer = new MyTokenizer(this);
        this.tokenizer.init();

        //https://github.com/ajaxorg/ace/wiki/Default-Keyboard-Shortcuts
    }
    HighlightRules: PerlHighlightRules;
    $outdent: MatchingBraceOutdent;
    foldingRules: CStyleFoldMode;
    completer: PerlCompleter;
    getCompletionPrefix(editor: Editor, base: Function) {
        return this.completer.getCompletionPrefix(editor, base);
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

    tokenizer: MyTokenizer;
    getTokenizer(): any {
        return this.tokenizer;
    }
    $id: string;
}
Mode.prototype.$id = "ace/mode/perl";


//TODO:? oop.inherits(Mode, TextMode);


export class MyTokenizer {
    constructor(public mode: Mode) { }
    session: IEditSession;
    tokenizer: Tokenizer;
    lines: string[] = [];
    init() {
        if (this.mode != null) {
            let handler = () => {
                //this.mode.sessionChanged.remove(handler); //session is set immediatly after creating the tokenizer
                this.attachToSession(this.mode.session);
            };
            this.mode.sessionChanged.add(handler);
            this.attachToSession(this.mode.session);
            return;
        }
        this.reset();
    }
    attachToSession(session) {
        this.session = session;
        if (this.session != null) {
            this.session.on("change", e => {
                this.lines = this.session.getDocument().getAllLines().toArray();
                this.reset();
            });
            this.lines = this.session.getDocument().getAllLines().toArray();
        }
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
        let startFromTokenIndex = 0;
        if (tok.cursor.pos.line < lineNumber)
            startFromTokenIndex = tok.tokens.length;
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
        for (let i = startFromTokenIndex; i < tok.tokens.length; i++) {
            let token = tok.tokens[i];
            let startRow = token.range.start.line - 1;
            let endRow = token.range.end.line - 1;
            if (startRow > row)
                break;
            if (endRow < row)
                continue;
            if (startRow == row && endRow == row) {
                relevantTokens.push(token);
                continue;
            }
            let lines = token.value.lines();
            let newValue = lines[row - startRow];
            if (newValue != "") {
                let token2: TokenEx = token.type.create2(newValue);
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

    toTokenInfo(token: Token): TokenInfoEx {
        let type = token.type.name;
        if (token.isAnyIdentifier(TokenTypes.builtinFunctions))
            type = "keyword";
        else if (token.isAnyIdentifier(TokenTypes.pragmas))
            type = "keyword";
        else if (token.is(TokenTypes.braceOpen))
            type = "paren.lparen";
        else if (token.is(TokenTypes.braceClose))
            type = "paren.rparen";
        return { value: token.value, type: type, ppToken: token };
    }

}

export interface TokenInfoEx extends TokenInfo {
    ppToken?: Token;
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
    isPartialToken?: boolean;
}
export class PerlCompleter implements Completer {
    constructor(public mode: Mode) { }
    prefix: string;
    identifierRegexps: RegExp[] = [/[a-zA-Z0-9_\:]/];
    parse() {
        this.tokens = this.mode.tokenizer.tokenizer.tokens;
        let parser = new Parser();
        parser.logger = new Logger();
        parser.reader = new TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = this.tokens;
        parser.init();

        let statements = parser.parse();
        let unit = new Unit();
        unit.statements = statements;
        this.unit = unit;
        new AstNodeFixator().process(this.unit);
        this.unitPackage = EntityResolver.process(this.unit)[0];
        console.log({ unit, package: this.unitPackage });
        //console.log({ package: this.unitPackage });
        //this.global = new Global();
        //this.global.packages.push(this.unitPackage);
    }
    tokens: Token[];
    unit: Unit;
    unitPackage: Package;
    getCompletions(editor: Editor, session: IEditSession, pos: Position, prefix: string, callback: (err, res: Completion[]) => void): void {
        console.log("perl getCompletions");
        let pkgName = this.getCompletionPrefix(editor);

        this.parse();
        console.log("getCompletions", { pos, prefix, pkgName });
        let list = this.createCompletions(pkgName, this.unitPackage.uses.map(t => t.name));
        //let list: Completion[] = this.unitPackage.uses.map(t => <Completion>{ caption: t.name, type: null, meta: "package", snippet: null, docHTML: "docHTML", value: t.name });
        callback(null, list);
    }
    createCompletions(prefix: string, options: string[]): Completion[] {
        return options.map(t => <Completion>{ caption: t, type: null, meta: "package", snippet: null, docHTML: "docHTML", value: t });
        //if (prefix == null)
        //    prefix = "";
        //return options.filter(t => t.startsWith(prefix)).map(t => <Completion>{ caption: t, type: null, meta: "package", snippet: null, docHTML: "docHTML", value: t.substr(prefix.length) });
    }
    //original alternative method = getCompletionPrefix2
    getCompletionPrefix(editor?: Editor, base?: Function) {
        let pos = editor.getCursorPosition();
        let ti = new TokenIterator(editor.session, pos.row, pos.column);
        let tokens: TokenInfoEx[] = [];
        while (ti.getCurrentTokenRow() == pos.row) {
            let token = ti.getCurrentToken();
            if (token == null)
                break;
            tokens.push(token);
            ti.stepBackward();
        }
        if (tokens.length == 0)
            return "";
        let pkgName: string = null;
        if (tokens.take(2).first(t => t.ppToken.is(TokenTypes.packageSeparator)) != null) {
            let packageTokens = tokens.takeWhile(t => t.ppToken.isAny([TokenTypes.packageSeparator, TokenTypes.identifier]));
            pkgName = packageTokens.reversed().map(t => t.value).join("");
            return pkgName;
            //this.prefix = pkgName;
        }
        return "";
    }

    //from ace code, fixed to use underlying completer
    getCompletionPrefix2(editor?: Editor) {
        var pos = editor.getCursorPosition();
        var line = editor.session.getLine(pos.row);
        var prefix;
        //editor.completers.forEach(function (completer) {
        let completer = this;
        if (completer.identifierRegexps) {
            completer.identifierRegexps.forEach(identifierRegex => {
                if (!prefix && identifierRegex)
                    prefix = util.retrievePrecedingIdentifier(line, pos.column, identifierRegex);
            });
        }
        //}.bind(this));
        return prefix || util.retrievePrecedingIdentifier(line, pos.column);
    }

    //getDocTooltip(item: Completion): void{
    //    }
}

hackAutoCompletePrefix();
function hackAutoCompletePrefix() {
    let getCompletionPrefix_base = util.getCompletionPrefix;
    util.getCompletionPrefix = function (editor: Editor) {
        let mode: any = editor.session.getMode();
        if (mode.getCompletionPrefix)
            return mode.getCompletionPrefix(editor, getCompletionPrefix_base);
        return getCompletionPrefix_base.apply(this, arguments);
    }
}
