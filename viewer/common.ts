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
    static compileTemplateString(s: string) {
        if (s.startsWith("{{") && s.endsWith("}}")) {
            let code = s.substring(2, s.length - 2);
            return this.compileTemplateExpression(code);
        }
        return null;
    }
    static compileTemplateExpression(code: string) {
        let parsed = FunctionHelper.parse(code);
        if (parsed != null && parsed.type == "ArrowExpressionFunction") {
            let body = parsed.body;
            let prmsAndBody = parsed.prms.toArray();
            prmsAndBody.push("return " + body);
            let func = Function.apply(null, prmsAndBody);
            return func;
        }
        let func = new Function("___", "return ___." + code);
        return func;
    }

    static dataBind(node: Node, obj: any, thisContext: any) {
        if (node.nodeType == 3) {
            let s = node.nodeValue;
            if ((node.nextSibling != null || node.previousSibling != null) && s.trim() == "") {
                node.parentElement.removeChild(node);
                return;
            }
            let func = this.compileTemplateString(s);
            if (func != null)
                node.nodeValue = func(obj);
        }
        else {
            let el = <HTMLElement>node;
            let ignoreAtt = el.getAttribute("_ignore");
            if (ignoreAtt != null)
                return;
            let ifAtt = el.getAttribute("_if");
            let forAtt = el.getAttribute("_for");
            if (ifAtt != null) {
                let func = this.compileTemplateExpression(ifAtt);
                let res = func(obj);
                if (!res) {
                    el.style.display = "none";
                    return;
                }
                else {
                    el.style.display = "";
                }
            }
            if (forAtt != null) {
                let sourceFunc = this.compileTemplateExpression(forAtt);
                let source = sourceFunc(obj);
                this.repeat(el, source, thisContext);
                return;
            }
            let atts = Array.from(node.attributes);
            atts.forEach(att => {
                if (att.name.startsWith("_")) {
                    if (att.name.startsWith("_on")) {
                        let func = this.compileTemplateExpression(att.value);
                        let evName = att.name.substr(3);
                        let evFullName = evName + ".templator";
                        $(el).off(evFullName).on(evFullName, e => func.call(thisContext, e, obj));
                    }
                    return;
                }
                let func = this.compileTemplateString(att.value);
                if (func != null) {
                    let res = func(obj);
                    let propName = att.name;
                    if (propName == "class")
                        propName = "className";
                    node[propName] = res;
                }
            });
            Array.from(node.childNodes).forEach(t => this.dataBind(t, obj, thisContext));
        }
    }
    static repeat(el: any, list: any[], thisContext: any) {
        let el2: JQuery;
        if (typeof (el) == "string")
            el2 = $(el + ".template");
        else
            el2 = $(el);

        if (el2.length == 0) {
            console.warn("can't find template", el);
            return;
        }
        el2.siblings(".template-instance").remove();
        if (list != null) {
            let els = list.select(obj => {
                let el3 = el2.clone().removeAttr("_for");
                let el4 = el3[0];
                this.dataBind(el4, obj, thisContext);
                el3.removeClass("template").addClass("template-instance");
                return el4;
            });
            el2.after(els);
        }
    }
    static initTemplate(el: HTMLElement, ctl: Object) {
        this.dataBind(el, ctl, ctl);
    }

    static initTemplate2(el: HTMLElement, ctl: Object) {
        let tracker = new ChangeTracker(ctl);
        tracker.enter = e => {
            if (e.value == null)
                return true;
            let ctor = e.value.constructor;
            let allowed: any[] = [Object, Array, Number, Boolean, String, Function];
            let enter = allowed.contains(ctor);
            return enter;
        };
        tracker.init();


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
    node?: AstNode;
    name?: string;
    resolvedIncludePath?: string;
    resolved: PerlModuleClassify;
}



export interface Expander {
    toggle(collapsed?: boolean);
    isCollapsed(): boolean;
}


class FunctionHelper {
    static parse(s: string): ParsedFunction {
        var prms = this.parseArrowFunctionArgNames(s);
        if (prms != null) {
            var arrowEnd = s.indexOf("=>") + 2;
            var body = s.substr(arrowEnd);
            var type = "ArrowExpressionFunction";
            if (body.trim().startsWith("{"))
                type = "ArrowFunction";

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

interface ParsedFunction {
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
    BACK_SPACE = 8,
    TAB = 9,
    CLEAR = 12,
    RETURN = 13,
    ENTER = 14,
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


