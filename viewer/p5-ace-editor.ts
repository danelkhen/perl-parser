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
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, TokenReader, Logger, AstNodeFixator, TextFile, TextFilePos, TextFileRange, Cursor,
    ExpressionTester, EtReport, EtItem, RefArrayToRefUtil,
    EntityResolver, Package, Subroutine, Global
} from "perl-parser";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper, Collapsable, TokenUtils, CodeHyperlink, Key, Rect, Size, Point} from "./common";
//import * as config from "ace/config";
import * as ace from "ace/ace";
import * as ModeList from "ace/ext/modelist";
import {Editor} from "ace/editor";
import {IEditSession} from "ace/edit_session";
import {Range} from "ace/range";
import {TokenInfo} from "ace/token_info";
import {TokenIterator} from "ace/token_iterator";
import {Position} from "ace/position";
import {MouseEvent} from "ace/mouse/mouse_event";
import {Tooltip} from "ace/tooltip";
import {StatusBar} from "ace/ext/statusbar";
import "ace/ext/linking";
import {Config} from "ace/config";
import "ace/ext/language_tools";
import {EditSession} from "ace/edit_session";
import {Annotation as AceAnnotation} from "ace/annotation";
import {GutterRenderer} from "ace/layer/gutter";
import {snippetCompleter, textCompleter, keyWordCompleter} from "ace/ext/language_tools";
import {Completer} from "ace/ext/language_tools";

export class P5AceEditor {
    linkEvent: LinkEvent;
    tokenUnderMouse: TokenInfo;
    linkUnderMouseMarkerId: number;
    linkUnderMouse: CodeHyperlink;
    tokens: Token[];
    sourceFile: TextFile;
    codeHyperlinks: CodeHyperlink[];
    unit: Unit;
    collapsables: Collapsable[];
    collapsable(node: AstNode, tokens?: Token[]) { }
    lastCheckedTokenUnderMouse: TokenInfo;
    tokenUnderMouse2: TokenInfo;
    popupMarkers: PopupMarker[] = [];
    editor: Editor;
    metaText: Map<number, string> = new Map<number, string>();
    statusBarEl: HTMLElement;
    statusTextEl: HTMLElement;
    mouseDocPos: Position;
    isMouseOnDoc = false;

    init() {
        this.editor = ace.edit("editor");
        this.editor.session.setMode("viewer/ace/mode/perl");
        this.editor.setTheme("viewer/ace/theme/vs");
        this.editor.$blockScrolling = Infinity; //automatically scrolling cursor into view after selection change this will be disabled in the next version set editor.$blockScrolling = Infinity to disable this message
        this.editor.setOptions({
            enableLinking: true,
            readOnly: false,
            enableBasicAutocompletion: [snippetCompleter, /*textCompleter, */keyWordCompleter],
        });
        this.editor.focus();
        this.editor.addEventListener("linkClick", e => this.editor_linkClick(e));
        this.editor.addEventListener("mousemove", e => this.editor_mousemove(e));
        this.editor.renderer.getMouseEventTarget().addEventListener("mouseenter", e => this.editor_mouseenter(e));
        this.editor.renderer.getMouseEventTarget().addEventListener("mouseleave", e => this.editor_mouseleave(e));
        this.enableHover();

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

    editor_mousemove(e: MouseEvent) {
        this.mouseDocPos = e.getDocumentPosition();
    }
    editor_mouseenter(e: Event) {
        this.isMouseOnDoc = true;
    }
    editor_mouseleave(e: Event) {
        this.isMouseOnDoc = false;
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

    hyperlinkNode(hl: CodeHyperlink) {
        if (hl.html == null) {
            console.log("hyperlinkNode not supported anymore");
            return null;
        }
        this.addPopupMarker({ href: hl.href, html: hl.html, node: hl.node, tokens: hl.tokens, className: hl.css, target: hl.target });
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

        marker.id = this.editor.session.addMarker(marker.aceRange || this.toRange(marker.range), marker.className, <string>(marker.aceRenderer || marker.aceType), marker.inFront);
        if (marker.annotation != null) {
            if (marker.annotation.pos == null)
                marker.annotation.pos = marker.range.start;
            this.addAnnotation(marker.annotation);
        }
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
    toPosition(pos: TextFilePos): Position {
        return { row: pos.line - 1, column: pos.column - 1 };
    }
    toRange(range: TextFileRange): Range {
        return new Range(range.start.line - 1, range.start.column - 1, range.end.line - 1, range.end.column - 1);
    }
    scrollToLine(line: number) {
        this.editor.scrollToLine(line - 1, null, false, null);
    }

    getCode(): string {
        return this.editor.getValue();
    }
    setCode(value: string) {
        let session = new EditSession(value, "viewer/ace/mode/perl");
        session.gutterRenderer = new P5GutterRenderer(this);
        this.editor.setSession(session);
        //this.editor.setValue(value, -1);
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
        this.unitPackage = EntityResolver.process(this.unit)[0];
        console.log({ package: this.unitPackage });
        this.global = new Global();
        this.global.packages.push(this.unitPackage);
    }
    unitPackage: Package;
    global: Global;

    tokenizeAsync(filename: string): Promise<any> {
        //this.code = data;
        let start = new Date();
        this.sourceFile = new TextFile(filename, this.getCode());
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
        let anns = items.map(item => {
            let pos = this.sourceFile.getPos3(parseInt(item.line_num), 1);
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
    node?: AstNode;
    tokens?: Token[];
    //marker: Marker;
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
