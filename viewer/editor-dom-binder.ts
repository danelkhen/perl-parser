/// <reference path="../src/extensions.ts" />
"use strict";

import {
    Token, TokenType, 
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
    //renderCaretPosAndFirstVisibleLineTimer: Timer;
    debugEl: HTMLElement;

    //scrollEndTimer: Timer;

    _topVisualLine;
    init() {
        this.scrollEl = $(".code-view")[0];
        this.lineNumbersEl = $(".lines")[0];
        this.caretEl = $(".caret")[0];
        this.codeEl = $(".code")[0];
        this.codeContainerEl = $(".code-container")[0];
        this.debugEl = $(".debug")[0];

        //this.renderCaretPosAndFirstVisibleLineTimer = new Timer(() => this.renderCaretPosAndFirstVisibleLine());
        //this.scrollEndTimer = new Timer(() => this.scrollEl_scrollEnd());
        this.updateVisibleLineCount();

        $(window).resize(e => this.updateVisibleLineCount());
        $(this.scrollEl).scroll(e => this.editor.topVisualLine = null);//{ console.log("scroll"); this.scrollEndTimer.set(100); });

        Watchable.from(this.editor).prop(t => t.code, e => { $(this.codeEl).text(e.value); this.renderLineNumbers(); });
        Watchable.from(this.editor).prop(t => t.tokens, e => this.renderTokens());
        Watchable.from(this.editor).redfineProp(t => t.topVisualLine, {
            get: () => {
                if (this._topVisualLine == null)
                    this._topVisualLine = this.calcTopVisualLine();
                return this._topVisualLine;
            },
            set: value => {
                this._topVisualLine = value;
                if (value == null)
                    return;
                //this.renderCaretPosAndFirstVisibleLine();
                this.renderTopVisualLine();
                //this.renderCaretPosAndFirstVisibleLineTimer.set(0);
            }
        });

        Watchable.from(this.editor.caretVisualPos).props(t => [t.line, t.column], e => {
            this.renderCaretPos();
            //this.renderCaretPosAndFirstVisibleLine();
            //this.renderCaretPosAndFirstVisibleLineTimer.set(0); 
        });
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
        let lines2 = this.editor.visualLineCount;
        if (lines == lines2)
            return;
        console.log("updateVisibleLineCount", lines2, " -> ", lines);
        this.editor.visualLineCount = lines;
    }
    renderCaretPosAndFirstVisibleLine() {
        this.renderCaretPos();
    }
    renderTopVisualLine() {
        let pos = this.visualToLogicalPos({ column: 1, line: this.editor.topVisualLine });
        let el = this.getLineEl(pos.line);
        if (el == null)
            return;
        this.scrollEl.scrollTop = el.offsetTop;
    }
    collapsable(collapsable: Collapsable) {
        let tokens = collapsable.tokens;
        while (tokens.last().is(TokenTypes.whitespace, "\n"))
            tokens.removeLast();
        let lineStart = tokens[0].range.start.line;
        let lineEnd = tokens.last().range.end.line;
        //console.log("collapsable", { lines: lineStart + "-" + lineEnd, collapsable });
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
                for (let i = lineStart + 1; i <= lineEnd; i++) {
                    this.editor.getLine(i).visible = !collapsed
                }
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
        let codeEl = this.codeEl;
        codeEl.innerHTML = "";
        //this.editor.lines.clear();
        if (this.editor.tokens == null || this.editor.tokens.length == 0)
            return;
        //this.splitNewLineTokens();

        let lineIndex = 0;
        let line = this.editor.lines[lineIndex];//new CvLine();
        line.tokens = [];
        this.editor.lines.add(line);
        this.editor.tokens.forEach(token => {
            line.tokens.push(token);
            let lineCount = token.range.end.line - token.range.start.line;
            for (let i = 0; i < lineCount; i++) {
                lineIndex++;
                line = this.editor.lines[lineIndex];
                //line = new CvLine();
                line.tokens = [token];
                //this.editor.lines.add(line);
            }
        });
        this.editor.tokens.forEach(token => {
            let span = document.createElement("span");
            span.className = token.type.name;
            span.textContent = token.value;
            codeEl.appendChild(span);
            this.tokenToElement.set(token, span);
        });
        //this.renderLineNumbers();
        //this.editor.lines.forEach(line => {
        //    Watchable.from(line).prop(t => t.visible, e => {
        //        if (line.lineNumberEl == null)
        //            return;
        //        $(line.lineNumberEl).toggleClass("collapsed", !e.obj.visible);
        //    });
        //});
    }

    getLineEl(line: number): HTMLElement {
        let line2 = this.editor.lines[line - 1];
        if (line2 == null)
            return null;
        return line2.lineNumberEl;
    }

    private calcTopVisualLine(): number {
        let y = Math.ceil(this.scrollEl.scrollTop / this.lineHeight) + 1;
        return y;
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
        //if (this.editor.caretVisualPos.line > this.editor.lines.length)
        //    this.editor.caretVisualPos.line = this.editor.lines.length;
        //else if (this.editor.caretVisualPos.line < 1)
        //    this.editor.caretVisualPos.line = 1;
        //if (this.editor.caretVisualPos.column < 1)
        //    this.editor.caretVisualPos.column = 1;
        $(this.caretEl).css({ left: (this.editor.caretVisualPos.column - 1) * this.fontWidth, top: (this.editor.caretVisualPos.line - 1) * this.lineHeight });
        //console.log(this.editor.logicalCaretPos);
    }

    renderLineNumbers() {
        if (this.lineTemplate == null)
            this.lineTemplate = $(".line").first().remove()[0];
        let lines = this.editor.code.lines().select(t => new CvLine());
        this.editor.lines.clear();
        this.editor.lines.addRange(lines);

        $(this.lineNumbersEl).empty()[0];
        this.editor.lines.forEach((line, i) => {
            let div = $(this.lineTemplate).clone();
            let lineNumber = i + 1;
            div.find(".line-number").text(lineNumber.toString()).attr({ name: "L" + lineNumber, href: "javascript:void(0)" });
            line.lineNumberEl = div[0];
            this.lineNumbersEl.appendChild(div[0]);
        });
        this.editor.lines.forEach(line => {
            Watchable.from(line).prop(t => t.visible, e => {
                if (line.lineNumberEl == null)
                    return;
                $(line.lineNumberEl).toggleClass("collapsed", !e.obj.visible);
            });
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

    findFirstTextNode(node: Node): Text {
        if (node.nodeType == 3)
            return <Text>node;
        let ch = node.firstChild;
        while (ch != null) {
            let ch2 = this.findFirstTextNode(ch);
            if (ch2 != null)
                return ch2;
            ch = ch.nextSibling;
        }
        return null;
    }
    scrollEl_mousedown(e: JQueryMouseEventObject) {
        if (e.isDefaultPrevented())
            return;
        let pos = this.screenToVisualPos(new Point(e.offsetX, e.offsetY));
        this.editor.caretVisualPos.line = pos.y;
        this.editor.caretVisualPos.column = pos.x;
        //let token = this.editor.getCaretToken();
        //if (token == null)
        //    return;
        //let tokenEl = this.tokenToElement.get(token);
        //if (tokenEl == null)
        //    return;
        //let textNode = this.findFirstTextNode(tokenEl);
        //if (textNode == null)
        //    return;
        //let range = document.createRange();
        //console.log(tokenEl, tokenEl.textContent, tokenEl.textContent.length);
        //range.selectNode(textNode);
        //range.setStart(textNode, 0);
        //range.collapse(true);
        //document.getSelection().removeAllRanges();
        //document.getSelection().addRange(range);
        //console.log(document.getSelection());
        //e.preventDefault();
        //this.renderCaretPos();
    }
    window_keydown(e: JQueryKeyEventObject) {
        let keyName = this.editor.getKeyName(e);
        if (keyName == null)
            return;
        let binding = this.editor.keyBindings[keyName];
        if (binding != null && binding.handler != null) {
            if (!this.manualPreventDefault(binding.handler))
                e.preventDefault();
            binding.handler.call(this.editor, e);
        }
    }
    manualPreventDefault(func: Function): boolean {
        return false;
        //let funcs:Function[] = [this.editor.goToDefinition];
        //return funcs.contains(func);
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
            if (a.attr("target") == "_blank")
                window.open(a.attr("data-href"));
            else
                window.location.href = a.attr("data-href");
        });

        return <HTMLAnchorElement>a[0];
    }


}
