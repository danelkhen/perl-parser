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
import {PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper} from "./common";

import "../src/extensions";
import {RefArrayToRefUtil} from "../src/refactor";
import {ExpressionTester, EtReport, EtItem} from "../src/expression-tester";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {Key, Rect, Size, Point} from "./common";
import {Editor, CvLine, IndexSelection, TokenUtils} from "./editor";

export class IndexPage {
    constructor() {
        let win: any = window;
        this.service = new P5Service();
        this.selection = new IndexSelection();
    }

    editor: Editor;



    isMouseDown = false;
    selection: IndexSelection;
    service: P5Service;
    file: P5File;
    cvBaseUrl = "/";
    includes = [
        "lib/",
    ];


    lastUrl: string;
    generatedCode: string;


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
    monitor: Monitor;
    main() {
        this.editor = new Editor();
        this.editor.init();

        this.monitor = monitor;
        $(".lines").mousedown(e => this.onLineNumberMouseDown(e));
        $(".lines").mouseover(e => this.onLineNumberMouseOver(e));
        $(".lines").mouseup(e => this.onLineNumberMouseUp(e));
        this.selection.fromParam(location.hash.substr(1));

        this.update();

        $(window).on("urlchange", e => { console.log(e); this.update(); });
    }
    //pageSize: number;


    critiqueRes: CritiqueResponse;
    critique() {
        this.service.critique(this.file.path).then(res => {
            this.critiqueRes = res;
            console.log(res);
            //let firstViolationLine = null;
            this.dataBind();
            //Helper.dataBind($(".bottom-bar")[0], this);
            //Helper.repeat(".critique-row", res.violations);
            let hls = res.violations.select(violation => {
                let pos = new File2Pos();
                pos.line = violation.source.location.line;
                pos.column = violation.source.location.column;
                let tokens = this.findTokens(pos, violation.source.code.length);
                if (tokens == null)
                    return;
                let hl = this.editor.hyperlinkNode({ tokens, css: "hl hl-violation" });
                this.tooltip({ target: hl, content: `${violation.description}\n${violation.policy}\nseverity:${violation.severity}`, });
                //if (firstViolationLine == null)
                //    firstViolationLine = violation.source.location.line;
                return hl;
                //tokens.forEach(token => {
                //    let el = this.tokenToElement.get(token);
                //    if (el == null)
                //        return;
                //    $(el).addClass("hl hl-violation");

                //    this.tooltip({ target: el, content: `${violation.description}\n${violation.policy}\nseverity:${violation.severity}`, });
                //});
            });
            if (hls.length > 0)
                $(hls[0]).blur().focus();
            //if (firstViolationLine !=null )
            //    this.scrollToLine(firstViolationLine);
        });
    }

    gitBlame() {
        $(".code-container").addClass("git-blame-mode");
        this.service.gitBlame(this.file.path).then(items => {
            items.forEach(item => {
                let line = this.editor.binder.getLineEl(parseInt(item.line_num));
                $(line).find(".git-blame").remove();
                let el = $.create(".git-blame");
                el.getAppend("span.sha").text(item.sha);
                el.getAppend("span.author").text(item.author);
                this.tooltip({ target: el[0], content: [item.author, item.date, item.sha].join("\n") });
                $(line).find(".line-number").before(el);
            });
        });
    }

    tooltip(opts: TooltipOptions) {
        if (opts.position == null)
            opts.position = "bottom left";
        if (opts.classes == null)
            opts.classes = opts.target.className;
        opts.classes += " tt";
        new Tooltip(opts);
    }

    findTokens(pos: File2Pos, length: number): Token[] {
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
    findToken(pos: File2Pos): Token {
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
        let node = <HTMLElement>$(".lines")[0].firstChild;
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
            }
            else {
                this.service.src(url).then(data => {
                    this.file.src = data;
                    this.editor.code = data;
                    window.setTimeout(() => {
                        this.editor.tokenizeAsync(url, data).then(() => {
                            window.setTimeout(() => {
                                this.editor.parse();
                                this.resolveAndHighlightUsedPackages();
                                this.navigateToHash();
                                this.dataBind();
                            });
                        });
                    }, 10);
                });
            }
            //$(".dir-view").toggleClass("active", this.file.children != null);
            //$(".code-view").toggleClass("active", this.file.children == null);
            this.dataBind();
            //this.editor.initCaret();
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
        this.editor.binder.notifyPossibleChanges();
    }

    violation_click(e: JQueryEventObject, violation: CritiqueViolation) {
        console.log(e, violation);
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
        //let expressions: string[] = [];
        //tester.onExpressionFound = e => {
        //    expressions.push(e.code);
        //    //console.log("onExpressionFound", expressions.length);
        //    //fs.writeFileSync(expressionsFilename, expressions.select(t=> t.trim()).distinct().orderBy([t=> t.contains("\n"), t=> t.length, t=> t]).join("\n------------------------------------------------------------------------\n"));
        //};
        return tester.testUnit(this.editor.unit).then(list => {
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
        //new FindEvalsWithout1AtTheEnd().process(this.unit);
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
        //console.log("can't getTokens for", obj);
        //return null;
    }

    resolveAndHighlightUsedPackages() {
        if (this.editor.unit == null)
            return;
        let pkgRefs = this.findPackageRefs(this.editor.unit);
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
            this.editor.hyperlinkNode({ node: node.name, href: "#sub:" + name, name: "sub:" + name });
        });
        builtins.forEach(node => {
            let name = node.toCode().trim();
            this.editor.hyperlinkNode({ node, href: "http://perldoc.perl.org/functions/" + name + ".html", name, title: "(builtin function) " + name + "\nctrl+click to open documentation", css: "builtin-function", target: "_blank" });
        });
        pragmas.forEach(node => {
            let name = node.toCode().trim();
            this.editor.hyperlinkNode({ node, href: "http://perldoc.perl.org/" + name + ".html", name, title: "(pragma) " + name + "\nctrl+click to open documentation", target: "_blank" });
        });

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
                    this.editor.hyperlinkNode({ node: pkg.node, href, name: pkg.name, title: "(package) " + pkg.name + "\nctrl+click to open documentation", css: "package-name" });
                });
        });
        let packages = resolutions.select(t => t.name);
        refs.forEach(node => {
            let pkg = node.toCode();
            let pkg2 = resolutions.first(t => t.name == pkg);
            if (pkg2 != null) {
                this.editor.hyperlinkNode({ node, href: "#" + pkg });
            }
        });
        subs.forEach(sub => {
            let x = this.editor.collectTokens2(sub.block);
            this.editor.collapsable(x);
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
                this.editor.collapsable(comments);
            }
        });
        this.editor.tokens.where(t => t.is(TokenTypes.pod) && t.value.lines().length > 3).forEach(pod => {
            this.editor.collapsable([pod]);
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


//splitNewLineTokens() {
//    let list: Token[] = [];
//    this.tokens.forEach(token => {
//        if (token.is(TokenTypes.whitespace) && token.value.contains("\n") && token.value != "\n") {
//            let s = token.value;
//            while (s.length > 0) {
//                if (s[0] == "\n") {
//                    let newLineToken = TokenTypes.whitespace.create2("\n");
//                    list.push(newLineToken);
//                    s = s.substring(1);
//                }
//                else {
//                    let index = s.indexOf("\n");
//                    if (index > 0) {
//                        let part = s.substring(0, index - 1);
//                        let whitespaceToken = TokenTypes.whitespace.create2(part);
//                        list.push(whitespaceToken);
//                        let whitespaceToken2 = TokenTypes.whitespace.create2("\n");
//                        list.push(whitespaceToken2);
//                        s = s.substring(index + 1);
//                    }
//                    else {
//                        let whitespaceToken = TokenTypes.whitespace.create2(s);
//                        list.push(whitespaceToken);
//                        s = "";
//                    }
//                }
//            }
//            return;
//        }
//        else {
//            list.push(token);
//        }
//    });
//    this.tokens = list;
//}


//var editor = CodeMirror.fromTextArea(<HTMLTextAreaElement>$("textarea")[0], { lineNumbers: true, mode:"perl",  foldGutter:true, });
//editor.setSize(null, "100%");
//editor.setValue("sub ggg {\nprint 'ggg';\n\n\n\n}");
//window.editor = editor;
//editor.foldCode(CodeMirror.Pos(0, 8), {rangeFinder:CodeMirror.fold.brace});
//return;

//this.pageSize = Math.floor(this.scrollEl.offsetHeight / this.lineHeight);
//let x = { name: "ggg", phones: [{ number: "asd" }, { number: "dddd" }] };
//monitor.methodInvoked.attach(e => console.log("methodInvoked", e));
//monitor.propSet.attach(e => console.log("propSet", e));
//monitor.register(x, () => true);
//x.name = "aaa";
//x.phones.push({ number: "aaaaa" });
//x.phones.removeAt(1);
//console.log(window.location.pathname);
//$(".menu").getAppend("button.btn.btnCritique").text("Critique").click(e => this.critique());
//$(".menu").getAppend("button.btn.btnExpandOrCollapseAll").text("Expand/Collapse").click(e => this.expandOrCollapseAll());
//$(".menu").getAppend("button.btn.btnGitBlame").text("git blame").click(e => this.gitBlame());
//this.tbUrl = $("#tbUrl");
//this.tbUrl.val(window.location.pathname);
//this.urlKey = "perl-parser\turl";
//this.tbRegex = $("#tbRegex");
//$("#btnRefactor").click(e => this.refactor());
//$("#btnTestExpressions").click(e => this.testExpressions());

//this.tbRegex.keyup(e => {
//    let s = this.tbRegex.val();
//    try {
//        let regex = new Function("return " + s + ";")();
//        let res = regex.exec(this.code);
//        if (res instanceof Array)
//            console.log(JSON.stringify(res[0]), { regex: res });
//        else
//            console.log(res);
//    }
//    catch (e) {
//        console.log(e);
//    }
//});
//this.tbUrl.change(e => this.update());
//$("#cbAddParentheses").change(e => this.update());
//$("#cbDeparseFriendly").change(e => this.update());
//$(".line-numbers").on("click", "a.line-number", e=>e.preventDefault());
//if (token.is(TokenTypes.whitespace) && token.value == "\n") {
//    line = new CvLine();
//    line.tokens = [];
//    this.lines.add(line);
//}
//else {
//    let lines = token.value.lines();
//    if (lines.length > 1) {
//        lines.skip(1).forEach(t => {
//            line = new CvLine();
//            line.tokens = [token];
//            this.lines.add(line);
//        });
//    }
//}

