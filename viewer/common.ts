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
import {ChangeTracker} from "./monitor";

export class Helper {
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
                    node[att.name] = res;
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
                let el3 = el2.clone().removeClass("template").removeAttr("_for");
                let el4 = el3[0];
                this.dataBind(el4, obj, thisContext);
                el3.addClass("template-instance");
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


    static isElementInViewport(el:HTMLElement) {
        ////special bonus for those using jQuery
        //if (typeof jQuery === "function" && el instanceof jQuery) {
        //    el = el[0];
        //}

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






export class CvLine {
    //lineCodeEl: HTMLElement;
    lineNumberEl: HTMLElement;
    tokens: Token[];
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
}


/*
TODO:

-- integrate real web server
-- builtin functions - send to perldoc.perl.org/...
-- perl operators - send to perlop
-- unresolved packages send to metacpan
-- anchor sub routines and support deep linking

optimize IndexRange to use math instead of arrays
variable hyperlinking
use web service to resolve packages
keyboard support
-- code collapsing


Stevan:
implmement perldoc api: perldoc -T -o html -f return

*/


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

