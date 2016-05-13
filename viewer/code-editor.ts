/// <reference path="../src/extensions.ts" />
"use strict";

import {
    Token, TokenType, File2, File2Pos,
    AstWriter, ParserBase, ExpressionParser, Parser,
    AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
    BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
    ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
    NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
    Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
    ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, safeTry, TokenReader, Logger, AstNodeFixator,
} from "../src/index";
import {PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper} from "./common";
import "../src/extensions";
import {RefArrayToRefUtil} from "../src/refactor";
import {ExpressionTester, EtReport, EtItem} from "../src/expression-tester";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {Key, Rect, Size, Point} from "./common";
import {EditorDomBinder} from "./editor-dom-binder";

export class CodeEditor {
    code: string;
    firstTime: boolean = true;
    lines: CvLine[];
    isAllCollapsed: boolean;
    unit: Unit;
    tokens: Token[];
    caretPos: File2Pos;
    sourceFile: File2;
    binder: EditorDomBinder;


    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();


    init() {
        this.lines = [];
        this.initKeyBindings();
        if (this.binder == null) {
            this.binder = new EditorDomBinder();
            this.binder.editor = this;
        }
        this.binder.init();
    }

    getLine(line: number): CvLine {
        return this.lines[line - 1];
    }


    parse(filename: string, data: string) {
        //if (localStorage.getItem("pause") == "1" && this.firstTime) {
        //    console.warn("not running parse, last time crashed unexpectedly");
        //    this.firstTime = false;
        //    return;
        //}
        this.firstTime = false;
        this.code = data;
        let codeEl = $(".code").empty().text(data);
        $(".ta-code").val(data);
        this.sourceFile = new File2(filename, data);
        let tok = new Tokenizer();
        tok.file = this.sourceFile;
        localStorage.setItem("pause", "1");
        tok.main();
        let parser = new Parser();
        parser.logger = new Logger();
        parser.reader = new TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = tok.tokens;
        parser.init();

        this.tokens = tok.tokens;
        this.renderTokens();

        var statements = parser.parse();
        let unit = new Unit();
        unit.statements = statements;
        this.unit = unit;
        console.log(unit);
        new AstNodeFixator().process(this.unit);
    }

    initCaret() {
        this.caretPos = new File2Pos();
        this.caretPos.column = 1;
        this.caretPos.line = 1;
        this.caretPos.index = 0;
        this.binder.initCaret();

    }

    keyBindings: { [key: string]: (e: JQueryKeyEventObject) => void };
    initKeyBindings() {
        let bindings: KeyBinding[] = [
            { key: Key.RIGHT, handler: e => this.caretNextChar() },
            { key: Key.LEFT, handler: e => this.caretPrevChar() },
            { key: Key.UP, handler: e => this.caretPrevLine() },
            { key: Key.DOWN, handler: e => this.caretNextLine() },

            { key: Key.PAGE_DOWN, handler: e => this.caretNextPage() },
            { key: Key.PAGE_UP, handler: e => this.caretPrevPage() },

            { key: Key.HOME, handler: e => this.caretLineStart() },
            { key: Key.END, handler: e => this.caretLineEnd() },

            { key: [Key.CONTROL, Key.RIGHT], handler: e => this.caretNextWord() },
            { key: [Key.CONTROL, Key.HOME], handler: e => this.caretDocStart() },
            { key: [Key.CONTROL, Key.END], handler: e => this.caretDocEnd() },

            { key: [Key.CONTROL, Key.A], handler: e => this.caretSelectAll() },
        ];
        this.keyBindings = {};

        bindings.forEach(binding => {
            let name = this.getKeyName2(binding.key);
            this.keyBindings[name] = binding.handler;
        });
    }

    getKeyName2(key: Key | Key[]): string {
        if (key instanceof Array) {
            let keys = <Key[]>key;
            let keys2 = keys.toArray();
            keys2.sort();
            let names = keys2.select(t => this.getKeyName2(t));
            return names.join("_");
        }
        return Key[<number>key];
    }

    getKeyName(e: { keyCode: number, shiftKey: boolean, altKey: boolean, ctrlKey: boolean }): string {
        let keyName = Key[e.keyCode];
        if (keyName == null)
            return null;
        let key: Key[] = [e.keyCode];
        keyName = keyName.toLowerCase();
        if (e.shiftKey)
            key.push(Key.SHIFT);
        if (e.altKey)
            key.push(Key.ALT);
        if (e.ctrlKey)
            key.push(Key.CONTROL);
        key.sort();
        return this.getKeyName2(key);
    }
    caretNextChar() {
        this.caretPos.column++;
        this.binder.renderCaretPos();
    }
    caretNextWord() {
        let line = this.getCurrentLineText().substr(this.caretPos.column - 1);
        console.log(line);
        let res = /(\s+)(\S)/.exec(line);
        console.log(res);
        if (res != null) {
            let index = res.index + res[1].length;
            console.log(index);
            this.caretPos.column += index;
        }
        else {
            //TODO: next line
        }
        this.binder.renderCaretPos();
    }
    caretPrevChar() {
        this.caretPos.column--;
        if (this.caretPos.column < 1)
            this.caretPos.column = 1;
        this.binder.renderCaretPos();
    }
    caretPrevLine() {
        this.caretPos.line--;
        if (this.caretPos.line < 1)
            this.caretPos.line = 1;
        this.binder.renderCaretPos();
    }
    caretNextLine() {
        this.caretPos.line++;
        this.binder.renderCaretPos();
    }
    caretPrevPage() {
        let firstLine = this.getFirstVisibleLineNumber();
        let line = this.caretPos.line;
        let lineCount = this.getVisibleLineCount();
        let offset = line - firstLine;
        let newLine = line - lineCount;
        if (newLine < 1)
            newLine = 1;
        this.caretPos.line = newLine;
        if (offset <= lineCount)
            this.setFirstVisibleLineNumber(newLine - offset);
        this.binder.renderCaretPos();
    }
    caretNextPage() {
        let firstLine = this.getFirstVisibleLineNumber();
        let line = this.caretPos.line;
        let lineCount = this.getVisibleLineCount();
        let offset = line - firstLine;
        let newLine = line + lineCount;
        if (newLine > this.lines.length)
            newLine = this.lines.length;
        this.caretPos.line = newLine;
        if (offset <= lineCount)
            this.setFirstVisibleLineNumber(newLine - offset);
        this.binder.renderCaretPos();
    }
    caretLineStart() {
        let text = this.getCurrentLineText();
        let res = /\S/.exec(text);
        if (res != null && res.index + 1 != this.caretPos.column)
            this.caretPos.column = res.index + 1;
        else
            this.caretPos.column = 1;
        this.binder.renderCaretPos();
    }
    caretLineEnd() {
        let text = this.getCurrentLineText();
        this.caretPos.column = text.length + 1;
        this.binder.renderCaretPos();
    }
    caretDocStart() {
        this.caretPos.line = 1;
        this.binder.renderCaretPos();
    }
    caretDocEnd() {
        let text = this.getCurrentLineText();
        this.caretPos.line = this.lines.length;
        this.binder.renderCaretPos();
    }
    caretSelectAll() {
        let range = document.createRange();
        range.selectNode($(".code")[0]);
        let sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    getCurrentLineText(): string {
        return this.sourceFile.getLineText(this.caretPos.line);
    }

    render() {
        $(".code").empty().text(this.code);
        this.renderTokens();
    }

    renderTokens() {
        let codeEl = $(".code")[0];
        codeEl.innerHTML = "";
        this.lines.clear();
        if (this.tokens == null || this.tokens.length == 0)
            return;
        //this.splitNewLineTokens();

        let line = new CvLine();
        line.tokens = [];
        this.lines.add(line);
        this.tokens.forEach(token => {
            line.tokens.push(token);
            let lineCount = token.range.end.line - token.range.start.line;
            for (let i = 0; i < lineCount; i++) {
                line = new CvLine();
                line.tokens = [token];
                this.lines.add(line);
            }
        });
        this.tokens.forEach(token => {
            let span = document.createElement("span");
            span.className = token.type.name;
            span.textContent = token.value;
            codeEl.appendChild(span);
            this.tokenToElement.set(token, span);
        });
        this.binder.renderLineNumbers();

    }

    expandOrCollapseAll() {
        this.isAllCollapsed = !this.isAllCollapsed;
        this.getExpanders().forEach(t => t.toggle(this.isAllCollapsed));
    }
    wrap(wrapper: HTMLElement, els: HTMLElement[]) {
        $(els[0]).before(wrapper);
        $(wrapper).append(els);
    }

    collapsable(tokens: Token[]) {
        while (tokens.last().is(TokenTypes.whitespace, "\n"))
            tokens.removeLast();
        let lineStart = tokens[0].range.start.line;
        let lineEnd = tokens.last().range.end.line;
        let range = tokens.select(t => this.tokenToElement.get(t)).exceptNulls();
        let span = $.create("span.collapsable");
        this.wrap(span[0], range);
        let lineStartEl = $(this.binder.getLineEl(lineStart));
        let lineEndEl = $(this.binder.getLineEl(lineEnd));

        let btnExpander = lineStartEl.getAppend(".expander-container").getAppend("button.expander.expanded");
        let exp: Expander = {
            toggle: (collapsed?: boolean) => {
                if (collapsed == null)
                    collapsed = !exp.isCollapsed();
                span.toggleClass("collapsed", collapsed);
                btnExpander.toggleClass("collapsed", collapsed);
                Array.generateNumbers(lineStart + 1, lineEnd).forEach(line => $(this.binder.getLineEl(line)).toggleClass("collapsed", collapsed)); //TODO: inner collapsing (subs within subs will not work correctly)
            },
            isCollapsed: () => span.hasClass("collapsed"),
        }

        btnExpander.dataItem(exp);
        btnExpander.mousedown(e => exp.toggle());
        //toggle();
    }

    getExpanders(): Expander[] {
        return $(".expander").toArray$().select(t => t.dataItem());
    }


    scrollToLine(line: number) {
        let el = this.binder.getLineEl(line);
        this.binder.scrollToElement(el);
    }


    getLastVisibleLineNumber(): number {
        return this.getFirstVisibleLineNumber() + this.getVisibleLineCount();
    }
    setLastVisibleLineNumber(line: number) {
        this.setFirstVisibleLineNumber(line - this.getVisibleLineCount());
    }

    scrollToPosIfNeeded(p: File2Pos) {
        let firstLine = this.getFirstVisibleLineNumber();
        let lastLine = this.getLastVisibleLineNumber();
        let line = p.line;
        if (line < firstLine)
            this.setFirstVisibleLineNumber(p.line);
        else if (line > lastLine) {
            this.setLastVisibleLineNumber(p.line);
        }
        else {
        }
    }


    hyperlinkNode(node: AstNode, opts?: HyperlinkCodeOptions): HTMLAnchorElement {
        let tokens = this.collectTokens2(node);
        let a = this.hyperlinkTokens(tokens, opts);
        $(a).data("AstNode", node);
        return a;
    }
    hyperlinkTokens(tokens: Token[], opts?: HyperlinkCodeOptions): HTMLAnchorElement {
        if (opts == null)
            opts = {};
        let href = opts.href;
        let css = opts.css;
        let title = opts.title;
        let name = opts.name;
        if (href == null)
            href = "javascript:void(0)";
        let els = tokens.select(token => this.tokenToElement.get(token));
        let a = $(els).closest("a");
        if (a.length > 0) {
            console.warn("already hyperlinked");
            return <HTMLAnchorElement>a[0];
        }
        a = $(els[0]).closest("a");
        if (a.length > 0) {
            console.warn("already hyperlinked 2");
            return <HTMLAnchorElement>a[0];
        }
        //console.log("hyperlinkNode", els);
        a = $.create("a").insertBefore(els[0]);
        if (title != null)
            a.attr("title", title);
        if (css != null)
            a.addClass(css);
        a.append(els);
        a.attr({ href, name });
        return <HTMLAnchorElement>a[0];
    }


    highlightNode(node: AstNode) {
        let tokens = this.collectTokens2(node);
        tokens.forEach(token => {
            let el = this.tokenToElement.get(token);
            el.classList.add("highlight");
        });
    }

    collectTokens2(obj: any): Token[] {
        let list = TokenUtils.collectTokens(obj);
        if (list.length <= 1)
            return list;
        let list2 = this.getTokenRange(list.first(), list.last());
        return list2;
    }

    getTokenRange(from: Token, until: Token) {
        let start = this.tokens.indexOf(from);
        let end = this.tokens.indexOf(until);
        if (start < 0 || end < 0)
            return null;
        return this.tokens.slice(start, end + 1);
    }


    getFirstVisibleLineNumber(): number { return this.binder.getFirstVisibleLineNumber(); }
    setFirstVisibleLineNumber(line: number) { return this.binder.setFirstVisibleLineNumber(line); }
    getVisibleLineCount(): number { return this.binder.getVisibleLineCount(); }

}




export interface HyperlinkCodeOptions {
    href?: string;
    name?: string;
    title?: string;
    css?: string;
}


export class CvLine {
    lineNumberEl: HTMLElement;
    tokens: Token[];
}


export class IndexSelection {
    ranges: IndexRange[] = [];
    get lastRange(): IndexRange {
        return this.ranges.last();
    }
    get lastAnchor(): number {
        let range = this.lastRange;
        if (range == null)
            return null;
        return range.from;
    }
    fromParam(s: string) {
        if (s == null || s.length == 0)
            return;
        if (!/^L[1-9]+/.test(s))
            return;
        let tokens = s.split(',');
        this.ranges.clear();
        tokens.forEach(token => {
            let subTokens = token.split("-");
            if (subTokens.length == 1) {
                let x = parseInt(subTokens[0].substr(1));
                this.ranges.add(new IndexRange(x));
            }
            else {
                let x = parseInt(subTokens[0].substr(1));
                let y = parseInt(subTokens[1].substr(1));
                this.ranges.add(new IndexRange(x, y));
            }
        });
    }
    toParam(): string {
        try {
            return this.getCompactRanges().select(t => this.rangeToParam(t)).join(",");
        }
        catch (e) {
            console.error(e);
            return "";
        }
    }
    rangeToParam(range: IndexRange): string {
        if (range.from == range.to)
            return `L${range.from}`;
        return `L${range.from}-L${range.to}`;
    }


    toCompact(): IndexSelection {
        let sel = new IndexSelection();
        sel.ranges = this.getCompactRanges();
        return sel;
    }
    getCompactRanges(): IndexRange[] {
        let ranges: IndexRange[] = [];
        let list = this.getSelectedIndexes();
        let range: IndexRange;
        list.forEach(t => {
            if (range == null) {
                range = new IndexRange(t);
                ranges.add(range);
            }
            else if (range.to == t - 1) {
                range.to++;
            }
            else {
                range = new IndexRange(t);
                ranges.add(range);
            }
        });
        return ranges;
    }

    normalize() {
        let anchor = this.lastAnchor;
        let list = [];
        this.getSelectedIndexes().forEach(t => {
            if (t == anchor)
                return;
            list.add(new IndexRange(t));
        });
        list.add(new IndexRange(anchor));
        this.ranges = list;
    }
    generateNumbers = function (from: number, to: number) {
        let min = Math.min(from, to);
        let max = Math.max(from, to);
        return Number.generate(min, max, 1);
    };

    getSelectedIndexes(): number[] {
        let list = this.ranges.selectMany(t => this.generateNumbers(t.from, t.to));
        let res = list.distinct().orderBy(t => t);
        return res;
    }
    click(index: number, ctrl: boolean, shift: boolean) {
        if (this.lastRange == null) {
            this.ranges.add(new IndexRange(index));
        }
        else if (ctrl && !shift) {
            this.normalize();
            let index2 = this.ranges.findIndex(t => t.from == index);
            if (index2 == null || index2 < 0) {
                this.ranges.add(new IndexRange(index));
            }
            else {
                this.ranges.removeAt(index2);
            }
        }
        else if (!ctrl && !shift) {
            this.ranges.clear();
            this.ranges.add(new IndexRange(index));
        }
        else if (!ctrl && shift) {
            let last = this.lastRange;
            this.ranges.clear();
            last.to = index;
            this.ranges.add(last);
        }
        else if (ctrl && shift) {
            let last = this.lastRange;
            last.to = index;
        }
        else
            console.error("Not Implemented", { index, ctrl, shift });
    }

}

export class IndexRange {
    constructor(from?: number, to?: number) {
        if (from == null)
            return;
        if (to == null)
            to = from;
        this.from = from;
        this.to = to;
    }
    from: number;
    to: number;
    contains(x: number): boolean {
        let min = Math.min(this.from, this.to);
        let max = Math.max(this.from, this.to);
        return x >= min && x <= max;
    }
}



export class TokenUtils {
    static collectTokens(obj: any): Token[] {
        let tokens: Token[] = [];
        this._collectTokens(obj, tokens);
        return tokens;
    }
    static _collectTokens(obj: any, tokens: Token[]) {
        if (obj instanceof Token) {
            tokens.add(obj);
        }
        else if (obj instanceof Array) {
            obj.forEach(t => this._collectTokens(t, tokens));
        }
        else if (obj instanceof AstNode) {
            let writer = new AstWriter();
            writer.main();
            let func = writer.map.get(obj.constructor);
            if (func == null) {
                console.warn("no ast writer handler for node", obj);
                return;
            }
            let res = func(obj);
            this._collectTokens(res, tokens);
        }
    }
}

export interface KeyBinding {
    key: Key | Key[];
    handler: (e: JQueryKeyEventObject) => void;
}