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
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, TokenReader, Logger, AstNodeFixator,
    TextFile, TextFilePos, TextFileRange, Cursor,
} from "perl-parser";
import {PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper} from "./common";
import {RefArrayToRefUtil} from "perl-parser";
import {ExpressionTester, EtReport, EtItem} from "perl-parser";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {Key, Rect, Size, Point} from "./common";
import {EditorDomBinder} from "./editor-dom-binder";
import {GitBlameItem} from "./p5-service";

export interface P5Editor {
    init();
    hyperlinkNode(opts: CodeHyperlink): HTMLAnchorElement;
    scrollToLine(line: number);
    tokens: Token[];
    sourceFile: TextFile;
    codeHyperlinks: CodeHyperlink[];
    unit: Unit;
    collapsables: Collapsable[];
    collapsable(node: AstNode, tokens?: Token[]);
    code: string;
    parse();
    tokenizeAsync(filename: string): Promise<any>;
    setGitBlameItems(items: GitBlameItem[]);
    notifyPossibleChanges();

}


export class Editor implements P5Editor {
    notifyPossibleChanges() {
        this.binder.notifyPossibleChanges();
    }
    code: string;
    lines: CvLine[];
    isAllCollapsed: boolean;
    unit: Unit;
    tokens: Token[];
    caretVisualPos: EditorPos;
    sourceFile: TextFile;
    binder: EditorDomBinder;
    codeHyperlinks: CodeHyperlink[] = [];
    visualLineCount = 10;
    topVisualLine = 1;
    setGitBlameItems(items: GitBlameItem[]) {
        items.forEach(item => {
            let line = this.binder.getLineEl(parseInt(item.line_num));
            $(line).find(".git-blame").remove();
            let el = $.create(".git-blame");
            el.getAppend("span.sha").text(item.sha);
            el.getAppend("span.author").text(item.author);
            Helper.tooltip(el[0], { template: [item.author, item.date, item.sha].join("\n") });
            $(line).find(".line-number").before(el);
        });
    }



    init() {
        this.lines = [];
        this.initKeyBindings();
        this.caretVisualPos = { line: 1, column: 1 };

        if (this.binder == null) {
            this.binder = new EditorDomBinder();
            this.binder.editor = this;
        }
        this.binder.init();
    }

    getLine(line: number): CvLine {
        return this.lines[line - 1];
    }


    tokenizeAsync(filename: string): Promise<any> {
        let start = new Date();
        this.sourceFile = new TextFile(filename, this.code);
        let tok = new Tokenizer();
        tok.onStatus = () => console.log("Tokenizer status: ", Helper.toPct(tok.cursor.index / tok.file.text.length));
        tok.file = this.sourceFile;
        //tok.process();
        return tok.processAsync().then(() => {
            let end = new Date();
            console.log("tokenization took " + (end.valueOf() - start.valueOf()) + "ms");
            this.tokens = tok.tokens;
        });
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


    keyBindings: { [key: string]: KeyBinding };
    initKeyBindings() {
        let bindings: KeyBinding[] = [
            { key: Key.RIGHT, handler: this.caretNextChar },
            { key: Key.LEFT, handler: this.caretPrevChar },
            { key: Key.UP, handler: this.caretPrevLine },
            { key: Key.DOWN, handler: this.caretNextLine },

            { key: Key.PAGE_DOWN, handler: this.caretNextPage },
            { key: Key.PAGE_UP, handler: this.caretPrevPage },

            { key: Key.HOME, handler: this.caretLineStart },
            { key: Key.END, handler: this.caretLineEnd },

            { key: [Key.CONTROL, Key.LEFT], handler: this.caretPrevToken },
            { key: [Key.CONTROL, Key.RIGHT], handler: this.caretNextToken },
            { key: [Key.CONTROL, Key.HOME], handler: this.caretDocStart },
            { key: [Key.CONTROL, Key.END], handler: this.caretDocEnd },

            { key: [Key.CONTROL, Key.A], handler: this.caretSelectAll },
            { key: Key.F12, handler: this.goToDefinition },
        ];
        this.keyBindings = {};

        bindings.forEach(binding => {
            let name = this.getKeyName2(binding.key);
            this.keyBindings[name] = binding;
        });
    }

    goToDefinition() {
        let token = this.getCaretToken();
        if (token == null)
            return;
        let hl = this.codeHyperlinks.first(t => t.tokens.contains(token));
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

    comparePos(x: EditorPos, y: EditorPos): number {
        if (x.line == y.line)
            return y.column - x.column;
        return y.line - x.line;
    }
    rangeContainsPos(range: TextFileRange, pos: EditorPos): boolean {
        return this.comparePos(range.start, pos) >= 0 &&
            this.comparePos(range.end, pos) < 0;

    }
    getCaretToken(): Token {
        let pos = this.caretLogicalPos;
        if (pos == null)
            return null;
        let line = this.getLine(pos.line);
        if (line == null)
            return null;
        let token = line.tokens.first(token => this.rangeContainsPos(token.range, pos));
        return token;
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
        this.caretVisualPos.column++;
    }
    caretPrevToken() {
        let token = this.getCaretToken();
        let index = this.tokens.indexOf(token);
        let prevToken = this.tokens[index - 1];
        if (prevToken == null)
            return;
        this.setCaretLogicalPos(prevToken.range.start);
    }
    caretNextToken() {
        let token = this.getCaretToken();
        let index = this.tokens.indexOf(token);
        let nextToken = this.tokens[index + 1];
        if (nextToken == null)
            return;
        this.setCaretLogicalPos(nextToken.range.start);
    }
    caretNextWord() {
        let line = this.getCurrentLineText().substr(this.caretVisualPos.column - 1);
        console.log(line);
        let res = /(\s+)(\S)/.exec(line);
        console.log(res);
        if (res != null) {
            let index = res.index + res[1].length;
            console.log(index);
            this.caretVisualPos.column += index;
        }
        else {
            //TODO: next line
        }
    }
    caretPrevChar() {
        this.caretVisualPos.column--;
        if (this.caretVisualPos.column < 1)
            this.caretVisualPos.column = 1;
    }
    caretPrevLine() {
        let line = this.caretVisualPos.line;
        line--;
        if (line < 1)
            line = 1;
        this.caretVisualPos.line = line;
        this.verifyCaretInView();
    }
    caretNextLine() {
        let line = this.caretVisualPos.line;
        line++;
        if (line > this.lines.length)
            line = this.lines.length;
        this.caretVisualPos.line = line;
        this.verifyCaretInView();
    }
    caretPrevPage() {
        let topVisualLine = this.topVisualLine;
        let line = this.caretVisualPos.line;
        let lineCount = this.visualLineCount;
        let offset = line - topVisualLine;
        let newLine = line - lineCount;
        if (newLine < 1)
            newLine = 1;
        this.caretVisualPos.line = newLine;
        let newTopVisualLine = newLine - offset;
        if (newTopVisualLine < 1)
            newTopVisualLine = 1;
        if (offset >= 0 && offset <= lineCount)
            this.topVisualLine = newTopVisualLine;

    }
    caretNextPage() {
        let firstLine = this.topVisualLine;
        let line = this.caretVisualPos.line;
        let lineCount = this.visualLineCount;
        let offset = line - firstLine;
        let newLine = line + lineCount;
        if (newLine > this.lines.length)
            newLine = this.lines.length;
        this.caretVisualPos.line = newLine;
        if (offset <= lineCount)
            this.topVisualLine = newLine - offset;
    }
    caretLineStart() {
        let text = this.getCurrentLineText();
        let res = /\S/.exec(text);
        if (res != null && res.index + 1 != this.caretVisualPos.column)
            this.caretVisualPos.column = res.index + 1;
        else
            this.caretVisualPos.column = 1;
    }
    caretLineEnd() {
        let text = this.getCurrentLineText();
        this.caretVisualPos.column = text.length + 1;
    }
    caretDocStart() {
        this.setCaretLogicalPos({ line: 1, column: 1 });
        this.verifyCaretInView();
    }
    caretDocEnd() {
        let line = this.lines.length;
        let text = this.sourceFile.getLineText(line);
        let column = text.length || 1;
        this.setCaretLogicalPos({ line, column });
        this.verifyCaretInView();
    }
    caretSelectAll() {
        let range = document.createRange();
        range.selectNode($(".code")[0]);
        let sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    getCurrentLineText(): string {
        return this.sourceFile.getLineText(this.caretLogicalPos.line);
    }

    expandOrCollapseAll() {
        this.isAllCollapsed = !this.isAllCollapsed;
        this.collapsables.forEach(t => t.isCollapsed = this.isAllCollapsed);
    }

    collapsables: Collapsable[] = [];
    collapsable(node: AstNode, tokens?: Token[]) {
        if (node != null && tokens == null)
            tokens = this.collectTokens2(node);
        this.collapsables.push({ node, tokens, isCollapsed: false });
    }

    scrollToLine(line: number) {
        //this.verifyPosInView({ line, column: 1 });

        this.topVisualLine = line;
    }


    getLastVisibleVisualLineNumber(): number {
        return this.topVisualLine + this.visualLineCount;
    }
    setLastVisibleVisualLineNumber(line: number) {
        this.topVisualLine = line - this.visualLineCount;
    }

    verifyCaretInView() {
        this.verifyPosInView(this.caretVisualPos);
    }
    verifyPosInView(p: EditorPos) {
        let firstLine = this.topVisualLine;
        let lastLine = this.getLastVisibleVisualLineNumber();
        let line = p.line;
        if (line < firstLine)
            this.topVisualLine = p.line;
        else if (line > lastLine) {
            this.setLastVisibleVisualLineNumber(p.line);
        }
        else {
        }
    }



    hyperlinkNode(opts: CodeHyperlink): HTMLAnchorElement {
        this.codeHyperlinks.push(opts);
        return opts.anchorEl;
    }


    //highlightNode(node: AstNode) {
    //    let tokens = this.collectTokens2(node);
    //    tokens.forEach(token => {
    //        let el = this.binder.tokenToElement.get(token);
    //        el.classList.add("highlight");
    //    });
    //}

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

    get caretLogicalPos(): EditorPos {
        return this.binder.visualToLogicalPos(this.caretVisualPos);
    }
    setCaretLogicalPos(pos: EditorPos) {
        let pos2 = this.binder.logicalToVisualPos(pos);
        this.caretVisualPos.line = pos2.line;
        this.caretVisualPos.column = pos2.column;
    }

}




export interface CodeHyperlink {
    node?: AstNode;
    tokens?: Token[];
    href?: string;
    name?: string;
    title?: string;
    css?: string;
    anchorEl?: HTMLAnchorElement;
    target?: string;
    html?:string;
    //tooltip?:TooltipOptions;
}


export class CvLine {
    lineNumberEl: HTMLElement;
    tokens: Token[];
    visible: boolean = true;
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


export interface PropChangedHandler<T> { (e: PropChangedEvent<T>): void; }

export interface PropChangedEvent<T> {
    obj: T;
    prop: string;
    prevValue: any;
    value: any;
}
export interface MethodInvokedHandler<T> { (e: MethodInvokedEvent<T>): void; }
export interface MethodInvokedEvent<T> {
    obj: T;
    prop: string;
    func: Function;
    args: ArrayLike<any>;

}


export interface Watched<T> {
    watchable: Watchable<T>;
}
export class Watchable<T>{
    constructor(public obj: T) {
    }
    static from<T>(obj: T): Watchable<T> {
        let watched = <Watched<T>><any>obj;
        if (watched.watchable == null)
            watched.watchable = new Watchable<T>(obj);
        return watched.watchable;
    }

    private extractNames(code: string) {
        let sub = code.substringBetween("return ", ";");
        let names = sub.split(/[\,\[\] ]/).map(t => t.split(".").last()).where(t => t != "");
        return names;
    }
    methods(methods: (x: T) => Array<Function> | Function, handler: MethodInvokedHandler<T>): void {
        if (this.watchedMethods == null)
            this.watchedMethods = {};
        if (this.data == null)
            this.data = {};
        let watchMethodHandlers = this.watchedMethods;
        let methods2 = this.extractNames(methods.toString());
        let data = this.data;
        let obj = this.obj;
        methods2.forEach(prop => {
            let handlers = this.watchedMethods[prop];
            if (handlers == null) {
                handlers = [];
                this.watchedMethods[prop] = handlers;
            }
            handlers.push(handler);
            if (this.data.hasOwnProperty(prop))
                return;
            this.data[prop] = obj[prop];
            obj[prop] = function () {
                let func = <Function>data[prop];
                let res = func.apply(obj, arguments);
                let handlers2 = watchMethodHandlers[prop];
                if (handlers2 == null || handlers2.length == 0)
                    return res;
                let e: MethodInvokedEvent<T> = { obj, prop, args: arguments, func: obj[prop] };
                handlers2.forEach(t => t(e));
                return res;
            }
        });
    }

    redfineProp(prop: (x: T) => any, propDesc: PropertyDescriptor): void {
        let propName = this.extractNames(prop.toString()).first();
        return Object.defineProperty(this.obj, propName, propDesc);
    }
    prop(prop: (x: T) => any, handler: PropChangedHandler<T>): void { return this.props(prop, handler); }
    method(method: (x: T) => Function, handler: MethodInvokedHandler<T>): void { return this.methods(method, handler); }
    props(props: (x: T) => Array<any> | any, handler: PropChangedHandler<T>): void {
        if (this.watchedProps == null)
            this.watchedProps = {};
        if (this.data == null)
            this.data = {};
        let props2 = this.extractNames(props.toString());
        props2.forEach(prop => {
            let handlers = this.watchedProps[prop];
            if (handlers == null) {
                handlers = [];
                this.watchedProps[prop] = handlers;
            }
            handlers.push(handler);
            if (this.data.hasOwnProperty(prop))
                return;
            this.data[prop] = this.obj[prop];
            Object.defineProperty(this.obj, prop, {
                get: () => this.data[prop],
                set: value => {
                    let prevValue = this.data[prop];
                    this.data[prop] = value;
                    let handlers2 = this.watchedProps[prop];
                    if (handlers == null || handlers.length == 0)
                        return;
                    let e: PropChangedEvent<T> = { obj: this.obj, prop, prevValue, value };
                    handlers2.forEach(handler => handler(e));
                }
            });
        });
    }

    private data: Object;
    private watchedProps: { [key: string]: Array<PropChangedHandler<T>> };
    private watchedMethods: { [key: string]: Array<MethodInvokedHandler<T>> };

}


export interface Collapsable {
    node: AstNode;
    tokens: Token[];
    isCollapsed: boolean;
}


export interface EditorPos {
    line: number;
    column: number;
}
