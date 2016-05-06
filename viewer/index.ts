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
import {CvLine, IndexSelection, PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper} from "./common";

import "../src/extensions";
import {RefArrayToRefUtil} from "../src/refactor";
import {ExpressionTester, EtReport, EtItem} from "../src/expression-tester";
import {P5Service, P5File} from "./p5-service";

export class IndexPage {
    constructor() {
        this.lines = [];
        this.selection = new IndexSelection();
        let win: any = window;
        this.service = new P5Service();
    }

    tbUrl: JQuery;
    tbRegex: JQuery;
    urlKey: string;
    code: string;
    firstTime: boolean = true;
    cvBaseUrl = "/";
    lines: CvLine[];
    selection: IndexSelection;
    service: P5Service;
    file: P5File;
    lastUrl: string;
    isAllCollapsed: boolean;
    isMouseDown = false;
    unit: Unit;
    tokens: Token[];
    generatedCode: string;
    
    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();
    includes = [
        "lib/",
    ];

    getCvUrlForIncludeAndPacakge(include: string, packageName: string) {
        let url = Helper.urlJoin([this.cvBaseUrl, include, packageName.split("::")]) + ".pm";
        return url;
    }
    
    resolvePackageWithInclude(packageName: string, include: string): Promise<string> {
        let url = Helper.urlJoin([include, packageName.split("::")]) + ".pm";
        return this.service.fs(url).then(t => include);
    }

    resolvePackage(pkg: PackageResolution): Promise<string> {
        let funcs = Helper.selectAsyncFuncs(this.includes, t => this.resolvePackageWithInclude(pkg.name, t));
        return Helper.firstSuccess(funcs).catch(t => null).then(t => pkg.resolvedIncludePath = t);
    }

    main() {
        console.log(window.location.pathname);
        $(".menu").getAppend("button.btnCritique").text("Critique").click(e => this.critique());
        $(".menu").getAppend("button.btnExpandOrCollapseAll").text("Expand/Collapse").click(e => this.expandOrCollapseAll());
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
        this.tbUrl.change(e => this.update());
        $("#cbAddParentheses").change(e => this.update());
        $("#cbDeparseFriendly").change(e => this.update());
        $(".line-numbers").mousedown(e => this.onLineNumberMouseDown(e));
        $(".line-numbers").mouseover(e => this.onLineNumberMouseOver(e));
        $(".line-numbers").mouseup(e => this.onLineNumberMouseUp(e));
        this.selection.fromParam(location.hash.substr(1));

        this.update();
        $(window).on("urlchange", e => this.update());
    }

    expandOrCollapseAll() {
        this.isAllCollapsed = !this.isAllCollapsed;
        this.getExpanders().forEach(t => t.toggle(this.isAllCollapsed));
    }
    critique() {
        this.service.critique(this.file.path).then(res => {
            console.log(res);
            res.violations.forEach(violation => {
                let pos = new File2Pos();
                pos.line = violation.source.location.line;
                pos.column = violation.source.location.column;
                let tokens = this.findTokens(pos, violation.source.code.length);
                if (tokens == null)
                    return;
                tokens.forEach(token => {
                    let el = this.tokenToElement.get(token);
                    if (el == null)
                        return;
                    $(el).addClass("hl hl-violation");
                    new Tooltip({
                        target: el,
                        position: 'bottom left',
                        content: `${violation.description} ${violation.severity} ${violation.policy}`,
                        classes: 'tt tt-violation'
                    });
                });
            });
        });
    }

    findTokens(pos: File2Pos, length: number): Token[] {
        let token = this.findToken(pos);
        if (token == null)
            return [];
        let index = this.tokens.indexOf(token);
        let took = 0;
        let list = this.tokens.skip(index).takeWhile(t => {
            took += t.value.length;
            if (took >= length)
                return false;
            return true;
        });
        return list;

    }
    findToken(pos: File2Pos): Token {
        return this.tokens.first(t => t.range != null && t.range.start.line == pos.line && t.range.start.column == pos.column);
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
                this.file.children.forEach(t => t.path = Helper.urlJoin([url, t.path]));
                this.file.children = this.file.children.orderBy([t => !t.is_dir, t => t.name]);
                Helper.repeat(".child", this.file.children);
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


    lineNumbersEl: HTMLElement;
    getLineEl(line: number): HTMLElement {
        return <HTMLElement>this.lineNumbersEl.childNodes.item(line - 1);
    }
    lineTemplate:JQuery;
    renderLineNumbers() {
        if(this.lineTemplate==null)
            this.lineTemplate = $(".line").first().remove();
        
        this.lineNumbersEl = $(".line-numbers").empty()[0];
        this.lines.forEach((line,i) => {
            let div = this.lineTemplate.clone();
            div.find(".line-number").text((i + 1).toString());
            this.lineNumbersEl.appendChild(div[0]);
        });
    }


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
        this.sourceFile = new File2(filename, data);
        let tok = new Tokenizer();
        tok.file = this.sourceFile;
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
    sourceFile: File2;
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
        line.tokens = [];
        this.lines.add(line);
        this.tokens.forEach(token => {
            line.tokens.push(token);
            if (token.is(TokenTypes.whitespace) && token.value == "\n") {
                line = new CvLine();
                line.tokens = [];
                this.lines.add(line);
            }
        });
        this.tokens.forEach(token => {
            let span = document.createElement("span");
            span.className = token.type.name;
            span.textContent = token.value;
            codeEl.appendChild(span);
            this.tokenToElement.set(token, span);
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
            this.collapsable(x);
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
        return this.tokens.slice(start, end + 1);
    }


    wrap(wrapper: HTMLElement, els: HTMLElement[]) {
        $(els[0]).before(wrapper);
        $(wrapper).append(els);
    }

    collapsable(tokens: Token[]) {
        while (tokens.last().is(TokenTypes.whitespace, "\n"))
            tokens.removeLast();
        let lineStart = tokens[0].range.start.line;
        let lineEnd = tokens.last().range.end.line;
        let range = tokens.select(t => this.tokenToElement.get(t)).exceptNulls();
        let span = $.create("span.collapsable");
        this.wrap(span[0], range);
        let lineStartEl = $(this.getLineEl(lineStart));
        let lineEndEl = $(this.getLineEl(lineEnd));

        let btnExpander = lineStartEl.getAppend(".expander-container").getAppend("button.expander.expanded");
        let exp: Expander = {
            toggle: (collapsed?: boolean) => {
                if (collapsed == null)
                    collapsed = !exp.isCollapsed();
                span.toggleClass("collapsed", collapsed);
                btnExpander.toggleClass("collapsed", collapsed);
                Array.generateNumbers(lineStart + 1, lineEnd).forEach(line => $(this.getLineEl(line)).toggleClass("collapsed", collapsed)); //TODO: inner collapsing (subs within subs will not work correctly)
            },
            isCollapsed: () => span.hasClass("collapsed"),
        }

        btnExpander.dataItem(exp);
        btnExpander.mousedown(e => exp.toggle());
        //toggle();
    }

    getExpanders(): Expander[] {
        return $(".expander").toArray$().select(t => t.dataItem());
    }

}


export function main() {
    window.onpopstate = e => {
        e.preventDefault();
        $(window).trigger("urlchange");
    };

    $(document.body).click(e => {
        if (e.target.nodeName == "A") {
            e.preventDefault();
            let href = e.target.getAttribute("href");
            window.history.pushState("", "", href);
            $(window).trigger("urlchange");
        }
    });
    let win: any = window;
    let page = new IndexPage();
    win._page = page;

    page.main();
    $(".loading").css({ display: "none" });
}


$(main);

