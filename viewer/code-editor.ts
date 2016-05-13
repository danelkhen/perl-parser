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
import {CvLine, IndexSelection, PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper} from "./common";
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

    constructor() {
        this.lines = [];
        this.scrollEl = $(".code-view")[0];
        this.lineNumbersEl = $(".lines")[0];
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
        let key = e.keyCode;
        let ch = String.fromCharCode(key);
        let alt = e.altKey;
        let shift = e.shiftKey;
        let ctrl = e.ctrlKey;

        if (key == Key.RIGHT && !ctrl) {
            e.preventDefault();
            this.caretPos.column++;
            this.renderCaretPos();
        }
        else if (key == Key.RIGHT && ctrl) {
            e.preventDefault();
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
        else if (key == Key.LEFT) {
            e.preventDefault();
            this.caretPos.column--;
            if (this.caretPos.column < 1)
                this.caretPos.column = 1;
            this.renderCaretPos();
        }
        else if (key == Key.UP) {
            e.preventDefault();
            this.caretPos.line--;
            if (this.caretPos.line < 1)
                this.caretPos.line = 1;
            this.renderCaretPos();
        }
        else if (key == Key.DOWN) {
            e.preventDefault();
            this.caretPos.line++;
            this.renderCaretPos();
        }
        else if (key == Key.PAGE_UP) {
            e.preventDefault();
            this.caretPos.line -= this.getVisibleLineCount();
            if (this.caretPos.line < 1)
                this.caretPos.line = 1;
            this.renderCaretPos();
        }
        else if (key == Key.PAGE_DOWN) {
            e.preventDefault();
            this.caretPos.line += this.getVisibleLineCount();
            this.renderCaretPos();
        }
        else if (key == Key.HOME && !ctrl) {
            e.preventDefault();
            let text = this.getCurrentLineText();
            let res = /\S/.exec(text);
            if (res != null && res.index + 1 != this.caretPos.column)
                this.caretPos.column = res.index + 1;
            else
                this.caretPos.column = 1;
            this.renderCaretPos();
        }
        else if (key == Key.END && !ctrl) {
            e.preventDefault();
            let text = this.getCurrentLineText();
            this.caretPos.column = text.length + 1;
            this.renderCaretPos();
        }
        else if (key == Key.HOME && ctrl) {
            e.preventDefault();
            this.caretPos.line = 1;
            this.renderCaretPos();
        }
        else if (key == Key.END && ctrl) {
            e.preventDefault();
            let text = this.getCurrentLineText();
            this.caretPos.line = this.lines.length;
            this.renderCaretPos();
        }
        else if (ch == "A" && ctrl) {
            e.preventDefault();
            let range = document.createRange();
            range.selectNode($(".code")[0]);
            let sel = getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

        }
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