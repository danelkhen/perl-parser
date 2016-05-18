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
import {Editor, Watchable, CvLine, Collapsable, CodeHyperlink, EditorPos} from "./editor";

export class EditorDomBinder {
    el: HTMLElement;
    editor: Editor;
    scrollEl: HTMLElement;
    lineHeight = 15;
    fontWidth = 7.19;
    lineNumbersEl: HTMLElement;
    lineTemplate: HTMLElement;
    caretEl: HTMLElement;
    codeContainerEl: HTMLElement;
    codeEl: HTMLElement;
    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();
    renderCaretPosAndFirstVisibleLineTimer: Timer;

    //scrollEndTimer: Timer;

    _firstVisibleLineNumber;
    init() {
        this.scrollEl = $(".code-view")[0];
        this.lineNumbersEl = $(".lines")[0];
        this.caretEl = $(".caret")[0];
        this.codeEl = $(".code")[0];
        this.codeContainerEl = $(".code-container")[0];

        this.renderCaretPosAndFirstVisibleLineTimer = new Timer(() => this.renderCaretPosAndFirstVisibleLine());
        //this.scrollEndTimer = new Timer(() => this.scrollEl_scrollEnd());
        this.updateVisibleLineCount();

        $(window).resize(e => this.updateVisibleLineCount());
        $(this.scrollEl).scroll(e => this.editor.firstVisibleVisualLineNumber = null);//{ console.log("scroll"); this.scrollEndTimer.set(100); });

        Watchable.from(this.editor).prop(t => t.code, e => $(this.codeEl).text(e.value));
        Watchable.from(this.editor).prop(t => t.tokens, e => this.renderTokens());
        Watchable.from(this.editor).redfineProp(t => t.firstVisibleVisualLineNumber, {
            get: () => {
                if (this._firstVisibleLineNumber == null)
                    this._firstVisibleLineNumber = this.calcFirstVisibleLineNumber();
                return this._firstVisibleLineNumber;
            },
            set: value => {
                this._firstVisibleLineNumber = value;
                if (value == null)
                    return;
                this.renderCaretPosAndFirstVisibleLineTimer.set(0);
            }
        });

        Watchable.from(this.editor.caretVisualPos).props(t => [t.line, t.column], e => this.renderCaretPosAndFirstVisibleLineTimer.set(0));
        Watchable.from(this.editor.collapsables).method(t => t.push, e => this.collapsable(e.args[0]));
        Watchable.from(this.editor.codeHyperlinks).method(t => t.push, e => this.hyperlinkNode(e.args[0]));

        this.caretEl.focus();

        $(window).keydown(e => this.window_keydown(e));
        $(this.codeContainerEl).mousedown(e => this.scrollEl_mousedown(e));

        this.renderCaretPos();
    }
    //scrollEl_scrollEnd() {
    //    this.editor.firstVisibleLineNumber = this.calcFirstVisibleLineNumber();
    //}

    notifyPossibleChanges() {
        this.updateVisibleLineCount();
    }

    updateVisibleLineCount() {
        let lines = this.calcVisibleLineCount();
        let lines2 = this.editor.visibleLineCount;
        if (lines == lines2)
            return;
        console.log("updateVisibleLineCount", lines2, " -> ", lines);
        this.editor.visibleLineCount = lines;
    }
    renderCaretPosAndFirstVisibleLine() {
        this.renderCaretPos();
        this.setFirstVisibleLineNumber(this.editor.firstVisibleVisualLineNumber);
    }
    collapsable(collapsable: Collapsable) {
        let tokens = collapsable.tokens;
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
                Array.generateNumbers(lineStart + 1, lineEnd).forEach(line => this.editor.getLine(line).visible = !collapsed);
            },
            isCollapsed: () => span.hasClass("collapsed"),
        }

        Watchable.from(collapsable).prop(t => t.isCollapsed, e => exp.toggle(e.obj.isCollapsed));
        btnExpander.dataItem(exp);
        btnExpander.mousedown(e => {
            e.preventDefault();
            collapsable.isCollapsed = !collapsable.isCollapsed;
        });
    }


    renderTokens() {
        let codeEl = $(".code")[0];
        codeEl.innerHTML = "";
        this.editor.lines.clear();
        if (this.editor.tokens == null || this.editor.tokens.length == 0)
            return;
        //this.splitNewLineTokens();

        let line = new CvLine();
        line.tokens = [];
        this.editor.lines.add(line);
        this.editor.tokens.forEach(token => {
            line.tokens.push(token);
            let lineCount = token.range.end.line - token.range.start.line;
            for (let i = 0; i < lineCount; i++) {
                line = new CvLine();
                line.tokens = [token];
                this.editor.lines.add(line);
            }
        });
        this.editor.tokens.forEach(token => {
            let span = document.createElement("span");
            span.className = token.type.name;
            span.textContent = token.value;
            codeEl.appendChild(span);
            this.tokenToElement.set(token, span);
        });
        this.renderLineNumbers();
        this.editor.lines.forEach(line => {
            Watchable.from(line).prop(t => t.visible, e => {
                if (line.lineNumberEl == null)
                    return;
                $(line.lineNumberEl).toggleClass("collapsed", !e.obj.visible);
            });
        });
    }

    getLineEl(line: number): HTMLElement {
        return <HTMLElement>this.lineNumbersEl.childNodes.item(line - 1);
    }

    private calcFirstVisibleLineNumber(): number {
        let y = Math.ceil(this.scrollEl.scrollTop / this.lineHeight) + 1;
        return y;
    }
    private setFirstVisibleLineNumber(line: number) {
        let pos = this.visualToLogicalPos({column:1, line});
        let el = this.getLineEl(pos.line);
        if (el == null)
            return;
        this.scrollEl.scrollTop = el.offsetTop;
    }
    private calcVisibleLineCount(): number {
        let clientHeight = this.scrollEl.clientHeight;
        if (clientHeight == 0)
            return 10;
        let lines = Math.floor(this.scrollEl.clientHeight / this.lineHeight) - 1;
        if (lines < 0)
            return 10;
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


    elToOffsetRect(el: HTMLElement): Rect {
        return new Rect(this.elToOffsetPoint(el), new Size(el.offsetWidth, el.offsetHeight));
    }
    elToOffsetPoint(el: HTMLElement): Point {
        return new Point(el.offsetLeft, el.offsetTop);
    }

    screenToVisualPos(p: Point): Point {
        return p.div(this.projectionRatio).floor().add(new Point(1, 1));
    }
    visualPosToScreen(p: Point): Point {
        return p.subtract(new Point(1, 1)).mul(this.projectionRatio);
    }
    projectionRatio: Point = new Point(this.fontWidth, this.lineHeight);

    renderCaretPos() {
        if (this.editor.caretVisualPos.line > this.editor.lines.length)
            this.editor.caretVisualPos.line = this.editor.lines.length;
        else if (this.editor.caretVisualPos.line < 1)
            this.editor.caretVisualPos.line = 1;
        if (this.editor.caretVisualPos.column < 1)
            this.editor.caretVisualPos.column = 1;
        $(this.caretEl).css({ left: (this.editor.caretVisualPos.column - 1) * this.fontWidth, top: (this.editor.caretVisualPos.line - 1) * this.lineHeight });
        //console.log(this.editor.logicalCaretPos);
    }

    renderLineNumbers() {
        if (this.lineTemplate == null)
            this.lineTemplate = $(".line").first().remove()[0];

        $(this.lineNumbersEl).empty()[0];
        this.editor.lines.forEach((line, i) => {
            let div = $(this.lineTemplate).clone();
            let lineNumber = i + 1;
            div.find(".line-number").text(lineNumber.toString()).attr({ name: "L" + lineNumber, href: "javascript:void(0)" });
            line.lineNumberEl = div[0];
            this.lineNumbersEl.appendChild(div[0]);
        });
    }


    visualToLogicalPos(p: EditorPos): EditorPos {
        let visibles = 0;
        let logicalLine = 1;
        let visualLine = p.line;

        this.editor.lines.some((t, i) => {
            if (t.visible) {
                visibles++;
                logicalLine = i + 1;
            }
            return visibles == visualLine;
        });
        return { column: p.column, line: logicalLine };
    }
    scrollEl_mousedown(e: JQueryMouseEventObject) {
        if (e.isDefaultPrevented())
            return;
        let pos = this.screenToVisualPos(new Point(e.offsetX, e.offsetY));
        //let pos2 = this.visualToLogicalPos(pos);
        this.editor.caretVisualPos.line = pos.y;
        this.editor.caretVisualPos.column = pos.x;
        //this.renderCaretPos();
    }
    window_keydown(e: JQueryKeyEventObject) {
        let keyName = this.editor.getKeyName(e);
        if (keyName == null)
            return;
        let handler = this.editor.keyBindings[keyName];
        if (handler != null) {
            e.preventDefault();
            handler(e);
        }
    }


    wrap(wrapper: HTMLElement, els: HTMLElement[]) {
        $(els[0]).before(wrapper);
        $(wrapper).append(els);
    }

    hyperlinkNode(opts: CodeHyperlink): HTMLAnchorElement {
        if (opts.tokens == null && opts.node != null)
            opts.tokens = this.editor.collectTokens2(opts.node);
        let tokens = opts.tokens;
        let href = opts.href;
        let css = opts.css;
        let title = opts.title;
        let name = opts.name;
        if (href == null)
            href = "javascript:void(0)";
        let els = tokens.select(token => this.tokenToElement.get(token));
        let a = $(els).closest("a");
        opts.anchorEl = <HTMLAnchorElement>a[0];
        if (a.length > 0) {
            console.warn("already hyperlinked");
            return <HTMLAnchorElement>a[0];
        }
        a = $(els[0]).closest("a");
        opts.anchorEl = <HTMLAnchorElement>a[0];
        if (a.length > 0) {
            console.warn("already hyperlinked 2");
            return <HTMLAnchorElement>a[0];
        }
        //console.log("hyperlinkNode", els);
        a = $.create("a").insertBefore(els[0]);
        opts.anchorEl = <HTMLAnchorElement>a[0];
        if (title != null)
            a.attr("title", title);
        if (css != null)
            a.addClass(css);
        a.append(els);
        a.attr({ "data-href": href, name });
        if (opts.node != null)
            $(a).data("AstNode", opts.node);
        a.mouseover(e => $(a).toggleClass("ctrl", e.ctrlKey)); //TODO: apply generically on top element
        a.mouseout(e => $(a).toggleClass("ctrl", e.ctrlKey));

        a.click(e => {
            if (!e.ctrlKey)
                return;
            e.preventDefault();
            window.open(a.attr("data-href"));
        });

        return <HTMLAnchorElement>a[0];
    }


}
