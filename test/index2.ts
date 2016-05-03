/// <reference path="../src/extensions.ts" />
"use strict";

import {Token, TokenType, File2, } from "../src/token";
import {AstWriter} from "../src/ast-writer";
import {ParserBase} from "../src/parser-base";
import {ExpressionParser} from "../src/expression-parser";
import {Parser} from "../src/parser";
import {
    AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
    BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
    ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
    NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
    Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
    ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
    HasArrow, HasLabel,
    AstQuery
} from "../src/ast";
import {PrecedenceResolver} from "../src/precedence-resolver";
import {TokenTypes} from "../src/token-types";
import {Tokenizer} from "../src/tokenizer";
import {safeTry, TokenReader, Logger, AstNodeFixator} from "../src/utils";
import "../src/extensions";
import {RefArrayToRefUtil} from "../src/refactor";
import {ExpressionTester, EtReport, EtItem} from "../src/expression-tester";
import {P5Service, P5File} from "./p5-service";

export class IndexPage {
    constructor() {
        this.lines = [];
        this.selection = new IndexSelection();
        let win: any = window;
        win._page = this;
        this.service = new P5Service();
        //this.service.src("README.md").then(e=>console.log(e));
    }
    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();
    tbUrl: JQuery;
    tbRegex: JQuery;
    urlKey: string;
    code: string;
    firstTime: boolean = true;
    //rawFilesBaseUrl = "http://localhost/";//"https://raw.githubusercontent.com/";
    cvBaseUrl = "/";
    lines: CvLine[];
    selection: IndexSelection;
    includes = [
        "lib/",
    ];

    service: P5Service;
    //httpGet(url: string): Promise<string> {
    //    return this.service.src(url);
    //    //return new Promise<string>((resolve, reject) => $.get(url).done(resolve).fail(reject));
    //}

    flattenArray<T>(list: Array<T | Array<T>>): T[] {
        let list2: T[] = [];
        list.forEach(t => {
            if (t instanceof Array)
                list2.addRange(this.flattenArray(t));
            else
                list2.add(<T>t);
        });
        return list2;
    }
    urlJoin(parts: Array<string | string[]>): string {
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
    getCvUrlForIncludeAndPacakge(include: string, packageName: string) {
        let url = this.urlJoin([this.cvBaseUrl, include, packageName.split("::")]) + ".pm";
        return url;
    }
    resolvePackageWithInclude(packageName: string, include: string): Promise<string> {
        let url = this.urlJoin([include, packageName.split("::")]) + ".pm";
        return this.service.fs(url).then(t => include);
    }

    resolvePackage(pkg: PackageResolution): Promise<string> {
        let funcs = this.selectAsyncFuncs(this.includes, t => this.resolvePackageWithInclude(pkg.name, t));
        return this.firstSuccess(funcs).catch(t => null).then(t => pkg.resolvedIncludePath = t);
    }

    selectAsyncFuncs<T, R>(list: T[], selector: (item: T) => Promise<R>): Array<AsyncFunc<R>> {
        return list.map(t => () => selector(t));
    }
    firstSuccess<T>(funcs: Array<AsyncFunc<T>>): Promise<T> {
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



    main() {
        console.log(window.location.pathname);
        this.tbUrl = $("#tbUrl");
        this.tbUrl.val(window.location.pathname);
        this.urlKey = "perl-parser\turl";
        this.tbRegex = $("#tbRegex");
        $("#btnRefactor").click(e => this.refactor());
        $("#btnTestExpressions").click(e => this.testExpressions());

        this.tbRegex.keyup(e => {
            let s = this.tbRegex.val();
            try {
                let regex = new Function("return " + s + ";")();
                let res = regex.exec(this.code);
                if (res instanceof Array)
                    console.log(JSON.stringify(res[0]), { regex: res });
                else
                    console.log(res);
            }
            catch (e) {
                console.log(e);
            }
        });
        //let lastUrl = localStorage[this.urlKey];
        //if (lastUrl != null && lastUrl != "")
        //    this.tbUrl.val(lastUrl);
        this.tbUrl.change(e => this.update());
        $("#cbAddParentheses").change(e => this.update());
        $("#cbDeparseFriendly").change(e => this.update());
        $(".line-numbers").mousedown(e => this.onLineNumberMouseDown(e));
        //$(".line-numbers").mousemove(e => this.onLineNumberMouseMove(e));
        //$(".line-numbers").mouseenter(e => console.log(e));
        //$(".line-numbers").mouseleave(e => console.log(e));
        $(".line-numbers").mouseover(e => this.onLineNumberMouseOver(e));
        //$(".line-numbers").mouseout(e => console.log(e));
        $(".line-numbers").mouseup(e => this.onLineNumberMouseUp(e));
        this.selection.fromParam(location.hash.substr(1));

        this.update();
        $(window).on("urlchange", e => this.update());
    }

    getLineFromLineNumberEl(el: HTMLElement) {
        if (el == null || !$(el).is(".line-number"))
            return null;
        let line = parseInt(el.textContent);
        if (isNaN(line))
            return null;
        return line;
    }
    onLineNumberMouseDown(e: JQueryMouseEventObject) {
        if (e.which != 1)
            return;
        if (!$(e.target).hasClass("line-number"))
            return;
        let line = this.getLineFromLineNumberEl(<HTMLElement>e.target);
        if (line == null)
            return;
        e.preventDefault();
        this.isMouseDown = true;
        let shift = e.shiftKey;
        let ctrl = e.ctrlKey;
        this.clickLine(line, ctrl, shift);
    }

    isMouseDown = false;
    onLineNumberMouseOver(e: JQueryMouseEventObject) {
        if (!this.isMouseDown)
            return;
        let line = this.getLineFromLineNumberEl(<HTMLElement>e.target);
        if (line == null)
            return;
        let range = this.selection.lastRange;
        if (range == null)
            return;
        if (range.to == line)
            return;
        e.preventDefault();
        range.to = line;
        this.renderSelection();
        this.saveSelection();


        //if (this.renderSelectionTimeout != null) {
        //    window.clearTimeout(this.renderSelectionTimeout);
        //    this.renderSelectionTimeout = null;
        //}
        //this.renderSelectionTimeout = window.setTimeout(t => { this.renderSelectionTimeout = null; this.renderSelection(); }, 0);
    }
    renderSelectionTimeout: number;


    onLineNumberMouseUp(e: JQueryMouseEventObject) {
        this.isMouseDown = false;
    }
    clickLine(line: number, ctrl: boolean, shift: boolean) {
        this.selection.click(line, ctrl, shift);
        this.renderSelection();
        this.saveSelection();
    }
    saveSelection() {
        history.replaceState(undefined, undefined, "#" + this.selection.toParam());
        $(window).trigger("urlchange");
        //location.hash = this.selection.toParam();
        //console.log(this.selection.toParam());
    }

    renderSelection() {
        let obj: { [key: string]: boolean } = {};
        this.selection.getSelectedIndexes().forEach(t => obj[t] = true);
        let node = <HTMLElement>$(".line-numbers")[0].firstChild;
        let index = 1;
        while (node != null) {
            $(node).toggleClass("selected", obj[index] == true);
            node = <HTMLElement>node.nextSibling;
            index++;
        }
    }

    getUrl() {
        let path = window.location.pathname;
        return path;
    }

    compileTempalteString(s: string) {
        if (s.startsWith("{{") && s.endsWith("}}")) {
            let code = s.substring(2, s.length - 2);
            let func = new Function("___", "return ___." + code);
            return func;
        }
        return null;
    }
    dataBind(node: Node, obj: any) {
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
    repeat(el: any, list: any[]) {
        let el2 = $(el);
        el2.parent().children(".template-instance").remove();
        el2.parent().append(list.select(obj => {
            let el3 = el2.clone().removeClass("template").addClass("template-instance");
            let el4 = el3[0];
            this.dataBind(el4, obj);
            return el4;
        }));
    }
    file: P5File;
    lastUrl: string;
    update() {
        let url = this.getUrl();
        if (this.lastUrl == url)
            return;
        console.log("rendering", url);
        this.lastUrl = url;
        //if (url == null || url.length == 0)
        //    return;
        this.service.fs(url).then(t => this.file = t).then(() => {
            if (this.file.children != null) {
                this.file.children.forEach(t => t.name = t.path);
                this.file.children.forEach(t => t.path = this.urlJoin([url, t.path]));
                this.file.children = this.file.children.orderBy([t => !t.is_dir, t => t.name]);
                this.repeat(".child", this.file.children);
                console.log("TODO: implement directory browser", this.file);
            }
            else {
                this.service.src(url).then(data => {
                    this.file.src = data;
                    this.parse(url, data);
                });
            }
            $(".dir-view").toggleClass("active", this.file.children != null);
            $(".code-view").toggleClass("active", this.file.children == null);
        });
    }


    getLineEl(line: number): HTMLElement {
        return <HTMLElement>$(".line-numbers")[0].childNodes.item(line - 1);
    }
    renderLineNumbers() {
        let lineNumbers = $(".line-numbers").empty()[0];
        let count = this.code.lines().length;
        for (let i = 0; i < count; i++) {
            let div = document.createElement("div");
            div.className = "line";
            let div3 = document.createElement("div");
            div3.className = "line-overlay";
            let div2 = document.createElement("div");
            div2.className = "line-number";
            div.appendChild(div3);
            div.appendChild(div2);
            $.create(".expander-container").appendTo(div);
            div2.textContent = (i + 1).toString();
            lineNumbers.appendChild(div);//$.create("div").text(i + 1));
        }
    }

    unit: Unit;
    tokens: Token[];
    generatedCode: string;

    parse(filename: string, data: string) {
        //if (localStorage.getItem("pause") == "1" && this.firstTime) {
        //    console.warn("not running parse, last time crashed unexpectedly");
        //    this.firstTime = false;
        //    return;
        //}
        this.firstTime = false;
        this.code = data;
        let codeEl = $(".code").empty().text(data);
        $(".ta-code").val(data);
        let file = new File2(filename, data);
        let tok = new Tokenizer();
        tok.file = file;
        localStorage.setItem("pause", "1");
        tok.main();
        let parser = new Parser();
        parser.logger = new Logger();
        parser.reader = new TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = tok.tokens;
        parser.init();

        this.tokens = tok.tokens;
        this.renderTokens();

        var statements = parser.parse();
        let unit = new Unit();
        unit.statements = statements;
        this.unit = unit;
        console.log(unit);
        new AstNodeFixator().process(this.unit);
        this.resolveAndHighlightUsedPackages();
        this.navigateToHash();
    }
    navigateToHash() {
        let hash = window.location.hash.substr(1);
        if (hash == "")
            return;
        let el = $("a[name='" + hash + "']:visible").first();
        if (el.length == 0) {
            el = $(".line.selected");
            if (el.length > 0)
                el[0].scrollIntoView();
            return;
        }
        el.focus();
    }

    testExpressions(): Promise<EtReport> {
        let tester = new ExpressionTester();
        //let expressions: string[] = [];
        //tester.onExpressionFound = e => {
        //    expressions.push(e.code);
        //    //console.log("onExpressionFound", expressions.length);
        //    //fs.writeFileSync(expressionsFilename, expressions.select(t=> t.trim()).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]).join("\n------------------------------------------------------------------------\n"));
        //};
        return tester.testUnit(this.unit).then(list => {
            console.log("Finished", list);
            console.log("Finished: ", list.where(t => t.success).length, "/", list.length);
            let report = new EtReport();
            report.items = list;
            return report;
            //report.filename = expressionsFilename;
            //report.loadSync(fs);
            //report.items.addRange(list);
            //report.cleanup();
            //if (this.save) {
            //    console.log("merging and saving results");
            //    report.saveSync(fs);
            //}
            //return report;

            //let expressions = list.select(t=> t.code).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]);
            //let reports = expressions.select(s=> list.first(x=> x.code == s));
            //console.log("SAVING");
            //return fs.writeFileSync(expressionsFilename, reports.select(t=> [JSON.stringify({success:t.success}), t.code, t.dprs, t.mine].join("\n")).join("\n------------------------------------------------------------------------\n"));
        });
        //console.log("DONE");//, unit);

    }


    generateCode() {
        new AstNodeFixator().process(this.unit);

        let writer = new AstWriter();
        writer.addParentheses = $("#cbAddParentheses").prop("checked");
        writer.deparseFriendly = $("#cbDeparseFriendly").prop("checked");

        writer.main();
        writer.write(this.unit);
        this.generatedCode = writer.sb.join("");
    }

    getLine(line: number): CvLine {
        return this.lines[line - 1];
    }
    render() {
        $(".code").empty().text(this.code);
        this.renderTokens();
    }

    splitNewLineTokens() {
        let list: Token[] = [];
        this.tokens.forEach(token => {
            if (token.is(TokenTypes.whitespace) && token.value.contains("\n") && token.value != "\n") {
                let s = token.value;
                while (s.length > 0) {
                    if (s[0] == "\n") {
                        let newLineToken = TokenTypes.whitespace.create2("\n");
                        list.push(newLineToken);
                        s = s.substring(1);
                    }
                    else {
                        let index = s.indexOf("\n");
                        if (index > 0) {
                            let part = s.substring(0, index - 1);
                            let whitespaceToken = TokenTypes.whitespace.create2(part);
                            list.push(whitespaceToken);
                            let whitespaceToken2 = TokenTypes.whitespace.create2("\n");
                            list.push(whitespaceToken2);
                            s = s.substring(index + 1);
                        }
                        else {
                            let whitespaceToken = TokenTypes.whitespace.create2(s);
                            list.push(whitespaceToken);
                            s = "";
                        }
                    }
                }
                return;
            }
            else {
                list.push(token);
            }
        });
        this.tokens = list;
    }
    renderTokens() {
        let codeEl = $(".code")[0];
        codeEl.innerHTML = "";
        this.lines.clear();
        if (this.tokens == null || this.tokens.length == 0)
            return;
        this.splitNewLineTokens();

        let line = new CvLine();
        //line.lineCodeEl = document.createElement("div");
        //codeEl.appendChild(line.lineCodeEl);
        this.lines.add(line);
        this.tokens.forEach(token => {
            //if (token.is(TokenTypes.whitespace) && token.value == "\n") {
            //    if (line.lineCodeEl.firstChild == null)
            //        line.lineCodeEl.textContent = "\n";
            //    line = new CvLine();
            //    line.lineCodeEl = document.createElement("div");
            //    line.lineCodeEl.className = "line";
            //    //div.textContent = token.value;
            //    codeEl.appendChild(line.lineCodeEl);
            //    this.lines.add(line);
            //    this.tokenToElement.set(token, line.lineCodeEl);
            //}
            //else {
            let span = document.createElement("span");
            span.className = token.type.name;
            span.textContent = token.value;
            //line.lineCodeEl.appendChild(span);
            codeEl.appendChild(span);
            this.tokenToElement.set(token, span);
            //}
        });
        this.renderLineNumbers();
        this.renderSelection();

    }

    refactor() {
        new AstNodeFixator().process(this.unit);
        //new FindEvalsWithout1AtTheEnd().process(this.unit);
        new RefArrayToRefUtil(this.unit).process();
        this.generateCode();
        this.render();
    }

    onMouseOverNode(e: Event, node: TreeNodeData) {
        $(".selected").removeClass("selected");
        //let obj = node.obj;
        //if (obj == null)
        //    return;
        //if (!(obj instanceof AstNode))
        //    return;
        let tokens = this.getTokens(node.value, true);
        if (tokens.length == 0)
            tokens = this.getTokens(node.obj, true);

        //let astNode = <AstNode>obj;
        $(e.target).closest(".self").addClass("selected");
        tokens.forEach(token => $(this.tokenToElement.get(token)).addClass("selected"));
        let el = this.tokenToElement.get(tokens[0]);
        if (el != null) {
            let div = $(".code")[0];
            let top = div.scrollTop;
            let bottom = div.scrollTop + div.offsetHeight;
            let top2 = el.offsetTop;
            let bottom2 = el.offsetTop + el.offsetHeight;
            if (top2 < top)
                div.scrollTop = top2;
            else if (bottom2 > bottom)
                div.scrollTop = top2;
        }
    }

    createInstanceNode(obj: Object) {
        if (typeof (obj) != "object") {
            let anp2: TreeNodeData = { text: obj.constructor.name, value: obj, children: [] };
            return anp2;
        }
        let anp: TreeNodeData = { text: obj.constructor.name, obj: obj, children: [] };
        if (obj instanceof Token) {
            anp.text = obj.type.name + " { Token }";
            return anp;
        }
        anp.children = Object.keys(obj).select(prop => this.createPropertyNode(obj, prop)).exceptNulls();
        return anp;
    }

    createPropertyNode(parentObj: Object, prop: string) {
        if (["parentNode", "parentNodeProp", "tokens", "token", "isStatement", "isExpression"/*, "whitespaceBefore", "whitespaceAfter"*/].contains(prop))
            return null;
        let anp: TreeNodeData = { prop: prop, text: prop, obj: parentObj, children: [], value: parentObj[prop] };
        if (anp.value == null)
            return anp;
        if (typeof (anp.value) == "object") {
            if (anp.value instanceof Array)
                anp.children = anp.value.select(t => this.createInstanceNode(t));
            else
                anp.children = [this.createInstanceNode(anp.value)];
        }
        return anp;

    }


    getTokens(obj: any, deep: boolean): Token[] {
        if (obj == null)
            return [];
        if (typeof (obj) != "object")
            return [];
        if (obj instanceof Token) {
            return [obj];
        }
        else if (obj instanceof Array) {
            if (deep)
                return obj.select(t => this.getTokens(t, false));
            return obj.where(t => t instanceof Token);
        }
        else { // if (obj instanceof AstNode)
            if (deep)
                return Object.keys(obj).selectMany(value => this.getTokens(obj[value], false));
            return [];
        }
        //console.log("can't getTokens for", obj);
        //return null;
    }

    resolveAndHighlightUsedPackages() {
        let pkgRefs = this.findPackageRefs(this.unit);
        console.log(pkgRefs.select(t => t.toCode().trim()).distinct());
        let inUse: NamedMemberExpression[] = [];
        let refs: NamedMemberExpression[] = [];
        let builtins: NamedMemberExpression[] = [];
        let pragmas: NamedMemberExpression[] = [];
        pkgRefs.forEach(t => {
            let name = t.toCode().trim();
            if (this.isInsideUse(t)) {
                if (TokenTypes.pragmas.contains(name))
                    pragmas.push(t);
                else
                    inUse.push(t);
            }
            else if (TokenTypes.builtinFunctions.contains(name)) {
                builtins.push(t);
            }
            else
                refs.push(t);
        });

        let subs = this.findSubs();
        subs.where(t => t.name != null).forEach(node => {
            let name = node.name.toCode().trim();
            this.hyperlinkNode(node.name, "#sub:" + name, "sub:" + name);
        });
        builtins.forEach(node => {
            let name = node.toCode().trim();
            this.hyperlinkNode(node, "http://perldoc.perl.org/functions/" + name + ".html", name, "(builtin function) " + name);
        });
        pragmas.forEach(node => {
            let name = node.toCode().trim();
            this.hyperlinkNode(node, "http://perldoc.perl.org/" + name + ".html", name, "(pragma) " + name);
        });

        //let resolutions = this.findUsedPackages(this.unit).select(node => <PackageResolution>{ node: node });
        let resolutions: PackageResolution[] = inUse.select(node => ({ node: node, name: node.toCode().trim() }));
        resolutions.forEach(pkg => {
            this.resolvePackage(pkg)
                .then(t => {
                    //console.log(pkg);
                    let href = null;//"#"+pkg.name;//null;
                    if (pkg.resolvedIncludePath != null)
                        href = this.getCvUrlForIncludeAndPacakge(pkg.resolvedIncludePath, pkg.name);
                    else
                        href = "https://metacpan.org/pod/" + pkg.name;
                    this.hyperlinkNode(pkg.node, href, pkg.name, "(package) " + pkg.name, "package-name");
                });
        });
        let packages = resolutions.select(t => t.name);
        refs.forEach(node => {
            let pkg = node.toCode();
            let pkg2 = resolutions.first(t => t.name == pkg);
            if (pkg2 != null) {
                this.hyperlinkNode(node, "#" + pkg);
            }
        });
        subs.forEach(sub => {
            let x = this.collectTokens2(sub.block);
            this.collapsable(null, x);
        });
    }


    hyperlinkNode(node: AstNode, href: string, name?: string, title?: string, css?: string) {
        let tokens = this.collectTokens2(node);
        let els = tokens.select(token => this.tokenToElement.get(token));
        if ($(els).closest("a").length > 0) {
            console.warn("already hyperlinked");
            return;
        }
        if ($(els[0]).closest("a").length > 0) {
            console.warn("already hyperlinked 2");
            return;
        }
        //console.log("hyperlinkNode", els);
        let a = $.create("a").insertBefore(els[0]);
        if (title != null)
            a.attr("title", title);
        if (css != null)
            a.addClass(css);
        a.data("AstNode", node);
        a.append(els);
        a.attr({ href, name });
    }

    highlightNode(node: AstNode) {
        let tokens = this.collectTokens2(node);
        tokens.forEach(token => {
            let el = this.tokenToElement.get(token);
            el.classList.add("highlight");
        });
    }


    findUsedPackages(node: AstNode): Expression[] {
        return new AstQuery(node).getDescendants().ofType(InvocationExpression).where(t => t.target instanceof NamedMemberExpression && (<NamedMemberExpression>t.target).name == "use").select(t => t.arguments);
    }
    findPackageRefs(node: AstNode): NamedMemberExpression[] {
        return new AstQuery(node).getDescendants().ofType(NamedMemberExpression).where(t => this.isPackageName(t));
    }
    findSubs(): SubroutineExpression[] {
        return new AstQuery(this.unit).getDescendants().ofType(SubroutineExpression);
    }
    isPackageName(node: NamedMemberExpression): boolean {
        if (node.arrow)
            return false;
        if (node.token.is(TokenTypes.sigiledIdentifier))
            return false;
        if (node.parentNode instanceof NamedMemberExpression && node.parentNodeProp == "target")
            return false;
        return true;
    }

    isInsideUse(node: Expression): boolean {
        let parent = node.parentNode;
        let parentProp = node.parentNodeProp;
        if (parent instanceof InvocationExpression && node.parentNodeProp == "target") {
            parentProp = parent.parentNodeProp;
            parent = parent.parentNode;
        }
        if (parent instanceof InvocationExpression && parentProp == "arguments") {
            let target = parent.target;
            if (target instanceof NamedMemberExpression && target.name == "use")
                return true;
        }
        return false;
    }


    collectTokens2(obj: any): Token[] {
        let list = this.collectTokens(obj);
        if (list.length <= 1)
            return list;
        let list2 = this.getTokenRange(list.first(), list.last());
        return list2;
    }

    collectTokens(obj: any): Token[] {
        let tokens: Token[] = [];
        this._collectTokens(obj, tokens);
        return tokens;
    }
    _collectTokens(obj: any, tokens: Token[]) {
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

    getTokenRange(from: Token, until: Token) {
        let start = this.tokens.indexOf(from);
        let end = this.tokens.indexOf(until);
        if (start < 0 || end < 0)
            return null;
        return this.tokens.slice(start, end+1);
    }


    wrap(wrapper: HTMLElement, els: HTMLElement[]) {
        $(els[0]).before(wrapper);
        $(wrapper).append(els);
    }

    collapsable(anchorTokens: Token[], collapsibleTokens: Token[]) {
        while(collapsibleTokens.last().is(TokenTypes.whitespace, "\n"))
            collapsibleTokens.removeLast();
        let lineStart = collapsibleTokens[0].range.start.line;
        let lineEnd = collapsibleTokens.last().range.end.line;
        //console.log(collapsibleTokens.where(t => t.value.contains("\n")).select(t => this.tokenToElement.get(t)));
        let range = collapsibleTokens.select(t => this.tokenToElement.get(t)).exceptNulls();
        let span = $.create("span.collapsable");
        this.wrap(span[0], range);
        let lineStartEl = $(this.getLineEl(lineStart));
        let lineEndEl = $(this.getLineEl(lineEnd));

        let btnExpander = lineStartEl.getAppend(".expander-container").getAppend("button.expander.expanded");
        let toggle = () => {
            span.toggleClass("collapsed");
            let collapsed = span.hasClass("collapsed");
            btnExpander.toggleClass("collapsed", collapsed);
            //btnExpander.toggleClass("expanded", !collapsed);
            Array.generateNumbers(lineStart + 1, lineEnd).forEach(line => $(this.getLineEl(line)).toggleClass("collapsed", collapsed)); //TODO: inner collapsing (subs within subs will not work correctly)
        };

        btnExpander.mousedown(e => toggle());
        //toggle();
    }



}
function stringifyNodes(node) {
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


interface TreeNodeData {
    obj?: Object;
    prop?: string;
    value?: any;
    text: string;
    children: TreeNodeData[];
}





export function main() {
    //$(window).on("urlchange", e => console.log("onurlchange", e));

    window.onpopstate = e => {
        e.preventDefault();
        //console.log(e);
        $(window).trigger("urlchange");
        //if (e.state) {
        //    document.getElementById("content").innerHTML = e.state.html;
        //    document.title = e.state.pageTitle;
        //}
    };

    $(document.body).click(e => {
        if (e.target.nodeName == "A") {
            e.preventDefault();
            let href = e.target.getAttribute("href");
            window.history.pushState("", "", href);
            $(window).trigger("urlchange");
        }
    });

    new IndexPage().main();
    $(".loading").css({ display: "none" });
}


class CvLine {
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

interface AsyncFunc<T> {
    (): Promise<T>;
}


interface PackageResolution {
    node?: AstNode;
    name?: string;
    resolvedIncludePath?: string;
}

$(main);


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
code collapsing


Stevan:
implmement perldoc api: perldoc -T -o html -f return

*/