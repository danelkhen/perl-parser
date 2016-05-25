"use strict"
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
    ExpressionTester, EtReport, EtItem, RefArrayToRefUtil
} from "perl-parser";
import {PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper} from "./common";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {Key, Rect, Size, Point} from "./common";
import {Editor as Viewer, Collapsable, P5Editor, CvLine, IndexSelection, TokenUtils, CodeHyperlink} from "./editor";
import {EditorConsoleBinder} from "./editor-console-binder";
//import * as config from "ace/config";
import * as ace from "ace/ace";
import * as ModeList from "ace/ext/modelist";
import {Editor} from "ace/editor";

export class P5AceEditor implements P5Editor {
    init() {
        this.editor = ace.edit("editor");
        this.editor.session.setMode("ace/mode/perl");
        this.editor.setTheme("ace/theme/vs");
    }
    editor:Editor;
    hyperlinkNode(opts: CodeHyperlink): HTMLAnchorElement {
        return null;
    }
    scrollToLine(line: number) { }
    tokens: Token[];
    sourceFile: TextFile;
    codeHyperlinks: CodeHyperlink[];
    unit: Unit;
    collapsables: Collapsable[];
    collapsable(node: AstNode, tokens?: Token[]) { }
    get code(): string { return this.editor.getValue(); }
    set code(value: string) { this.editor.setValue(value); }
    parse() { }
    tokenizeAsync(filename: string, data: string): Promise<any> {
        return null;
    }
    setGitBlameItems(items: GitBlameItem[]) {
    }
    notifyPossibleChanges() {
    }
}
