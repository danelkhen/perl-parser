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
import {TokenIterator} from "ace/token_iterator";
import {Position} from "ace/position";
import {MouseEvent} from "ace/mouse/mouse_event";
import {Tooltip} from "ace/tooltip";
import {StatusBar} from "ace/ext/statusbar";
import "ace/ext/linking";
import {Config} from "ace/config";
import {HashHandler} from "ace/keyboard/hash_handler";

export class P5AceEditor implements P5Editor {
    init() {
        this.editor = ace.edit("editor");
        this.editor.session.setMode("ace/mode/perl");
        this.editor.setTheme("ace/theme/vs");
        this.editor.setOptions({
            enableLinking: true,
            readOnly: false,
        });
        this.editor.focus();
        //this.editor.addEventListener("linkHover", e => this.editor_linkHover(e));
        this.editor.addEventListener("linkClick", e => this.editor_linkClick(e));
        this.editor.addEventListener("mousemove", e => this.editor_mousemove(e));
        this.enableHover();

        this.statusBarEl = $(".status-bar")[0];
        this.statusTextEl = $(this.statusBarEl).find(".status-text")[0];
        this.statusBar = new StatusBar(this.editor, this.statusBarEl);
        let kh = new HashHandler();
        kh.bindKeys({ 
            "F12": (editor, arg) => this.goToDefinition() 
        });
        this.editor.keyBinding.addKeyboardHandler(kh);
    }
    statusBar: StatusBar;
    statusBarEl: HTMLElement;
    statusTextEl: HTMLElement;

    enableHover() {
        this.scheduleCheckHover();
    }
    scheduleCheckHover() {
        window.setTimeout(() => {
            this.checkHover();
            this.scheduleCheckHover();
        }, 200);
    }

    lastCheckedTokenUnderMouse: TokenInfo;
    tokenUnderMouse2: TokenInfo;

    checkHover() {
        let pos = this.mouseDocPos;
        if (pos == null)
            return;
        let token = this.editor.session.getTokenAt(pos.row, pos.column);
        if (this.lastCheckedTokenUnderMouse == token) {
            if (this.tokenUnderMouse2 == token)
                return;
            this.tokenUnderMouse2 = token;
            this.onTokenHoverStart({ pos, token });
            return;
        }
        if (this.tokenUnderMouse2 != null) {
            this.onTokenHoverEnd({ pos, token: this.tokenUnderMouse2 });
            this.tokenUnderMouse2 = null;
        }
        this.lastCheckedTokenUnderMouse = token;
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
    toTextFilePos(pos: Position): TextFilePos {
        let pos2 = new TextFilePos();
        pos2.line = pos.row + 1;
        pos2.column = pos.column + 1;
        return pos2;
    }
    hideTooltip() {
        if (this.tooltipMarker == null)
            return;
        this.removeMarker(this.tooltipMarker);
        this.tooltipMarker = null;
        //this.statusTextEl.textContent = "";
    }

    mouseDocPos: Position;
    editor_mousemove(e: MouseEvent) {
        this.mouseDocPos = e.getDocumentPosition();
        //console.log("editor_mousemove", this.mouseDocPos);
    }


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

    linkEvent: LinkEvent;
    tokenUnderMouse: TokenInfo;
    linkUnderMouseMarkerId: number;
    linkUnderMouse: CodeHyperlink;
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

    hyperlinkNode(hl: CodeHyperlink): HTMLAnchorElement {
        if (hl.html == null) {
            console.log("hyperlinkNode not supported anymore");
            return null;
        }
        this.addPopupMarker({ href: hl.href, html: hl.html, node: hl.node, tokens: hl.tokens, className: hl.css });
        return null;
    }


    getTokensRange(tokens: Token[]): TextFileRange {
        return new TextFileRange(tokens[0].range.file, tokens[0].range.start, tokens.last().range.end);
    }

    findPopupMarker(pos: Position): PopupMarker {
        let pos2 = new TextFilePos();
        pos2.line = pos.row + 1;
        pos2.column = pos.column + 1;
        let link = this.popupMarkers.first(link => link.tokens != null && link.tokens.first(t => t.range.containsPos(pos2)) != null);
        return link;
    }
    editor_linkClick(e: LinkEvent) {
        let link = this.findPopupMarker(e.position);
        //let token: TokenInfo = e.token;
        //let pos: Position = e.position;
        //let pos2 = new TextFilePos();
        //pos2.line = pos.row + 1;
        //pos2.column = pos.column + 1;
        //let link = this.links.first(link => link.tokens != null && link.tokens.first(t => t.range.containsPos(pos2)) != null);
        if (link == null) {
            console.log("can't find link", this.popupMarkers, e.token, e.position);
            return;
        }
        console.log("linkClick", link);
        window.open(link.href);
    }

    popupMarkers: PopupMarker[] = [];

    editor: Editor;
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

        marker.id = this.editor.session.addMarker(marker.aceRange || this.toRange(marker.range), marker.className, <string>(marker.aceRenderer || marker.aceType), marker.inFront);
        if (marker.annotation != null) {
            if (marker.annotation.pos == null)
                marker.annotation.pos = marker.range.start;
            this.addAnnotation(marker.annotation);
        }
    }
    addPopupMarker(pm: PopupMarker): void {
        if (pm.tokens == null && pm.node != null) {
            pm.tokens = TokenUtils.collectTokens(pm.node);
        }
        if (pm.tokens == null)
            return;
        this.popupMarkers.add(pm);
        if (pm.className == null)
            pm.className = "marker marker-tooltip";
        else
            pm.className += " marker marker-tooltip";
        return null;
    }


    addAnnotation(ann: Annotation) {
        let atts = this.editor.session.getAnnotations();
        atts.push({ column: ann.pos.column - 1, row: ann.pos.line - 1, text: ann.text, type: ann.type || "info" });
        this.editor.session.setAnnotations(atts);
    }
    toPosition(pos: TextFilePos): Position {
        return { row: pos.line - 1, column: pos.column - 1 };
    }
    toRange(range: TextFileRange): Range {
        return new Range(range.start.line - 1, range.start.column - 1, range.end.line - 1, range.end.column - 1);
    }
    scrollToLine(line: number) {
        this.editor.scrollToLine(line - 1, null, false, null);
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
    node?: AstNode;
    tokens?: Token[];
    //marker: Marker;
    href?: string;
    html?: string;
    className?: string;
    target?: string;
}



