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
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, TokenReader, Logger, AstNodeFixator, TextFile, TextFilePos, TextFileRange, Cursor,
    ExpressionTester, EtReport, EtItem, RefArrayToRefUtil,
    EntityResolver, Package, Subroutine,
} from "perl-parser";
import {PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper, TokenUtils, CodeHyperlink, Collapsable, IndexRange, IndexSelection} from "./common";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem, PerlDocRequest} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {Key, Rect, Size, Point} from "./common";
import * as ace from "ace/ace";
import * as ModeList from "ace/ext/modelist";
import {Range} from "ace/range";
import {Editor} from "ace/editor";
import {P5AceEditor} from "./p5-ace-editor";
import {PerlCompleter} from "./ace/mode/perl-completer";

export class IndexPage {
    constructor() {
        let win: any = window;
        this.service = new P5Service();
        this.selection = new IndexSelection();
        PerlCompleter.getDocHtml = (type, name) => this.PerlCompleter_getDocHtml(type, name);
    }

    editor: P5AceEditor;
    isMouseDown = false;
    selection: IndexSelection;
    service: P5Service;
    file: P5File;
    cvBaseUrl = "/";
    lastUrl: string;
    generatedCode: string;
    monitor: Monitor;
    url: { pathname: string, hash: string, href: string };
    critiqueRes: CritiqueResponse;
    
    getCvUrlForIncludeAndPacakge(include: string, packageName: string) {
        let url = Helper.urlJoin([this.cvBaseUrl, include, packageName.split("::")]) + ".pm";
        return url;
    }

    resolvePackageWithInclude(packageName: string, include: string): Promise<string> {
        let url = Helper.urlJoin([include, packageName.split("::")]) + ".pm";
        return this.service.fs(url).then(t => include);
    }

    resolvePackages(pkgs: PackageResolution[]): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.service.perlModuleClassify(pkgs.map(t => t.name).distinct()).then(res => {
                res.forEach(mod => {
                    let pkg = pkgs.first(t => t.name == mod.name);
                    if (pkg == null)
                        return;
                    pkg.resolved = mod;
                });
                this.perlDocPackages(pkgs).then(resolve, reject);
            });
        });
    }
    perlDocPackages(pkgs: PackageResolution[]): Promise<any> {
        return Promise.all(pkgs.filter(pkg => pkg.resolved != null && pkg.resolved.is_core).map(pkg => this.perlDocHtml({ name: pkg.name }).then(html => pkg.docHtml = html)));
    }
    main() {
        this.monitor = monitor;
        this.selection.fromParam(location.hash.substr(1));
        $("body").addClass("ace-mode");
        this.editor = new P5AceEditor();
        this.editor.init();
        this.editor.editor.on("changeSelection", e => {
            if (this.ignoreCursorEvents)
                return;
            if (this.file == null)
                return;
            let range = this.editor.editor.selection.getRange();
            this.selection.ranges = [new IndexRange(range.start.row + 1, range.end.row + 1)];
            this.saveSelection();
        });

        this.update();
        $(window).on("urlchange", e => this.window_urlchange(e));
    }

    window_urlchange(e: JQueryEventObject) {
        let loc = document.location;
        let prevUrl = this.url;
        this.url = { pathname: loc.pathname, hash: loc.hash, href: loc.href };
        this.update();
    }

    critique() {
        this.service.perlCritique(this.file.path).then(res => {
            this.critiqueRes = res;
            console.log(res);
            this.dataBind();
            let hls = res.violations.select(violation => {
                let pos = this.editor.sourceFile.getPos3(violation.source.location.line, violation.source.location.column);
                //let pos = new TextFilePos();
                //pos.line = violation.source.location.line;
                //pos.column = violation.source.location.column;
                let tokens = this.findTokens(pos, violation.source.code.length);
                if (tokens == null)
                    return;
                let hl: CodeHyperlink = { tokens, css: "hl hl-violation" };
                let text = `${violation.description}\n${violation.policy}\nseverity:${violation.severity}`;
                let range = this.editor.sourceFile.getRange2(pos, violation.source.code.length);
                this.editor.addMarker({
                    range,
                    className: "marker marker-violation",
                    annotation: { text, type: "error" }
                });
                let html = `<div><div class="popup-header">${violation.policy}</div><div><div>severity:${violation.severity}</div><div>${violation.description}</div></div>`;
                this.editor.addPopupMarker({
                    range,
                    html: html,
                });
                return { violation, hl };
            });
            if (hls.length > 0) {
                this.editor.scrollToLine(hls[0].violation.source.location.line);
            }
        });
    }

    gitBlame() {
        $(".code-container").addClass("git-blame-mode");
        this.service.gitBlame(this.file.path).then(items => this.editor.setGitBlameItems(items));
    }


    findTokens(pos: TextFilePos, length: number): Token[] {
        let token = this.findToken(pos);
        if (token == null)
            return [];
        let index = this.editor.tokens.indexOf(token);
        let took = 0;
        let list = this.editor.tokens.skip(index).takeWhile(t => {
            took += t.value.length;
            if (took >= length)
                return false;
            return true;
        });
        return list;

    }
    findToken(pos: TextFilePos): Token {
        return this.editor.tokens.first(t => t.range != null && t.range.start.line == pos.line && t.range.start.column == pos.column);
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
        history.replaceState(undefined, undefined, window.location.pathname + "#" + this.selection.toParam());
        $(window).trigger("urlchange");
    }

    renderSelection() {
        let range = this.selection.lastRange;
        if (range != null) {
            this.ignoreCursorEvents = true;
            this.editor.editor.gotoLine(range.from - 1);
            this.editor.editor.selection.setRange(new Range(range.from - 1, 0, range.to - 1, 0), false);
            this.ignoreCursorEvents = false;
        }
    }

    getUrl() {
        let path = window.location.pathname.substr(1);
        return path;
    }

    testTokenize(code: string) {
        if (code == null)
            code = this.editor.sourceFile.text;
        let start = performance.now();
        let sourceFile = new TextFile("test.pm", code);
        let tok = new Tokenizer();
        tok.onStatus = () => console.log("Tokenizer status: ", Helper.toPct(tok.cursor.index / tok.file.text.length));
        tok.file = sourceFile;
        return tok.processAsync().then(() => {
            let end = performance.now();
            console.log("tokenization took " + (end - start) + "ms");
        });
    }

    ignoreCursorEvents = false;
    reparse() {
        this.editor.tokenizeAsync(this.file.name).then(() => {
            this.editor.parse();
        });
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
                this.file.children.forEach(t => t.path = Helper.urlJoin([this.file.path, t.path]));
                this.file.children.forEach(t => t.href = t.is_dir ? "/" + t.path + "/" : "/" + t.path);
                this.file.children = this.file.children.orderBy([t => !t.is_dir, t => t.name]);
            }
            else {
                this.service.src(url).then(data => {
                    this.file.src = data;
                    this.ignoreCursorEvents = true;
                    this.editor.code = data;
                    this.ignoreCursorEvents = false;
                    this.renderSelection();
                    window.setTimeout(() => {
                        this.editor.tokenizeAsync(url).then(() => {
                            window.setTimeout(() => {
                                this.editor.parse();
                                this.dataBind();
                                this.resolveAndHighlightUsedPackages().then(() => {
                                    console.log("finished...");
                                });
                            });
                        });
                    }, 10);
                });
            }
            this.dataBind();
        });
        this.dataBind();
    }

    dataBindTimeout: number;
    dataBind() {
        if (this.dataBindTimeout != null) {
            window.clearTimeout(this.dataBindTimeout);
            this.dataBindTimeout = null;
        }
        this.dataBindTimeout = window.setTimeout(() => {
            this.dataBindTimeout = null;
            this.dataBindNow();
        }, 10);
    }

    dataBindNow() {
        Helper.dataBind(document.body, this, this);
        this.editor.notifyPossibleChanges();
    }

    violation_click(e: JQueryEventObject, violation: CritiqueViolation) {
        this.editor.scrollToLine(violation.source.location.line);
    }

    navigateToHash() {
        let hash = window.location.hash.substr(1);
        if (hash == "")
            return;
        let el = $("a[name='" + hash + "']:visible").first();
        if (el.length == 0) {
            el = $(".line.selected:first");
            el = el.find("a:first");
            ////if (el.length > 0)
            ////    el[0].scrollIntoView();
            //return;
        }
        el.focus();
    }

    testExpressions(): Promise<EtReport> {
        let tester = new ExpressionTester();
        return tester.testUnit(this.editor.unit).then(list => {
            console.log("Finished", list);
            console.log("Finished: ", list.where(t => t.success).length, "/", list.length);
            let report = new EtReport();
            report.items = list;
            return report;
        });

    }

    generateCode() {
        new AstNodeFixator().process(this.editor.unit);

        let writer = new AstWriter();
        writer.addParentheses = $("#cbAddParentheses").prop("checked");
        writer.deparseFriendly = $("#cbDeparseFriendly").prop("checked");

        writer.main();
        writer.write(this.editor.unit);
        this.generatedCode = writer.sb.join("");
    }

    refactor() {
        new AstNodeFixator().process(this.editor.unit);
        new RefArrayToRefUtil(this.editor.unit).process();
        this.generateCode();
        //this.editor.render();
        //this.renderSelection();
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
    }

    resolvePerldocAndAnnotate(node: AstNode, isBuiltinFunction: boolean): Promise<any> {
        let name = node.toCode().trim();
        return this._resolvePerldocAndAnnotate(name, isBuiltinFunction, node, null);
    }
    resolvePerldocAndAnnotate2(token: Token, isBuiltinFunction: boolean): Promise<any> {
        let name = token.value.trim();
        return this._resolvePerldocAndAnnotate(name, isBuiltinFunction, null, [token]);
    }

    _resolvePerldocAndAnnotate(name: string, isBuiltinFunction: boolean, node: AstNode, tokens: Token[]): Promise<any> {
        let req = { funcName: null, name: null };
        if (isBuiltinFunction)
            req.funcName = name;
        else
            req.name = name;

        return this.perlDocHtml(req).then(html => {
            let href = "";
            if (isBuiltinFunction)
                href = "http://perldoc.perl.org/functions/" + name + ".html";
            else
                href = "http://perldoc.perl.org/" + name + ".html";
            let type = isBuiltinFunction ? "builtin-function" : "pragma";
            let hl: CodeHyperlink = {
                node: node,
                tokens: tokens,
                href: href,
                name: name,
                //title: "(builtin function) " + name + "\nctrl+click to open documentation",
                css: type,
                target: "_blank"
            };
            if (html != null) {
                let html3 = `<div><div class="popup-header"><a target="_blank" href="${hl.href}">(${type}) ${hl.name}</a></div>${html}</div>`;
                hl.html = html3;
            }
            this.editor.hyperlinkNode(hl);
        });
    }
    resolveAndHighlightUsedPackages(): Promise<any> {
        if (this.editor.unit == null)
            return;

        let builtins2: Token[] = this.editor.tokens.where(t => (t.isIdentifier() || t.isKeyword()) && TokenTypes.builtinFunctions.contains(t.value));
        let pragmas2: Token[] = this.editor.tokens.where(t => (t.isIdentifier() || t.isKeyword()) && TokenTypes.pragmas.contains(t.value));
        console.log({ builtins2, pragmas2 });
        let pkgRefs = this.findPackageRefs(this.editor.unit);
        console.log(pkgRefs.select(t => t.toCode().trim()).distinct().orderBy(t => t));
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
        console.log({ refs, inUse });
        let subs = this.findSubs();
        builtins.forEach(node => this.resolvePerldocAndAnnotate(node, true));
        pragmas.forEach(node => this.resolvePerldocAndAnnotate(node, false));
        builtins2.forEach(node => this.resolvePerldocAndAnnotate2(node, true));
        pragmas2.forEach(node => this.resolvePerldocAndAnnotate2(node, false));


        let enableCollapsing = false;
        if (enableCollapsing) {
            subs.forEach(sub => {
                this.editor.collapsable(sub.block);
            });
            this.findConsecutiveRepetitions(this.editor.tokens, (x, y) => x.isAny([TokenTypes.comment, TokenTypes.whitespace]) && y.isAny([TokenTypes.comment, TokenTypes.whitespace])).forEach(comments => {
                while (comments.length > 0 && comments.last().is(TokenTypes.whitespace))
                    comments.removeLast();
                while (comments.length > 0 && comments.first().is(TokenTypes.whitespace))
                    comments.removeAt(0);
                if (comments.length <= 1)
                    return;
                let text = comments.select(t => t.value).join("");
                if (text.lines().length > 3) {
                    this.editor.collapsable(null, comments);
                }
            });
        }
        this.editor.tokens.where(t => t.is(TokenTypes.pod) && t.value.lines().length > 3).forEach(pod => {
            this.editor.collapsable(null, [pod]);
        });

        let resolutions: PackageResolution[] = inUse.select(node => ({ node: node, name: node.toCode().trim(), resolved: null }));
        return this.resolvePackages(resolutions).then(() => {
            console.log({ resolutions });

            pkgRefs.forEach(node => {
                let name = node.toCode().trim();
                let core = "";
                let local = "";
                let href = "";
                let pkg = resolutions.first(t => t.name == name);
                if (pkg != null && pkg.resolved != null) {
                    if (pkg.resolved.path != null)
                        href = this.cvBaseUrl + pkg.resolved.path;
                    else if (pkg.resolved.url != null)
                        href = pkg.resolved.url;//"https://metacpan.org/pod/" + pkg.name;
                    core = pkg.resolved.is_core ? "core " : "";
                    local = pkg.resolved.is_local ? "local " : "";
                    let html = `<div><div class="popup-header"><a target="_blank" href="${href}">(${core}${local}package) ${name}</a></div>${pkg.docHtml || ""}</div>`;
                    this.editor.hyperlinkNode({
                        node: node,
                        href: href,
                        name: name,
                        css: "package-name",
                        html: html,
                        target: "_blank",
                    });
                }
            });
        });

    }

    findConsecutiveRepetitions<T>(list: T[], equals: (x: T, y: T) => boolean): Array<T[]> {
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


    findUsedPackages(node: AstNode): Expression[] {
        return new AstQuery(node).getDescendants().ofType(InvocationExpression).where(t => t.target instanceof NamedMemberExpression && (<NamedMemberExpression>t.target).name == "use").select(t => t.arguments);
    }
    findPackageRefs(node: AstNode): NamedMemberExpression[] {
        return new AstQuery(node).getDescendants().ofType(NamedMemberExpression).where(t => this.isPackageName(t));
    }
    findSubs(): SubroutineExpression[] {
        return new AstQuery(this.editor.unit).getDescendants().ofType(SubroutineExpression);
    }
    isPackageName(node: NamedMemberExpression): boolean {
        let parentNode = node.parentNode;
        if (parentNode instanceof NamedMemberExpression && this.isPackageName(parentNode))
            return false;
        if (node.arrow)
            return false;
        if (node.token.is(TokenTypes.sigiledIdentifier))
            return false;
        //if (node.parentNode instanceof NamedMemberExpression && node.parentNodeProp == "target")
        //    return false;
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
            if (target instanceof NamedMemberExpression && target.name == "use") {
                //if (target.parentNode instanceof BinaryExpression) //use if ...
                //    return false;
                return true;
            }
        }
        return false;
    }



    perlDocCache: ObjectMap<Promise<string>> = {};
    perlDocFromStorageOnly(req: PerlDocRequest): string {
        let key = req.name + "_" + req.funcName;
        let storageKey = "perldoc_" + key;
        let res3 = localStorage.getItem(storageKey);
        return res3;
    }
    perlDocHtml(req: PerlDocRequest): Promise<string> {
        let key = req.name + "_" + req.funcName;
        let storageKey = "perldoc_" + key;
        let res3 = this.perlDocFromStorageOnly(req);
        if (res3 != null) {
            return Promise.resolve(res3);
        }
        let res = this.perlDocCache[key];
        if (res !== undefined)
            return res;
        res = this.service.perlDocHtml(req)
            .then(html => `<div class="pod">` + html.substringBetween("<!-- start doc -->", "<!-- end doc -->") + "</div>")
            .then(res2 => { localStorage.setItem(storageKey, res2); return res2; });
        this.perlDocCache[key] = res;
        return res;
    }


    isFolder(file?: P5File) {
        if (arguments.length == 0)
            file = this.file;
        return this.file != null && this.file.children != null;
    }
    isFile(file?: P5File) {
        if (arguments.length == 0)
            file = this.file;
        return this.file != null && this.file.children == null;
    }


    PerlCompleter_getDocHtml(type: string, name: string): string {
        return this.perlDocFromStorageOnly({ name: name });

    }


}


export function main() {
    window.onpopstate = e => {
        e.preventDefault();
        $(window).trigger("urlchange");
    };

    $(document.body).click(e => {
        if (e.target.nodeName == "A") {
            if (e.isDefaultPrevented())
                return;
            if (e.target.getAttribute("data-original-title")) //ignore bootstrap popover.js targets
                return;
            e.preventDefault();
            let href = e.target.getAttribute("href");
            if (href == null || href == "" || href.startsWith("javascript:"))
                return;
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


