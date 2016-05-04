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
    static compileTempalteString(s: string) {
        if (s.startsWith("{{") && s.endsWith("}}")) {
            let code = s.substring(2, s.length - 2);
            let func = new Function("___", "return ___." + code);
            return func;
        }
        return null;
    }
    static dataBind(node: Node, obj: any) {
        if (node.nodeType == 3) {
            let func = this.compileTempalteString(node.nodeValue);
            if (func != null)
                node.nodeValue = func(obj);
        }
        else {
            let atts = Array.from(node.attributes);
            atts.forEach(att => {
                let func = this.compileTempalteString(att.value);
                if (func != null) {
                    let res = func(obj);
                    node[att.name] = res;
                }
            });
            Array.from(node.childNodes).forEach(t => this.dataBind(t, obj));
        }
    }
    static repeat(el: any, list: any[]) {
        let el2 = $(el);
        el2.parent().children(".template-instance").remove();
        el2.parent().append(list.select(obj => {
            let el3 = el2.clone().removeClass("template").addClass("template-instance");
            let el4 = el3[0];
            this.dataBind(el4, obj);
            return el4;
        }));
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

export declare class Tooltip {
    constructor(opts?: TooltipOptions);
}

export declare interface TooltipOptions {
    target: any;
    position?: string;
    content?: any;
    classes?: string;
}

export interface Expander {
    toggle(collapsed?: boolean);
    isCollapsed(): boolean;
}