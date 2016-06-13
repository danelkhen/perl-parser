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
import {PerlTokenizer, TokenInfoEx} from "./perl-tokenizer";
import {Mode} from "./perl";


export class PerlCompleter implements Completer {
    constructor(public mode: Mode) { }
    prefix: string;
    identifierRegexps: RegExp[] = [/[a-zA-Z0-9_\:]/];
    parse() {
        try {
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
        }
        catch (e) {
            console.warn("parsing failed", e);
        }
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
        if (this.unitPackage == null) {
            callback("error", null);
            return;
        }
        console.log("getCompletions", { pos, prefix, pkgName });
        let list = this.createCompletions(pkgName, this.unitPackage.uses.map(t => t.name));
        //let list: Completion[] = this.unitPackage.uses.map(t => <Completion>{ caption: t.name, type: null, meta: "package", snippet: null, docHTML: "docHTML", value: t.name });
        callback(null, list);
    }
    createCompletions(prefix: string, options: string[]): Completion[] {
        return options.map(t => <Completion>{ caption: t, type: null, meta: "package", snippet: null, docHTML: this.getDocHtml("package", t), value: t });
        //if (prefix == null)
        //    prefix = "";
        //return options.filter(t => t.startsWith(prefix)).map(t => <Completion>{ caption: t, type: null, meta: "package", snippet: null, docHTML: "docHTML", value: t.substr(prefix.length) });
    }
    getDocHtml(type: string, name: string): string {
        return PerlCompleter.getDocHtml(type, name);
    }
    static getDocHtml(type: string, name: string): string {
        return null;
    }
    //original alternative method = getCompletionPrefix2
    getCompletionPrefix2(editor?: Editor, base?: Function) {
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
    getCompletionPrefix(editor?: Editor) {
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
