﻿"use strict"
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
import { P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem} from "./p5-service";
import { monitor, Monitor} from "./monitor";
import { PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper, Collapsable, TokenUtils, Key, Rect, Size, Point} from "./common";
import { PerlFile        } from "./perl-file";
import "ace/ext/linking";
import "ace/ext/language_tools";

import * as ace         from "ace/ace";
import * as ModeList    from "ace/ext/modelist";
import * as aceConfig   from "ace/config";

import {Annotation as AceAnnotation} from "ace/annotation";
import {snippetCompleter, textCompleter, keyWordCompleter} from "ace/ext/language_tools";

import { Editor          } from "ace/editor";
import { IEditSession    } from "ace/edit_session";
import { Range           } from "ace/range";
import { TokenInfo       } from "ace/token_info";
import { TokenIterator   } from "ace/token_iterator";
import { Position        } from "ace/position";
import { MouseEvent as AceMouseEvent     } from "ace/mouse/mouse_event";
import { Tooltip         } from "ace/tooltip";
import { StatusBar       } from "ace/ext/statusbar";
import { Config          } from "ace/config";
import { EditSession     } from "ace/edit_session";
import { GutterRenderer  } from "ace/layer/gutter";
import { VirtualRenderer } from "ace/virtual_renderer";
import { Completer       } from "ace/ext/language_tools";
import { UndoManager     } from "ace/undomanager";
import { Autocomplete    } from "ace/autocomplete";
import {EventEmitter, SimpleEventEmitter } from "./common";
import {PropertyChangeTracker, ObjProperty} from "./property-change-tracker";
import {P5AceHelper} from "./p5-ace-helper";

//import * as DarkTheme   from "./ace/theme/vs-dark";


export class P5AceEditor {
    linkEvent: LinkEvent;
    tokenUnderMouse: TokenInfo;
    linkUnderMouseMarkerId: number;
    linkUnderMouse: PopupMarker;
    tokens: Token[];
    //sourceFile: TextFile;
    codeHyperlinks: PopupMarker[];
    lastCheckedTokenUnderMouse: TokenInfo;
    tokenUnderMouse2: TokenInfo;
    popupMarkers: PopupMarker[] = [];
    editor: Editor;
    perlFile: PerlFile;

    metaText: Map<number, string> = new Map<number, string>();
    statusBarEl: HTMLElement;
    statusTextEl: HTMLElement;
    mouseDocPos: Position;
    isMouseOnDoc = false;

    init() {
        this.editor = ace.edit("editor");
        $(this.editor.textInput.getElement()).addClass("autofocus");

        this.editor.setTheme("viewer/ace/theme/vs-dark");
        this.editor.$blockScrolling = Infinity; //automatically scrolling cursor into view after selection change this will be disabled in the next version set editor.$blockScrolling = Infinity to disable this message
        this.editor.setOptions({
            enableLinking: true,
            readOnly: false,
            enableBasicAutocompletion: [snippetCompleter, /*textCompleter, */keyWordCompleter],
        });
        this.editor.focus();
        this.editor.on("linkClick", e => this.editor_linkClick(e));
        //this.editor.addEventListener("guttermousedown", e => this.editor_guttermousedown(e));
        //this.editor.addEventListener("guttermousemove", e => this.editor_guttermousemove(e));
        this.editor.on("mousemove", e => this.editor_mousemove(e));
        this.editor.renderer.getMouseEventTarget().addEventListener("mouseenter", e => this.editor_mouseenter(e));
        this.editor.renderer.getMouseEventTarget().addEventListener("mouseleave", e => this.editor_mouseleave(e));
        this.enableHover();
        this.setCode("");

        this.statusBarEl = $(".status-bar")[0];
        this.statusTextEl = $(this.statusBarEl).find(".status-text")[0];
        this.editor.commands.addCommand({
            name: 'goToDefinition',
            bindKey: { win: 'F12', mac: 'F12' },
            exec: editor => this.goToDefinition(),
            readOnly: true // false if this command should not apply in readOnly mode
        });
    }

    enableHover() {
        this.scheduleCheckHover();
    }
    scheduleCheckHover() {
        window.setTimeout(() => {
            this.checkHover();
            this.scheduleCheckHover();
        }, 200);
    }

    toggleAllFolds() {
        if (this.editor.session.getAllFolds().length == 0)
            this.editor.session.foldAll();
        else
            this.editor.session.unfold();
    }
    checkHover() {
        let pos = this.mouseDocPos;
        if (pos != null && this.isMouseOnDoc) {
            let token = this.editor.session.getTokenAt(pos.row, pos.column);
            if (this.lastCheckedTokenUnderMouse == token) {
                if (this.tokenUnderMouse2 == token)
                    return;
                this.tokenUnderMouse2 = token;
                this.onTokenHoverStart({ pos, token });
                return;
            }
            this.lastCheckedTokenUnderMouse = token;
        }
        if (this.tokenUnderMouse2 != null) {
            this.onTokenHoverEnd({ pos, token: this.tokenUnderMouse2 });
            this.tokenUnderMouse2 = null;
        }
    }
    onTokenHoverStart(e: { pos: Position, token: TokenInfo }) {
        let pm = this.findPopupMarker(e.pos);
        if (pm != null && pm.html != null) {
            this.showTooltip(e.pos, pm);
        }
        //console.log("onTokenHover start", e);
    }
    onTokenHoverEnd(e: { pos: Position, token: TokenInfo }) {
        //console.log("onTokenHover end", e);
        this.hideTooltip();
    }
    tooltipMarker: Marker;
    showTooltip(pos: Position, pm: PopupMarker) {
        this.hideTooltip();
        let row = pos.row + 1;
        let col = pos.column - 1;
        if (col < 0)
            col = 0;;
        let marker: Marker = { aceRange: new Range(row, col, row + 4, col + 10), html: pm.html, className: pm.className, inFront: true };
        this.tooltipMarker = marker;
        this.addMarker(marker);
        //this.statusTextEl.textContent = text;
    }
    hideTooltip() {
        if (this.tooltipMarker == null)
            return;
        this.removeMarker(this.tooltipMarker);
        this.tooltipMarker = null;
        //this.statusTextEl.textContent = "";
    }

    editor_mousemove(e: AceMouseEvent) {
        this.mouseDocPos = e.getDocumentPosition();
    }
    editor_mouseenter(e: MouseEvent) {
        this.isMouseOnDoc = true;
    }
    editor_mouseleave(e: MouseEvent) {
        this.isMouseOnDoc = false;
    }

    tracker: PropertyChangeTracker<this> = new PropertyChangeTracker(this);
    onPropChanged(getter: (obj: this) => any, handler: Function) { return this.tracker.on(getter, handler); }
    offPropChanged(getter: (obj: this) => any, handler: Function) { return this.tracker.off(getter, handler); }

    gutterDecorations: Map<number, string[]> = new Map<number, string[]>();
    hasGutterDecoration(line: number, className: string) {
        let list = this.gutterDecorations.get(line);
        return list != null && list.contains(className);
    }
    toggleAllGutterDecorations(className: string, toggle?: boolean) {
        this.gutterDecorations.forEach((list, line) => {
            this.toggleGutterDecoration(line, className, toggle);
        });
    }
    toggleGutterDecoration(line: number, className: string, toggle?: boolean) {
        if (toggle == null)
            toggle = !this.hasGutterDecoration(line, className);
        let row = line - 1;
        let list = this.gutterDecorations.get(line);
        if (toggle) {
            if (list == null) {
                list = [];
                this.gutterDecorations.set(line, list);
            }
            list.push(className);
            this.editor.session.addGutterDecoration(row, className);
        }
        else {
            if (list != null) {
                list.remove(className);
                if (list.length == 0)
                    this.gutterDecorations.delete(line);
            }
            this.editor.session.removeGutterDecoration(row, className);
        }
        this.gutterDecorations = this.gutterDecorations;
    }

    //editor_guttermousedown(e: AceMouseEvent) {
    //    if (e.getButton() == 0 && e.getAccelKey()) {
    //        let pos = e.getDocumentPosition();
    //        let line = pos.row + 1;
    //        this.toggleGutterDecoration(line, "bookmark");
    //    }
    //}

    getCaretToken(): TokenInfo {
        let pos = this.editor.getCursorPosition();
        let ti = new TokenIterator(this.editor.session, pos.row, pos.column);
        let token = ti.getCurrentToken();
        return token;
    }
    goToDefinition() {
        let token = this.getCaretToken();
        if (token == null)
            return;

        let hl = this.findPopupMarker(this.editor.getCursorPosition());
        if (hl == null)
            return;
        if (hl.href == null)
            return;
        console.log("navigating to", hl.href);
        if (hl.target == "_blank")
            window.open(hl.href);
        else
            window.location.href = hl.href;
    }

    getTokensRange(tokens: Token[]): TextFileRange {
        return new TextFileRange(tokens[0].range.file, tokens[0].range.start, tokens.last().range.end);
    }

    findPopupMarker(pos: Position): PopupMarker {
        let pos2 = new TextFilePos();
        pos2.line = pos.row + 1;
        pos2.column = pos.column + 1;
        let pm = this.popupMarkers.first(t => t.range != null && t.range.containsPos(pos2));
        return pm;
    }
    editor_linkClick(e: LinkEvent) {
        let link = this.findPopupMarker(e.position);
        if (link == null) {
            console.log("can't find link", this.popupMarkers, e.token, e.position);
            return;
        }
        console.log("linkClick", link);
        window.open(link.href);
    }

    removeMarker(marker: Marker) {
        if (marker == null || marker.id == null)
            return;
        this.editor.session.removeMarker(marker.id);
    }
    addMarker(marker: Marker) {
        console.log("addMarker");
        if (marker.html != null && marker.aceRenderer == null) {
            marker.aceRenderer = (html, range, left, top, config) => {
                html.push(`<div onclick="event.stopPropagation();" onmousedown="event.stopPropagation();" onmousemove="event.stopPropagation();" onmousewheel="event.stopPropagation();" class="${marker.className}" style="left:${left}px;top:${top}px;">${marker.html}</div>`);
            };
        }

        marker.id = this.editor.session.addMarker(marker.aceRange || P5AceHelper.toAceRange(marker.range), marker.className, <string>(marker.aceRenderer || marker.aceType), marker.inFront);
        if (marker.annotation != null) {
            if (marker.annotation.pos == null)
                marker.annotation.pos = marker.range.start;
            this.addAnnotation(marker.annotation);
        }
    }
    removePopupMarker(pm: PopupMarker): void {
        this.popupMarkers.remove(pm);
    }
    addPopupMarker(pm: PopupMarker): void {
        if (pm.range == null) {
            if (pm.tokens == null && pm.node != null)
                pm.tokens = TokenUtils.collectTokens(pm.node);
            if (pm.tokens == null || pm.tokens.length == 0)
                return;
            if (pm.tokens.length == 1) {
                pm.range = pm.tokens[0].range;
            }
            else {
                let first = pm.tokens.first().range;
                let last = pm.tokens.last().range;
                pm.range = new TextFileRange(first.file, first.start, last.end);
            }
        }
        if (pm.range == null)
            return;
        this.popupMarkers.add(pm);
        if (pm.className == null)
            pm.className = "marker marker-tooltip";
        else
            pm.className += " marker marker-tooltip";
        return null;
    }

    toAceAnnotation(ann: Annotation): AceAnnotation {
        return { column: ann.pos.column - 1, row: ann.pos.line - 1, text: ann.text, type: ann.type || "info" };
    }
    setAnnotations(list: Annotation[]) {
        let list2 = list.map(t => this.toAceAnnotation(t));
        this.editor.session.setAnnotations(list2);
    }
    addAnnotation(ann: Annotation) {
        let atts = this.editor.session.getAnnotations();
        atts.push(this.toAceAnnotation(ann));
        this.editor.session.setAnnotations(atts);
    }
    scrollToLine(line: number) {
        this.editor.scrollToLine(line - 1, null, false, null);
    }

    getCode(): string {
        return this.editor.getValue();
    }
    setCode(value: string) {
        let session = new EditSession(value, "viewer/ace/mode/perl");
        (<PerlEditSession>session).perlFile = this.perlFile;
        session.setUndoManager(new UndoManager());
        session.gutterRenderer = new P5GutterRenderer(this);
        this.editor.setSession(session);
    }

    setGitBlameItems(items: GitBlameItem[]) {
        let anns = items.map(item => {
            let pos = this.perlFile.sourceFile.getPos3(item.line_num, 1);
            this.metaText.set(pos.line, item.author);
            //let range = this.sourceFile.getRange2(pos, 10);
            //let marker = <Marker>{ html: "<span>" + item.author, range: range, className:"marker-git-blame", inFront:true };
            //this.addMarker(marker);
            return <Annotation>{ pos: pos, text: `${item.date}\n${item.sha}\n${item.author}` };

        });
        this.setAnnotations(anns);
    }
    notifyPossibleChanges() {
    }
}

export interface Annotation {
    pos?: TextFilePos;
    text: string;
    /** info warning error*/
    type?: string;
}

export interface Marker {
    id?: number;
    annotation?: Annotation;
    range?: TextFileRange;
    aceRange?: Range;
    className?: string;
    html?: string;
    aceType?: string;
    inFront?: boolean;
    aceRenderer?: (html: any[], range: Range, left: number, top: number, config: Config) => void;
}
export interface LinkEvent {
    position: Position;
    token: TokenInfo;
}


export interface PopupMarker {
    name?: string;//TODO: check if this is really needed
    node?: AstNode;
    tokens?: Token[];
    range?: TextFileRange;
    href?: string;
    html?: string;
    className?: string;
    target?: string;
}



export class P5GutterRenderer implements GutterRenderer {
    constructor(public editor: P5AceEditor) { }
    minGutterLength = 5;
    maxGutterLength = 11;
    getText(session: IEditSession, row: number): string {
        let line = row + 1;
        let mt = this.editor.metaText.get(line);
        if (mt != null) {
            return mt.substr(0, this.maxGutterLength - 1 - line.toString().length) + "|" + line;
        }
        return String(line);
    }
    getWidth(session: IEditSession, lastLineNumber: string | number, config: Config): number {
        if (this.editor.metaText.size > 0)
            return this.maxGutterLength * config.characterWidth;
        return this.minGutterLength * config.characterWidth;

    }

}

function hackAce() {
    //set default theme as vs-dark
    VirtualRenderer.prototype.$options.theme.initialValue = "viewer/ace/theme/vs-dark";

    //disable up/down key when reaches the start/end of autocomplete popup, and not cycle back
    let baseGoTo = Autocomplete.prototype.goTo;
    Autocomplete.prototype.goTo = function (where: string) {
        let _this: Autocomplete = this;
        let isDown = where == "down";
        let isUp = where == "up";
        if (isDown || isUp) {
            let row = _this.popup.getRow();
            if (isUp) {
                if (row <= 0) {
                    where = "start";
                    return baseGoTo.call(this, where);
                }
            }
            else if (isDown) {
                let max = _this.popup.session.getLength() - 1;
                if (row >= max)
                    where = "end";
                return baseGoTo.call(this, where);
            }
        }
        return baseGoTo.apply(this, arguments);
    }
}
hackAce();



//editor_linkHover(e: LinkEvent) {
//    return;
//    if (e.token == this.tokenUnderMouse)
//        return;
//    this.tokenUnderMouse = e.token;
//    let link = this.getLink(e.position);
//    if (link == this.linkUnderMouse)
//        return;
//    this.linkUnderMouse = link;

//    let markerId = this.linkUnderMouseMarkerId;
//    if (markerId != null) {
//        this.linkUnderMouseMarkerId = null;
//        this.editor.session.removeMarker(markerId);
//    }
//    if (this.tokenUnderMouse == null)
//        return;
//    if (link == null)
//        return;
//    let range = this.getTokensRange(link.tokens);
//    let range2 = this.toRange(range);
//    this.linkUnderMouseMarkerId = this.editor.session.addMarker(range2, "marker marker-link", "text", false);
//}



//return 10 * config.characterWidth;;
//let length: number;
//if (this.editor.metaText.size > 0) {
//    let maxMetaLength = 0;
//    let firstRow = this.editor.editor.getFirstVisibleRow();
//    let lastRow = this.editor.editor.getLastVisibleRow();
//    for (let row = firstRow; row <= lastRow; row++) {
//        let line = row + 1;
//        let l = (this.editor.metaText.get(line) || "").length;
//        if (maxMetaLength < l)
//            maxMetaLength = l;
//    }
//    length = (lastRow + 1).toString().length + maxMetaLength + 1;
//}
//else {
//    length = lastLineNumber.toString().length;
//}
//let width = length * config.characterWidth;
//return width;


export interface PerlEditSession {
    perlFile?: PerlFile;
}
