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

export class CodeEditor {
    code: string;
    firstTime: boolean = true;
    lines: CvLine[];
    isAllCollapsed: boolean;
    unit: Unit;
    tokens: Token[];
    caretPos: File2Pos;
    sourceFile: File2;


    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();
    scrollEl: HTMLElement = document.body;
    lineNumbersEl: HTMLElement;
    lineTemplate: JQuery;
    caretEl: HTMLElement;

    lineHeight = 15;
    fontWidth = 7.19;

    init() {
        this.lines = [];
        this.scrollEl = $(".code-view")[0];
        this.lineNumbersEl = $(".lines")[0];
        this.initKeyBindings();
    }

    getLineEl(line: number): HTMLElement {
        return <HTMLElement>this.lineNumbersEl.childNodes.item(line - 1);
    }
    getLine(line: number): CvLine {
        return this.lines[line - 1];
    }
    renderLineNumbers() {
        if (this.lineTemplate == null)
            this.lineTemplate = $(".line").first().remove();

        $(this.lineNumbersEl).empty()[0];
        this.lines.forEach((line, i) => {
            let div = this.lineTemplate.clone();
            let lineNumber = i + 1;
            div.find(".line-number").text(lineNumber.toString()).attr({ name: "L" + lineNumber, href: "javascript:void(0)" });
            this.lineNumbersEl.appendChild(div[0]);
        });
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
        this.caretEl = $(".caret")[0];
        this.caretEl.focus();
        this.caretPos = new File2Pos();
        this.caretPos.column = 1;
        this.caretPos.line = 1;
        this.caretPos.index = 0;
        $(window).keydown(e => {
            this.window_keydown(e);
        });
        $(this.scrollEl).mousedown(e => this.scrollEl_mousedown(e));
        this.renderCaretPos();
    }
    renderCaretPos() {
        if (this.caretPos.line > this.lines.length)
            this.caretPos.line = this.lines.length;
        else if (this.caretPos.line < 1)
            this.caretPos.line = 1;
        if (this.caretPos.column < 1)
            this.caretPos.column = 1;
        $(this.caretEl).css({ left: (this.caretPos.column - 1) * this.fontWidth, top: (this.caretPos.line - 1) * this.lineHeight });
        this.scrollToPosIfNeeded(this.caretPos);
    }
    scrollEl_mousedown(e: JQueryMouseEventObject) {
        let pos = this.screenToPos(new Point(e.offsetX, e.offsetY));
        this.caretPos.line = pos.y;
        this.caretPos.column = pos.x;
        this.renderCaretPos();
    }
    window_keydown(e: JQueryKeyEventObject) {
        let keyName = this.getKeyName(e);
        if (keyName == null)
            return;
        let handler = this.keyBindings[keyName];
        if (handler != null) {
            e.preventDefault();
            handler(e);
        }
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
        this.renderCaretPos();
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
        this.renderCaretPos();
    }
    caretPrevChar() {
        this.caretPos.column--;
        if (this.caretPos.column < 1)
            this.caretPos.column = 1;
        this.renderCaretPos();
    }
    caretPrevLine() {
        this.caretPos.line--;
        if (this.caretPos.line < 1)
            this.caretPos.line = 1;
        this.renderCaretPos();
    }
    caretNextLine() {
        this.caretPos.line++;
        this.renderCaretPos();
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
        this.renderCaretPos();
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
        this.renderCaretPos();
    }
    caretLineStart() {
        let text = this.getCurrentLineText();
        let res = /\S/.exec(text);
        if (res != null && res.index + 1 != this.caretPos.column)
            this.caretPos.column = res.index + 1;
        else
            this.caretPos.column = 1;
        this.renderCaretPos();
    }
    caretLineEnd() {
        let text = this.getCurrentLineText();
        this.caretPos.column = text.length + 1;
        this.renderCaretPos();
    }
    caretDocStart() {
        this.caretPos.line = 1;
        this.renderCaretPos();
    }
    caretDocEnd() {
        let text = this.getCurrentLineText();
        this.caretPos.line = this.lines.length;
        this.renderCaretPos();
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
        this.renderLineNumbers();

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
        let lineStartEl = $(this.getLineEl(lineStart));
        let lineEndEl = $(this.getLineEl(lineEnd));

        let btnExpander = lineStartEl.getAppend(".expander-container").getAppend("button.expander.expanded");
        let exp: Expander = {
            toggle: (collapsed?: boolean) => {
                if (collapsed == null)
                    collapsed = !exp.isCollapsed();
                span.toggleClass("collapsed", collapsed);
                btnExpander.toggleClass("collapsed", collapsed);
                Array.generateNumbers(lineStart + 1, lineEnd).forEach(line => $(this.getLineEl(line)).toggleClass("collapsed", collapsed)); //TODO: inner collapsing (subs within subs will not work correctly)
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
        let el = this.getLineEl(line);
        this.scrollToElement(el);
    }

    elToOffsetRect(el: HTMLElement): Rect {
        return new Rect(this.elToOffsetPoint(el), new Size(el.offsetWidth, el.offsetHeight));
    }
    elToOffsetPoint(el: HTMLElement): Point {
        return new Point(el.offsetLeft, el.offsetTop);
    }

    screenToPos(p: Point): Point {
        return p.div(this.projectionRatio).floor().add(new Point(1, 1));
    }
    posToScreen(p: Point): Point {
        return p.subtract(new Point(1, 1)).mul(this.projectionRatio);
    }
    projectionRatio: Point = new Point(this.fontWidth, this.lineHeight);

    getFirstVisibleLineNumber(): number {
        let y = Math.ceil(this.scrollEl.scrollTop / this.lineHeight) + 1;
        return y;
    }
    getLastVisibleLineNumber(): number {
        return this.getFirstVisibleLineNumber() + this.getVisibleLineCount();
    }
    setFirstVisibleLineNumber(line: number) {
        let el = this.getLineEl(line);
        if (el == null)
            return;
        this.scrollEl.scrollTop = el.offsetTop;
    }
    setLastVisibleLineNumber(line: number) {
        this.setFirstVisibleLineNumber(line - this.getVisibleLineCount());
    }
    getVisibleLineCount(): number {
        let lines = Math.floor(this.scrollEl.clientHeight / this.lineHeight) - 1;
        return lines;
    }

    scrollToElement(el: HTMLElement) {
        let point = this.elToOffsetPoint(el);
        let rect = this.elToOffsetRect(this.scrollEl);

        let diff = this.smallestOffsetNeededToInclude(this.scrollEl.scrollTop, this.scrollEl.offsetHeight, el.offsetTop + el.offsetHeight);
        if (diff != 0) {
            console.log(diff);
            let scrollTop = this.scrollEl.scrollTop + diff;
            if (scrollTop < 0)
                scrollTop = 0;
            this.scrollEl.scrollTop = scrollTop;
        }
        //console.log("scrollToElement", point, rect);
        //if (point.isInside(rect)) {
        //    console.log("isInside");
        //    return;
        //}
        //let diff = point.subtract(rect.topLeft);
        //let diff2 = point.subtract(rect.bottomLeft);
        //console.log("diff", diff, diff2);
        //// let diff = rect.distanceTo(point);
        //this.scrollEl.scrollLeft += diff2.x;
        //this.scrollEl.scrollTop += diff2.y;


        //        this.scrollEl.scrollTop = el.offsetTop;// - this.lineHeight;//pos.top;// - this.scrollOffset.top;
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

    smallestOffsetNeededToInclude(from: number, to: number, index: number) {
        let length = to - from;
        let diff = index - from;
        if (diff > 0) {
            if (diff > length)
                diff -= length;
            else
                return 0;
        }
        return diff;
    }

    hyperlinkNode(node: AstNode, href: string, name?: string, title?: string, css?: string): HTMLAnchorElement {
        let tokens = this.collectTokens2(node);
        let a = this.hyperlinkTokens(tokens, href, name, title, css);
        $(a).data("AstNode", node);
        return a;
    }
    hyperlinkTokens(tokens: Token[], href: string, name?: string, title?: string, css?: string): HTMLAnchorElement {
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