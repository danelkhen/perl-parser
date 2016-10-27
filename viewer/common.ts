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
} from "perl-parser";
import {ChangeTracker} from "./monitor";
import {PerlModuleClassify} from "./p5-service";

export class Helper {
    static tooltip(el: HTMLElement, opts: PopoverOptions) {
        if (opts.html == null)
            opts.html = true;
        if (opts.trigger == null)
            opts.trigger = "hover";
        if (opts.delay == null)
            opts.delay = 200;
        if (opts.placement == null)
            opts.placement = "bottom";
        if (opts.animation == null)
            opts.animation = false;
        $(el).popover(opts);
        //TODO:
        //$('.selector').popover({
        //    html: true,
        //    trigger: 'manual',
        //    container: $(this).attr('id'),
        //    placement: 'top',
        //    content: function () {
        //        $return = '<div class="hover-hovercard"></div>';
        //    }
        //}).on("mouseenter", function () {
        //    var _this = this;
        //    $(this).popover("show");
        //    $(this).siblings(".popover").on("mouseleave", function () {
        //        $(_this).popover('hide');
        //    });
        //}).on("mouseleave", function () {
        //    var _this = this;
        //    setTimeout(function () {
        //        if (!$(".popover:hover").length) {
        //            $(_this).popover("hide")
        //        }
        //    }, 100);
        //});
    }
    //static tooltip_old(opts: TooltipOptions) {
    //    if (opts.position == null)
    //        opts.position = "bottom left";
    //    if (opts.classes == null)
    //        opts.classes = opts.target.className;
    //    opts.classes += " tt";
    //    new Tooltip(opts);
    //}

    static toPct(x: number) {
        return (x * 100).toFixed(0) + "%";
    }

    static flattenArray<T>(list: Array<T | Array<T>>): T[] {
        let list2: T[] = [];
        list.forEach(t => {
            if (t instanceof Array)
                list2.addRange(this.flattenArray(t));
            else
                list2.add(<T>t);
        });
        return list2;
    }
    static urlJoin(parts: Array<string | string[]>): string {
        let parts2 = this.flattenArray(parts);
        let final = parts2[0];
        let prev = parts2[0];
        parts2.skip(1).forEach(part => {
            if (prev.endsWith("/") && part.startsWith("/")) {
                final += part.substr(1);
            }
            else if (!prev.endsWith("/") && !part.startsWith("/")) {
                final += "/" + part;
            }
            else {
                final += part;
            }
            prev = part;
        });
        return final;
    }
    stringifyNodes(node): string {
        let sb = [];
        function stringify(obj) {
            if (obj instanceof Array)
                return obj.forEach(stringify);
            if (typeof (obj) == "object") {
                if (obj instanceof Token) {
                    stringify((<Token>obj).value);
                }
                if (obj instanceof AstNode) {
                    sb.push(obj.constructor.name);
                    Object.keys(obj).forEach(key => {
                        let value = obj[key];
                        if (key != "token")
                            sb.push(key);
                        stringify(value);
                        sb.push("\n");
                    });
                }
                return;
            }
            sb.push(JSON.stringify(obj));
        }
        stringify(node);
        return sb.join(" ");
    }


    static selectAsyncFuncs<T, R>(list: T[], selector: (item: T) => Promise<R>): Array<AsyncFunc<R>> {
        return list.map(t => () => selector(t));
    }

    static firstSuccess<T>(funcs: Array<AsyncFunc<T>>): Promise<T> {
        return new Promise((resolve, reject) => {
            let index = -1;
            let tryNext = () => {
                index++;
                let func = funcs[index];
                if (func == null) {
                    reject();
                    return;
                }
                func()
                    .then(t => {
                        resolve(t);
                    })
                    .catch(t => {
                        tryNext();
                    });
            };
            tryNext();
        });
    }


    static isElementInViewport(el: HTMLElement) {
        var rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
        );
    }
    static SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
    // Match everything outside of normal chars and " (quote character)
    static NON_ALPHANUMERIC_REGEXP = /([^\#-~| |!])/g;
    /**
     * Escapes all potentially dangerous characters, so that the
     * resulting string can be safely inserted into attribute or
     * element text.
     * @param value
     * @returns {string} escaped text
     */
    static htmlEncode(value: string) {
        return value.
            replace(/&/g, '&amp;').
            replace(this.SURROGATE_PAIR_REGEXP, function (value) {
                var hi = value.charCodeAt(0);
                var low = value.charCodeAt(1);
                return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';';
            }).
            replace(this.NON_ALPHANUMERIC_REGEXP, function (value) {
                return '&#' + value.charCodeAt(0) + ';';
            }).
            replace(/</g, '&lt;').
            replace(/>/g, '&gt;');
    }

    static _isBrowserReversesAttributes: boolean;
    static isBrowserReversesAttributes() {
        if (this._isBrowserReversesAttributes == null) {
            let div = document.createElement("div");
            div.innerHTML = "<a b='c' d='e'/>";
            this._isBrowserReversesAttributes = div.firstChild.attributes[0].name == "d";
        }
        return this._isBrowserReversesAttributes;
    }
    static getAttributes(node: Node): Attr[] {
        let list = Array.from(node.attributes);
        if (this.isBrowserReversesAttributes())
            list.reverse();
        return list;
    }
    static findConsecutiveRepetitions<T>(list: T[], equals: (x: T, y: T) => boolean): Array<T[]> {
        let repeat: T[] = null;
        let repeats: Array<T[]> = [];
        list.forEach(t => {
            if (repeat == null)
                repeat = [t];
            else if (equals(repeat[0], t))
                repeat.push(t);
            else {
                if (repeat.length > 1)
                    repeats.push(repeat);
                repeat = [t];
            }
        });
        if (repeat != null && repeat.length > 1)
            repeats.push(repeat);
        return repeats;
    }

}

export interface TreeNodeData {
    obj?: Object;
    prop?: string;
    value?: any;
    text: string;
    children: TreeNodeData[];
}






//class PromiseRef<T> {
//    run(): Promise<T> {
//        return Promise.resolve(null);
//    }
//}

export interface AsyncFunc<T> {
    (): Promise<T>;
}


export interface PackageResolution {
    //node?: AstNode;
    name?: string;
    //resolvedIncludePath?: string;
    resolvedPackage: PerlModuleClassify;
    docHtml?: string;
}



export interface Expander {
    toggle(collapsed?: boolean);
    isCollapsed(): boolean;
}


export class FunctionHelper {
    static parse(s: string): ParsedFunction {
        var prms = this.parseArrowFunctionArgNames(s);
        if (prms != null) {
            var arrowEnd = s.indexOf("=>") + 2;
            var body = s.substr(arrowEnd);
            var type = "ArrowExpressionFunction";
            let body2 = body.trim();
            if (body2.startsWith("{") && body2.endsWith("}")) {
                type = "ArrowFunction";
                body = body2.substring(1, body2.length - 1);
            }
            return { body: body, prms: prms, type: type, name: null };
        }
        prms = this.parsePrms(s);
        if (prms == null)
            return null;
        var body = s.substring(s.indexOf("{") + 1, s.lastIndexOf("}") - 1);
        var name = s.substringBetween("function ", "(").trim();
        var type = name == "" ? "AnonymousFunction" : "NamedFunction";
        return { body: body, prms: prms, type: type, name: name };
    }
    static FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    static FN_ARG_SPLIT = /,/;
    static FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
    static STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    static parsePrms(s) {
        var list = [];
        var fnText = s.toString().replace(this.STRIP_COMMENTS, '');
        var argDecl = fnText.match(this.FN_ARGS);
        if (argDecl == null)
            return null;
        argDecl[1].split(this.FN_ARG_SPLIT).forEach(function (arg) {
            arg.replace(this.FN_ARG, function (all, underscore, name) {
                list.push(name);
            });
        });
        return list;
    }
    static isValidIdentifier(s) {
        return /^[a-zA-Z_]+[a-zA-Z0-9]*$/.test(s);
    }

    static parseArrowFunctionArgNames(s: string): string[] {
        var index = s.indexOf("=>");
        if (index <= 0)
            return null;
        var sub = s.substr(0, index).trim();
        if (sub.startsWith("(") && sub.endsWith(")")) {
            var sub2 = sub.substr(1, sub.length - 2).trim();
            if (sub2 == "")
                return [];
            var tokens = sub2.split(',').selectInvoke("trim");
            if (tokens.all(this.isValidIdentifier))
                return tokens;
            return null;
        }
        if (this.isValidIdentifier(sub))
            return [sub];
        return null;
    }
}

export interface ParsedFunction {
    body: string;
    prms: string[];
    type: string;
    name: string;
}


export class Rect {
    constructor(public topLeft: Point, public size: Size) {

    }
    get bottomRight(): Point {
        return this.topLeft.add(this.size.toPoint());
    }
    get bottomLeft(): Point {
        return this.topLeft.addY(this.size.height);
    }
    //distanceTo(p: Point): Point {
    //    let dx = Math.abs(p.x - this.topLeft.x) - this.size.width / 2;
    //    let dy = Math.abs(p.y - this.topLeft.y) - this.size.height / 2;
    //    //let dx = Math.max(Math.abs(p.x - this.topLeft.x) - this.size.width / 2, 0);
    //    //let dy = Math.max(Math.abs(p.y - this.topLeft.y) - this.size.height / 2, 0);
    //    return new Point(dx, dy);
    //}
}

export class Size {
    constructor(public width: number, public height: number) {
    }
    toPoint(): Point {
        return new Point(this.width, this.height);
    }
}
export class Point {
    constructor(public x: number, public y: number) { }
    add(p: Point): Point { return new Point(this.x + p.x, this.y + p.y); }
    mul(p: Point): Point { return new Point(this.x * p.x, this.y * p.y); }
    div(p: Point): Point { return new Point(this.x / p.x, this.y / p.y); }
    floor(): Point { return new Point(Math.floor(this.x), Math.floor(this.y)); }
    addY(y: number): Point { return new Point(this.x, this.y + y); }
    subtract(p: Point): Point { return new Point(this.x - p.x, this.y - p.y); }
    min(p: Point): Point { return new Point(Math.min(this.x, p.x), Math.min(this.y, p.y)); }
    max(p: Point): Point { return new Point(Math.max(this.x, p.x), Math.max(this.y, p.y)); }
    isInside(rect: Rect): boolean {
        let p = this;
        let p1 = rect.topLeft;
        let p2 = rect.bottomRight;
        let min = p1.min(p2);
        let max = p1.max(p2);
        if ((min.x <= p.x) && (p.x <= max.x) && (min.y <= p.y) && (p.y <= max.y))
            return true;
        return false;
    }
}

export enum Key {
    CANCEL = 3,
    HELP = 6,
    BACKSPACE = 8,
    TAB = 9,
    CLEAR = 12,
    ENTER = 13,
    //ENTER = 14,
    SHIFT = 16,
    CONTROL = 17,
    ALT = 18,
    PAUSE = 19,
    CAPS_LOCK = 20,
    ESCAPE = 27,
    SPACE = 32,
    PAGE_UP = 33,
    PAGE_DOWN = 34,
    END = 35,
    HOME = 36,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40,
    PRINTSCREEN = 44,
    INSERT = 45,
    DELETE = 46,
    D_0 = 48,
    D_1 = 49,
    D_2 = 50,
    D_3 = 51,
    D_4 = 52,
    D_5 = 53,
    D_6 = 54,
    D_7 = 55,
    D_8 = 56,
    D_9 = 57,
    SEMICOLON = 59,
    EQUALS = 61,
    A = 65,
    B = 66,
    C = 67,
    D = 68,
    E = 69,
    F = 70,
    G = 71,
    H = 72,
    I = 73,
    J = 74,
    K = 75,
    L = 76,
    M = 77,
    N = 78,
    O = 79,
    P = 80,
    Q = 81,
    R = 82,
    S = 83,
    T = 84,
    U = 85,
    V = 86,
    W = 87,
    X = 88,
    Y = 89,
    Z = 90,
    CONTEXT_MENU = 93,
    NUMPAD0 = 96,
    NUMPAD1 = 97,
    NUMPAD2 = 98,
    NUMPAD3 = 99,
    NUMPAD4 = 100,
    NUMPAD5 = 101,
    NUMPAD6 = 102,
    NUMPAD7 = 103,
    NUMPAD8 = 104,
    NUMPAD9 = 105,
    MULTIPLY = 106,
    ADD = 107,
    SEPARATOR = 108,
    SUBTRACT = 109,
    DECIMAL = 110,
    DIVIDE = 111,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123,
    F13 = 124,
    F14 = 125,
    F15 = 126,
    F16 = 127,
    F17 = 128,
    F18 = 129,
    F19 = 130,
    F20 = 131,
    F21 = 132,
    F22 = 133,
    F23 = 134,
    F24 = 135,
    NUM_LOCK = 144,
    SCROLL_LOCK = 145,
    COMMA = 188,
    PERIOD = 190,
    SLASH = 191,
    BACK_QUOTE = 192,
    OPEN_BRACKET = 219,
    BACK_SLASH = 220,
    CLOSE_BRACKET = 221,
    QUOTE = 222,
    META = 224,
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

export interface Collapsable {
    node: AstNode;
    tokens: Token[];
    isCollapsed: boolean;
}

export interface CodeHyperlink {
    node?: AstNode;
    tokens?: Token[];
    href?: string;
    name?: string;
    title?: string;
    className?: string;
    anchorEl?: HTMLAnchorElement;
    target?: string;
    html?: string;
    //tooltip?:TooltipOptions;
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
    generateNumbers(from: number, to: number) {
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


export class CancellablePromise<T> {

    /**
     * Creates a Promise that is resolved with an array of results when all of the provided Promises
     * resolve, or rejected when any Promise is rejected.
     * @param values An array of Promises.
     * @returns A new Promise.
     */
    static all<T>(values: IterableShim<T | PromiseLike<T>>): CancellablePromise<T[]> {
        let p = new CancellablePromise<T[]>(null);
        p.promise = Promise.all(values);
        return p;

    }
    static allVoid<T>(values: IterableShim<T | PromiseLike<T>>): CancellablePromise<void> {
        let p = new CancellablePromise<any>(null);
        p.promise = Promise.all(values);
        return p;
    }

    /**
     * Creates a new Promise.
     * @param executor A callback used to initialize the promise. This callback is passed two arguments:
     * a resolve callback used resolve the promise with a value or the result of another promise,
     * and a reject callback used to reject the promise with a provided reason or error.
     */
    constructor(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        if (executor != null)
            this.promise = new Promise(executor);
    }

    static wrap<T>(value: Promise<T> | T): CancellablePromise<T> {
        if (value instanceof CancellablePromise)
            return value;
        if (value instanceof Promise) {
            let p = new CancellablePromise<T>(null);
            p.promise = value;
            return p;
        }
        let p = new CancellablePromise<T>(null);
        p.promise = Promise.resolve(value);
        return p;
    }

    //wrap<T>(value: Promise<T> | T): CancellablePromise<T> {
    //    let p = CancellablePromise.wrap(value);
    //    this.onCancel.attach(() => p.cancel());
    //}

    promise: Promise<T>;
    onCancel: EventEmitter<any> = new SimpleEventEmitter<any>();
    _isCancelled: boolean;
    cancel() {
        this._isCancelled = true;
        this.onCancel.emit(null);
    }
    isCancelled(): boolean {
        return this._isCancelled;
    }

    /**
    * Attaches callbacks for the resolution and/or rejection of the Promise.
    * @param onfulfilled The callback to execute when the Promise is resolved.
    * @param onrejected The callback to execute when the Promise is rejected.
    * @returns A Promise for the completion of which ever callback is executed.
    */
    then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => TResult | PromiseLike<TResult>): CancellablePromise<TResult> {
        let onfulfilled2;
        let onrejected2;
        if (onfulfilled != null) {
            onfulfilled2 = value => {
                if (this.isCancelled()) {
                    return Promise.reject<TResult>("Promise was cancelled");
                }
                let res = onfulfilled(value);
                if (res instanceof CancellablePromise) {
                    this.onCancel.attach(() => (res as CancellablePromise<TResult>).cancel());
                }
                return res;
            };
        }
        //if (onrejected != null) {
        //    onrejected2 = reason => {
        //        if (this.isCancelled())
        //            return;
        //        return onrejected(reason);
        //    };
        //}
        let p = CancellablePromise.wrap(this.promise.then(onfulfilled2, onrejected));
        p.onCancel.attach(() => this.cancel());
        return p;
    }

    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch(onrejected?: (reason: any) => T | PromiseLike<T>): CancellablePromise<T> {
        let p = new CancellablePromise(null);
        p.promise = this.promise.catch(onrejected);
        p.onCancel.attach(() => this.cancel());
        return p;
    }
    static resolve<T>(value?: T | PromiseLike<T>): CancellablePromise<T> {
        let p = new CancellablePromise(null);
        p.promise = Promise.resolve(value);
        return p;
    }


}


export interface EventEmitter<T> {
    emit(args: T);
    attach(handler: (args: T) => any);
    detach(handler: (args: T) => any);
}

export class SimpleEventEmitter<T> {
    handlers: Array<(args: T) => any> = [];
    emit(args: T) {
        this.handlers.forEach(h => h(args));
    }
    attach(handler: (args: T) => any) {
        this.handlers.add(handler);
    }
    detach(handler: (args: T) => any) {
        this.handlers.remove(handler);
    }
}

