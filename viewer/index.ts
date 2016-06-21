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
import {P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem, PerlDocRequest, GitLogItem, GitShow, GitShowFile, GitGrepItem, GitGrepMatch} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {Key, Rect, Size, Point} from "./common";
import * as ace from "ace/ace";
import * as ModeList from "ace/ext/modelist";
import {Range} from "ace/range";
import {Editor} from "ace/editor";
import {P5AceEditor} from "./p5-ace-editor";
import {PerlCompleter} from "./ace/mode/perl-completer";
import {PerlFile} from "./perl-file";
import {Template} from "./template";
import {PropertyChangeTracker, ObjProperty} from "./property-change-tracker";

export class IndexPage {

    editor: P5AceEditor;
    perlFile: PerlFile;
    isMouseDown = false;
    selection: IndexSelection;
    get file(): P5File { return this.perlFile.file; }
    cvBaseUrl = "/";
    lastUrl: string;
    generatedCode: string;
    ignoreCursorEvents = false;
    renderSelectionTimeout: number;
    dataBindTimeout: number;
    grepText: string = "";
    fileSearchText: string = "";
    files: P5File[];
    tracker: PropertyChangeTracker<this> = new PropertyChangeTracker(this);
    onPropChanged(getter: (obj: this) => any, handler: Function) { return this.tracker.on(getter, handler); }
    offPropChanged(getter: (obj: this) => any, handler: Function) { return this.tracker.off(getter, handler); }

    main() {
        //$.get("/res/viewer/hello.html").then(t =>          Template.registerTag("hello", t)       );
        $.getJSON("/res/local/config.json").then(t => {
            console.log("local/config.json found", t);
            localStorage.setItem("p5-service-url", t.p5ServiceUrl);
        }).then(() => this.main2());
    }

    matchesFilter(file: P5File): boolean {
        return this.fileSearchText.length == 0 || file.name.contains(this.fileSearchText);
    }

    main2() {
        this.selection = new IndexSelection();
        PerlCompleter.getDocHtml = (type, name) => this.PerlCompleter_getDocHtml(type, name);
        this.perlFile = new PerlFile();
        Template.onPromise = p => this.onPromise(p);
        this.selection.fromParam(location.hash.substr(1));
        $("body").addClass("ace-mode");
        this.editor = new P5AceEditor();
        this.editor.perlFile = this.perlFile;
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

        this.onPropChanged(t => t.fileSearchText, () => {
            if (this.fileSearchText.length == 0) {
                this.perlFile.childFiles = this.perlFile.file.children;
            }
            else {
                let s = this.fileSearchText.toLowerCase();
                this.perlFile.childFiles = this.perlFile.file.children.where(t => t.name.toLowerCase().contains(s));
            }
            this.dataBind();
        });
        this.perlFile.onPropChanged(t => t.dir, () => {
            this.dataBind();
        });
        this.perlFile.onPropChanged(t => t.file, () => {
            this.dataBind();
            let code = this.perlFile.file == null ? "" : this.perlFile.file.src;
            console.log("setting editor code", { code });
            this.ignoreCursorEvents = true;
            this.editor.setCode(code);
            this.ignoreCursorEvents = false;
        });
        this.perlFile.onPropChanged(t => t.sourceFile, () => {
            this.dataBind();
            //console.log("setting editor code");
            //this.ignoreCursorEvents = true;
            //this.editor.setCode(this.perlFile.sourceFile.text);
            //this.ignoreCursorEvents = false;
        });
        this.perlFile.onPropChanged(t => t.codeHyperlinks, () => {
            this.editor.hyperlinkNode(this.perlFile.codeHyperlinks.last());
        });
        this.dataBind();
        this.update().then(() => $(document.body).removeClass("notready"));
        $(window).on("urlchange", e => this.window_urlchange(e));
    }

    window_urlchange(e: JQueryEventObject) {
        this.perlFile.url = document.location.href;
        this.onPromise(this.update());
    }

    critique() {
        return this.perlFile.critique().then(() => {
            let res = this.perlFile.critiqueRes;
            console.log(res);
            this.dataBind();
            let hls = res.violations.select(violation => {
                let pos = this.perlFile.sourceFile.getPos3(violation.source.location.line, violation.source.location.column);
                let tokens = this.perlFile.findTokens(pos, violation.source.code.length);
                if (tokens == null)
                    return;
                let hl: CodeHyperlink = { tokens, css: "hl hl-violation" };
                let text = `${violation.description}\n${violation.policy}\nseverity:${violation.severity}`;
                let range = this.perlFile.sourceFile.getRange2(pos, violation.source.code.length);
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
        return this.perlFile.gitBlame().then(() => this.editor.setGitBlameItems(this.perlFile.gitBlameItems));
    }

    gitLog() {
        this.perlFile.gitShowResponse = null;
        return this.perlFile.gitLog().then(e => this.dataBind());
        //this.perlFile.gitLog().then(e => this.dataBind());
    }

    gitGrep() {
        return this.perlFile.gitGrep(this.grepText).then(res => this.dataBind());
    }

    saveSelection() {
        if (location.hash == "#" + this.selection.toParam())
            return;
        history.replaceState(undefined, undefined, window.location.pathname + "#" + this.selection.toParam());
        $(window).trigger("urlchange");
    }

    renderSelection() {
        let range = this.selection.lastRange;
        if (range == null)
            return;
        this.ignoreCursorEvents = true;
        this.editor.editor.gotoLine(range.from - 1);
        this.editor.editor.selection.setRange(new Range(range.from - 1, 0, range.to - 1, 0), false);
        this.ignoreCursorEvents = false;
    }

    getUrl() {
        let path = window.location.pathname.substr(1);
        return path;
    }


    reparse() {
        return this.perlFile.reparse();
    }
    update(): Promise<any> {
        let url = this.getUrl();
        if (this.lastUrl == url)
            return Promise.resolve();
        console.log("rendering", url);
        this.lastUrl = url;
        this.perlFile.url = url;
        return this.perlFile.update().then(() => {
            let hash = document.location.hash.substr(1);
            if (hash.startsWith("L")) {
                let line = parseInt(hash.substr(1));
                this.ignoreCursorEvents = true;
                this.editor.editor.gotoLine(line);
                this.ignoreCursorEvents = false;
            }
            this.dataBindNow();
        });
    }

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

    time(action: () => any, name?: string): number {
        let start = new Date();
        action();
        let end = new Date();
        let ms = end.valueOf() - start.valueOf();
        if (name != null)
            console.log(`${name} took ${ms}ms`);
        return ms;
    }
    dataBindNow() {
        this.time(() => {
            Template.dataBind(document.body, this, this);
            this.editor.notifyPossibleChanges();
        }, "dataBindNow");
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


    refactor() {
        new AstNodeFixator().process(this.perlFile.unit);
        new RefArrayToRefUtil(this.perlFile.unit).process();
        this.perlFile.generateCode();
        //this.editor.render();
        //this.renderSelection();
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

    showBottomBar() {
        let f = this.perlFile;
        return [f.critiqueRes, f.gitLogItems, f.gitShowResponse, f.gitGrepItems].exceptNulls().length > 0;
    }

    PerlCompleter_getDocHtml(type: string, name: string): string {
        return this.perlFile.perlDocFromStorageOnly({ name: name });
    }


    scrollGrid_keydown(e: JQueryEventObject) {
        console.log("scrollGrid_keydown", e);
        if (e.keyCode == Key.UP || e.keyCode == Key.DOWN) {
            e.preventDefault();
            let grid = $(e.target).closest(".scroll-grid").find(".grid > tbody");
            let selected = grid.children(".selected");
            let sibling = e.keyCode == Key.UP ? selected.prev(":visible") : selected.next(":visible");
            if (sibling.length > 0) {
                selected.removeClass("selected");
                sibling.addClass("selected");
            }
        }
    }
    grid_mousedown(e: JQueryEventObject, selector: string) {
        e.preventDefault();
        let input = <HTMLInputElement>$(e.target).closest(".scroll-grid").children(".scroll-grid-input")[0];
        if (input != null)
            input.focus();
        let tr = $(e.target).closest(selector);
        tr.parent().children().removeClass("selected");
        tr.addClass("selected");
    }

    violation_dblclick(e: JQueryEventObject, violation: CritiqueViolation) {
        return this.editor.scrollToLine(violation.source.location.line);
    }

    gitLogItem_click(e: Event, item: GitLogItem) {
        return this.perlFile.gitShow(item.sha).then(() => this.dataBind());
    }

    gitShowFile_click(e: Event, file: GitShowFile) {
        window.location.href = "/" + file.path;
        //this.perlFile.url = item.path;
        //this.perlFile.update();
    }

    promiseCount = 0;

    onPromise(promise: Promise<any>): Promise<any> {
        this.promiseCount++;
        console.log({ promiseCount: this.promiseCount });
        $(document.body).toggleClass("loading", true);
        return promise.then(t => {
            this.promiseCount--;
            console.log({ promiseCount: this.promiseCount });
            $(document.body).toggleClass("loading", false);
            return t;
        });
    }

    gitGrepItem_click(e: Event, item: GitGrepItem) {
        this.gitGrepItem = item;
        this.dataBind();
    }
    gitGrepItemMatch_click(e: Event, match: GitGrepMatch) {
        let item = this.gitGrepItem;
        if (item == null)
            return;
        let url = "/" + item.path + "#L" + match.line_num;
        window.open(url);
        //this.gitGrepItem = item;
        //this.dataBind();
    }

    gitGrepItem: GitGrepItem;

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



//getLineFromLineNumberEl(el: HTMLElement) {
//    if (el == null || !$(el).is(".line-number"))
//        return null;
//    let line = parseInt(el.textContent);
//    if (isNaN(line))
//        return null;
//    return line;
//}
//onLineNumberMouseDown(e: JQueryMouseEventObject) {
//    if (e.which != 1)
//        return;
//    if (!$(e.target).hasClass("line-number"))
//        return;
//    let line = this.getLineFromLineNumberEl(<HTMLElement>e.target);
//    if (line == null)
//        return;
//    e.preventDefault();
//    this.isMouseDown = true;
//    let shift = e.shiftKey;
//    let ctrl = e.ctrlKey;
//    this.clickLine(line, ctrl, shift);
//}

//onLineNumberMouseOver(e: JQueryMouseEventObject) {
//    if (!this.isMouseDown)
//        return;
//    let line = this.getLineFromLineNumberEl(<HTMLElement>e.target);
//    if (line == null)
//        return;
//    let range = this.selection.lastRange;
//    if (range == null)
//        return;
//    if (range.to == line)
//        return;
//    e.preventDefault();
//    range.to = line;
//    this.renderSelection();
//    this.saveSelection();
//}
//onLineNumberMouseUp(e: JQueryMouseEventObject) {
//    this.isMouseDown = false;
//}


//clickLine(line: number, ctrl: boolean, shift: boolean) {
//    this.selection.click(line, ctrl, shift);
//    this.renderSelection();
//    this.saveSelection();
//}
