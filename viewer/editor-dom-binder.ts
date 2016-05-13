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
import {CodeEditor} from "./code-editor";

export class EditorDomBinder {
    el: HTMLElement;
    editor: CodeEditor;
    scrollEl: HTMLElement;
    lineHeight = 15;
    fontWidth = 7.19;
    lineNumbersEl: HTMLElement;
    lineTemplate: JQuery;
    caretEl: HTMLElement;

    init() {
        this.scrollEl = $(".code-view")[0];
        this.lineNumbersEl = $(".lines")[0];
    }
    getLineEl(line: number): HTMLElement {
        return <HTMLElement>this.lineNumbersEl.childNodes.item(line - 1);
    }

    getFirstVisibleLineNumber(): number {
        let y = Math.ceil(this.scrollEl.scrollTop / this.lineHeight) + 1;
        return y;
    }
    setFirstVisibleLineNumber(line: number) {
        let el = this.getLineEl(line);
        if (el == null)
            return;
        this.scrollEl.scrollTop = el.offsetTop;
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

    screenToPos(p: Point): Point {
        return p.div(this.projectionRatio).floor().add(new Point(1, 1));
    }
    posToScreen(p: Point): Point {
        return p.subtract(new Point(1, 1)).mul(this.projectionRatio);
    }
    projectionRatio: Point = new Point(this.fontWidth, this.lineHeight);

    renderCaretPos() {
        if (this.editor.caretPos.line > this.editor.lines.length)
            this.editor.caretPos.line = this.editor.lines.length;
        else if (this.editor.caretPos.line < 1)
            this.editor.caretPos.line = 1;
        if (this.editor.caretPos.column < 1)
            this.editor.caretPos.column = 1;
        $(this.caretEl).css({ left: (this.editor.caretPos.column - 1) * this.fontWidth, top: (this.editor.caretPos.line - 1) * this.lineHeight });
        this.editor.scrollToPosIfNeeded(this.editor.caretPos);
    }

    renderLineNumbers() {
        if (this.lineTemplate == null)
            this.lineTemplate = $(".line").first().remove();

        $(this.lineNumbersEl).empty()[0];
        this.editor.lines.forEach((line, i) => {
            let div = this.lineTemplate.clone();
            let lineNumber = i + 1;
            div.find(".line-number").text(lineNumber.toString()).attr({ name: "L" + lineNumber, href: "javascript:void(0)" });
            this.lineNumbersEl.appendChild(div[0]);
        });
    }

    initCaret() {
        this.caretEl = $(".caret")[0];
        this.caretEl.focus();
        $(window).keydown(e => {
            this.window_keydown(e);
        });
        $(this.scrollEl).mousedown(e => this.scrollEl_mousedown(e));
        this.renderCaretPos();
    }

    scrollEl_mousedown(e: JQueryMouseEventObject) {
        let pos = this.screenToPos(new Point(e.offsetX, e.offsetY));
        this.editor.caretPos.line = pos.y;
        this.editor.caretPos.column = pos.x;
        this.renderCaretPos();
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



}
