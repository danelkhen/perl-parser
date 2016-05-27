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
import {Range} from "ace/range";
import {TokenInfo} from "ace/token_info";
import {Position} from "ace/position";
import "ace/ext/linking";

export class P5AceEditor implements P5Editor {
    init() {
        this.editor = ace.edit("editor");
        this.editor.session.setMode("ace/mode/perl");
        this.editor.setTheme("ace/theme/vs");
        this.editor.setOptions({
            enableLinking: true,
        });
        this.editor.focus();
        //this.editor.addEventListener("linkHover", e => console.log("linkHover", e));
        this.editor.addEventListener("linkClick", e => {
            let token: TokenInfo = e.token;
            let pos: Position = e.position;
            let pos2 = new TextFilePos();
            pos2.line = pos.row + 1;
            pos2.column = pos.column + 1;
            let link = this.links.first(link => link.tokens != null && link.tokens.first(t => t.range.containsPos(pos2)) != null);
            //if (link == null)
            //    return;
            console.log("linkClick", e);
        });
    }

    links: CodeHyperlink[] = [];

    editor: Editor;
    addMarker(marker: Marker) {
        this.editor.session.addMarker(this.toRange(marker.range), marker.className, marker.type, marker.inFront);
        if (marker.annotation != null) {
            if (marker.annotation.pos == null)
                marker.annotation.pos = marker.range.start;
            this.addAnnotation(marker.annotation);
        }
    }
    addAnnotation(ann: Annotation) {
        let atts = this.editor.session.getAnnotations();
        atts.push({ column: ann.pos.column - 1, row: ann.pos.line - 1, text: ann.text, type: ann.type || "info" });
        this.editor.session.setAnnotations(atts);
    }
    toRange(range: TextFileRange): Range {
        return new Range(range.start.line - 1, range.start.column - 1, range.end.line - 1, range.end.column - 1);
    }
    hyperlinkNode(opts: CodeHyperlink): HTMLAnchorElement {
        console.warn("TODO:  hyperlinkNode");
        this.links.add(opts);
        //if (opts.tokens == null)
        //    return;
        //console.log("adding code hyperlink", opts);
        //console.log(this.editor.session.getAnnotations());

        //this.editor.session.setAnnotations([{ column: 2, row: 4, text: "ggg", type: "error" }]);
        //this.editor.session.addMarker(new Range(0, 0, 0, 10), "ccc", "ddd", true);
        return null;
    }
    scrollToLine(line: number) { 
        this.editor.scrollToLine(line-1, null, false, null);
    }
    tokens: Token[];
    sourceFile: TextFile;
    codeHyperlinks: CodeHyperlink[];
    unit: Unit;
    collapsables: Collapsable[];
    collapsable(node: AstNode, tokens?: Token[]) { }

    get code(): string {
        return this.editor.getValue();
    }
    set code(value: string) {
        this.editor.setValue(value, -1);
        //this.editor.moveCursorTo(0, 0, false);
    }

    parse() {
        let parser = new Parser();
        parser.logger = new Logger();
        parser.reader = new TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = this.tokens;
        parser.init();

        var statements = parser.parse();
        let unit = new Unit();
        unit.statements = statements;
        this.unit = unit;
        console.log(unit);
        new AstNodeFixator().process(this.unit);
    }
    tokenizeAsync(filename: string, data: string): Promise<any> {
        this.code = data;
        let start = new Date();
        this.sourceFile = new TextFile(filename, data);
        let tok = new Tokenizer();
        tok.onStatus = () => console.log("Tokenizer status: ", Helper.toPct(tok.cursor.index / tok.file.text.length));
        tok.file = this.sourceFile;
        return tok.processAsync().then(() => {
            let end = new Date();
            console.log("tokenization took " + (end.valueOf() - start.valueOf()) + "ms");
            this.tokens = tok.tokens;
        });
    }
    setGitBlameItems(items: GitBlameItem[]) {
    }
    notifyPossibleChanges() {
    }
}

export interface Annotation {
    pos?: TextFilePos;
    text: string;
    type?: string;
}

export interface Marker {
    annotation: Annotation;
    range: TextFileRange;
    className: string;
    type?: string;
    inFront?: boolean;
}
