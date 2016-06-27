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
    EntityResolver, Package, Subroutine, Global, PackageRef, Entity,
} from "perl-parser";
import * as util from "ace/autocomplete/util";
import {PerlTokenizer, TokenInfoEx} from "./perl-tokenizer";
import {Mode} from "./perl";
import {Helper} from "../../common";
import {AceHelper, EntityInfo, PerlFile} from "../../perl-file";
import {PerlEditSession} from "../../p5-ace-editor";

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
            unit.allTokens = this.tokens;
            this.unit = unit;
            new AstNodeFixator().process(this.unit);
            let packages = EntityResolver.process(this.unit);
            this.unitPackage = packages.last(); //use strict/warnings outside package scope causes the first package to be the wrong one
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
        let perlFile = (<PerlEditSession>session).perlFile;

        console.log("perl getCompletions");
        let pkgName = this.getCompletionPrefix(editor);
        this.parse();
        if (this.unitPackage == null) {
            callback("error", null);
            return;
        }
        console.log("getCompletions", { pos, prefix, pkgName });
        let list: EntityInfo[] = [];
        list.addRange(this.unitPackage.uses.map(t => <EntityInfo> { name:t.name, docHtml:this.getDocHtml("package", t.name), type:"package" }));
        list.addRange(this.unitPackage.members.map(t => <EntityInfo> { name:t.name, docText:t.documentation, type:"subroutine" }));

        let list2: Completion[] = list.map(t=> <Completion>{ caption: t.name, type: null, meta: t.type, snippet: null, docHTML: AceHelper.createPopupHtml(t), value: t.name, score: 0 });
        list2.orderBy(t => t.caption);
        callback(null, list2);
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
