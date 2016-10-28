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
import { PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper, TokenUtils, Collapsable, IndexRange, IndexSelection } from "./common";
import { P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem, PerlDocRequest, GitLogItem, GitShow, GitShowFile, GitGrepItem, GitGrepMatch } from "./p5-service";
import { monitor, Monitor } from "./monitor";
import { Key, Rect, Size, Point, CancellablePromise } from "./common";
import * as ace from "ace/ace";
import * as ModeList from "ace/ext/modelist";
import { Range } from "ace/range";
import { Editor } from "ace/editor";
import { P5AceEditor, PopupMarker } from "./p5-ace-editor";
import { PerlCompleter } from "./ace/mode/perl-completer";
import { PerlFile } from "./perl-file";
import { Template } from "./template";
import { PropertyChangeTracker, ObjProperty } from "./property-change-tracker";

export class IndexPage {

    editor: P5AceEditor;
    perlFile: PerlFile;
    isMouseDown = false;
    selection: IndexSelection;
    get file(): P5File { return this.perlFile.file; }
    set file(value: P5File) { this.perlFile.file = value; }
    cvBaseUrl = "/";
    path: string;
    dir: P5File;
    childFiles: P5File[];
    //prevUrl: string;
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
        this.main2();
        //$.get("/res/viewer/hello.html").then(t =>          Template.registerTag("hello", t)       );
        //$.getJSON("/res/local/config.json").then(t => {
        //    console.log("local/config.json found", t);
        //    localStorage.setItem("p5-service-url", t.p5ServiceUrl);
        //}).always(() => this.main2());
    }

    matchesFilter(file: P5File): boolean {
        return this.fileSearchText.length == 0 || file.name.contains(this.fileSearchText);
    }

    lastProcessFile: CancellablePromise<any>;

    setTimeout(delay?: number): CancellablePromise<any> {
        return new CancellablePromise((resolve, reject) => {
            window.setTimeout(resolve, delay || 0);
        });
    }

    main2() {
        this.selection = new IndexSelection();
        this.perlFile = new PerlFile();
        Template.onPromise = p => this.onPromise(p);
        this.selection.fromParam(location.hash.substr(1));
        $("body").addClass("ace-mode");
        this.editor = new P5AceEditor();
        this.editor.perlFile = this.perlFile;
        this.editor.init();
        this.editor.editor.on("change", e => {
            if (this.lastProcessFile != null) {
                console.log("CANCELLING PROCESSFILE");
                this.lastProcessFile.cancel();
                this.lastProcessFile = null;
            }
            this.lastProcessFile = this.setTimeout(100)
                .then(() => {
                    console.log("REPROCESS 1");
                    this.perlFile.codePopups.clear();
                    this.editor.popupMarkers.clear();
                    let code = this.editor.getCode();
                    this.perlFile.file.src = code;
                })
                .then(() => { console.log("REPROCESS 2"); return this.perlFile.processFile(); })
                .then(e => console.log("reprocessed file end"))
                .then(() => this.lastProcessFile = null)
                .catch(e => console.log("caught cancel"));
        });

        //this.editor.editor.on("changeSelection", e => {
        //    if (this.ignoreCursorEvents)
        //        return;
        //    if (this.file == null)
        //        return;
        //    let range = this.editor.editor.selection.getRange();
        //    this.selection.ranges = [new IndexRange(range.start.row + 1, range.end.row + 1)];
        //    this.saveSelection();
        //});
        //this.editor.onPropChanged(t => t.gutterDecorations, () => {
        //    if (this.ignoreCursorEvents)
        //        return;
        //    if (this.file == null)
        //        return;
        //    let indexes = Array.from(this.editor.gutterDecorations.keys());
        //    //let range = this.editor.editor.selection.getRange();
        //    this.selection.ranges = indexes.orderBy(t => t).map(t => new IndexRange(t, t));
        //    //this.selection.ranges = [new IndexRange(indexes.first(), indexes.last())];
        //    this.saveSelection();
        //});



        this.onPropChanged(t => t.fileSearchText, () => {
            if (this.fileSearchText.length == 0) {
                this.childFiles = this.perlFile.file.children;
            }
            else {
                let s = this.fileSearchText.toLowerCase();
                this.childFiles = this.perlFile.file.children.where(t => t.name.toLowerCase().contains(s));
            }
            this.dataBind();
        });
        //this.perlFile.onPropChanged(t => t.dir, () => {
        //    this.dataBind();
        //});
        this.perlFile.onPropChanged(t => t.file, () => {
            this.dataBind();
            let code = this.perlFile.file == null ? "" : this.perlFile.file.src;
            console.log("setting editor code", { code });
            this.ignoreCursorEvents = true;
            this.editor.setCode(code);
            this.ignoreCursorEvents = false;
        });
        this.perlFile.onPropChanged(t => t.sourceFile, () => this.dataBind());
        this.perlFile.onPropChanged(t => t.codePopups, () => {
            let hl = this.perlFile.codePopups.last();
            this.editor.addPopupMarker(hl);
        });
        this.dataBind();
        //this.prevUrl = document.location.href;

        this.update().then(() => {
            this.renderSelection();
            $(document.body).removeClass("notready");
        });
        $(window).on("urlchange", e => this.window_urlchange(e));
    }

    urlEqualWithoutHash(x: string, y: string): boolean {
        if (x == y)
            return true;
        if (x == null || y == null)
            return false;
        let i1 = x.indexOf("#");
        let i2 = y.indexOf("#");
        if (i1 != i2)
            return false;
        if (i1 < 0)
            return x == y;
        let sub1 = x.substr(0, i1);
        let sub2 = y.substr(0, i2);
        return sub1 == sub2;
    }
    window_urlchange(e: JQueryEventObject) {
        this.onPromise(this.update());
    }

    critique(): Promise<any> {
        return this.perlFile.critique().then(() => {
            let res = this.perlFile.critiqueRes;
            console.log(res);
            this.dataBind();
            let hls = res.violations.select(violation => {
                let pos = this.perlFile.sourceFile.getPos3(violation.source.location.line, violation.source.location.column);
                let tokens = this.perlFile.findTokens(pos, violation.source.code.length);
                if (tokens == null)
                    return;
                let hl: PopupMarker = { tokens, className: "hl hl-violation" };
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

    gitBlame(): Promise<any> {
        $(".code-container").addClass("git-blame-mode");
        return this.perlFile.gitBlame().then(() => this.editor.setGitBlameItems(this.perlFile.gitBlameItems));
    }

    gitLog(): Promise<any> {
        this.perlFile.gitShowResponse = null;
        return this.perlFile.gitLog();
    }

    gitGrep(): Promise<any> {
        return this.perlFile.gitGrep(this.grepText);
    }

    markSelection() {
        let sel = this.selection;
        let sel2 = new IndexSelection();
        let aceRanges = this.editor.editor.selection.getAllRanges();
        let last = aceRanges.last();
        if (last.startColumn == 0 && last.endColumn == 0)
            aceRanges.removeLast();
        sel2.ranges = aceRanges.map(range => new IndexRange(range.start.row + 1, range.end.row + 1));
        if (sel.toParam() == sel2.toParam()) {
            this.selection.ranges = [];
        }
        else {
            this.selection.ranges = sel2.ranges;
        }
        this.renderSelection();
        this.saveSelection();

    }

    saveSelection() {
        if (location.hash == "#" + this.selection.toParam())
            return;
        history.replaceState(undefined, undefined, window.location.pathname + "#" + this.selection.toParam());
    }

    renderSelection() {
        this.editor.toggleAllGutterDecorations("bookmark", false);
        this.selection.ranges.map(range => {
            for (let i = range.from; i <= range.to; i++) {
                this.editor.toggleGutterDecoration(i, "bookmark", true);
            }
        });
    }

    getPath() {
        let path = window.location.pathname.substr(1);
        return path;
    }


    reparse() {
        return this.perlFile.reparse();
    }


    getDirPath(path: string) {
        if (path.length <= 1)
            return path;
        if (path.endsWith("/"))
            path = path.substr(0, path.length - 1);
        let index = path.lastIndexOf("/");
        if (index <= 0)
            return path;
        return path.substring(0, index);
    }

    /**
    process the url, and retrieve the file
    if url points to a dir, set the dir and childFiles properties, unset the file property
    if url points to a file, get the src and set file property, then get the parent dir and set dir and childFiles properties
    */
    update(): Promise<any> {
        let path = this.getPath();
        if (this.path == path)
            return Promise.resolve();
        console.log("rendering", path);
        this.path = path;

        return this.perlFile.getFile(path).then(file => {
            if (file.is_dir) {
                this.dir = file;
                this.childFiles = this.dir.children;
                this.file = null;
            }
            else {
                this.file = file;
                let dirPath = this.getDirPath(path);
                return this.perlFile.getFile(dirPath).then(dir => {
                    this.dir = dir;
                    this.childFiles = this.dir.children;
                });
            }
        }).then(() => {
            this.perlFile.processFile();
            this.gotoLineFromHash();
            this.dataBindNow();
        })
    }

    gotoLineFromHash() {
        let hash = document.location.hash.substr(1);
        if (!hash.startsWith("L"))
            return;
        let line = parseInt(hash.substr(1));
        this.ignoreCursorEvents = true;
        this.editor.editor.gotoLine(line);
        this.ignoreCursorEvents = false;
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
            this.autoFocus();
            this.editor.notifyPossibleChanges();
        }, "dataBindNow");
    }

    autoFocus() {
        if (document.activeElement != document.body)
            return;
        let el = $(".autofocus:visible:first")[0];
        if (el == null)
            return;
        console.log("autofocus", el);
        el.focus();
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


    showBottomBar() {
        let f = this.perlFile;
        return [f.critiqueRes, f.gitLogItems, f.gitShowResponse, f.gitGrepItems].exceptNulls().length > 0;
    }


    //taken from jquery-ui 
    findScrollParent(el: HTMLElement, includeHidden?: boolean): HTMLElement {
        let el2 = $(el);
        let position = el2.css("position");
        let excludeStaticParent = position === "absolute";
        let overflowRegex = includeHidden ? /(auto|scroll|hidden)/ : /(auto|scroll)/;
        let scrollParent = el2.parents().filter((index, element) => {
            var parent = $(element);
            if (excludeStaticParent && parent.css("position") === "static")
                return false;
            return overflowRegex.test(parent.css("overflow") + parent.css("overflow-y") + parent.css("overflow-x"));
        }).eq(0);

        if (position === "fixed" || !scrollParent.length)
            return null; //el.ownerDocument || document :
        return scrollParent[0];
    };

    /** returns the minimum diff for scrollTop of the scrollParent required for an element to be inside the scrollArea */
    getScrollTopViewOffset(el: HTMLElement) {
        let scrollEl = this.findScrollParent(el);
        let scrollTop = scrollEl.scrollTop;
        let scrollHeight = scrollEl.offsetHeight;
        let scrollBottom = scrollTop + scrollHeight;
        let top = el.offsetTop;
        let height = el.offsetHeight;
        let bottom = top + height;
        if (top < scrollTop) {
            return top - scrollTop;
        }
        else if (bottom > scrollBottom) {
            return bottom - scrollHeight - scrollTop;
        }
        return 0;
    }
    scrollIntoViewIfNeeded(el: HTMLElement) {
        let offset = this.getScrollTopViewOffset(el);
        if (offset == 0)
            return;
        let scrollEl = this.findScrollParent(el);
        scrollEl.scrollTop += offset;
    }

    up() {
        if (this.perlFile.file != null) {
            navigate(".");
            return;
        }
        navigate("..");
    }

    filesGrid_input(e: JQueryEventObject) {
        let s = $(e.target).val();
        let grid = $(e.target).closest(".scroll-grid").find(".grid > tbody");
        let selected = grid.children(".selected:first")[0];
        let all = grid.children(":visible").toArray<HTMLElement>();
        let index = all.indexOf(selected);
        if (index > 0) {
            let part1 = all.slice(0, index);
            let part2 = all.slice(index);
            //start search from selected, then below, then from beginning
            part2.addRange(part1);
            all = part2;
        }
        let el = all.first(tr => tr.textContent.toLowerCase().startsWith(s));
        if (el == null)
            return;
        if ($(el).is(".selected"))
            return;
        $(el).parent().children(".selected").removeClass("selected");
        $(el).addClass("selected");
        this.scrollIntoViewIfNeeded(el);
    }

    filesGrid_keydown(e: JQueryEventObject) {
        this.scrollGrid_keydown(e);
        if (e.keyCode == Key.BACKSPACE) {
            e.preventDefault();
            this.up();
        }
    }

    scrollGrid_keydown(e: JQueryEventObject) {
        if (e.keyCode == Key.ENTER) {
            e.preventDefault();
            let grid = $(e.target).closest(".scroll-grid").find(".grid > tbody");
            let selected = grid.children(".selected");
            selected.trigger("dblclick");
            return;
        }
        if ([Key.UP, Key.DOWN, Key.PAGE_UP, Key.PAGE_DOWN, Key.HOME, Key.END].contains(e.keyCode)) {
            e.preventDefault();
            $(e.target).val("");
            let grid = $(e.target).closest(".scroll-grid").find(".grid > tbody");
            let selected = grid.children(".selected");
            let sibling = selected;
            if (e.keyCode == Key.HOME) {
                sibling = grid.children(":visible:first");
            }
            else if (e.keyCode == Key.END) {
                sibling = grid.children(":visible:last");
            }
            else if (selected.length == 0) {
                sibling = grid.children(":visible:first");
                let next = sibling.next(":visible");
                if (next.length > 0)
                    sibling = next;
            }
            else {
                let scrollParent = this.findScrollParent(grid[0]);
                let height = scrollParent.offsetHeight;
                let dir = e.keyCode == Key.UP || e.keyCode == Key.PAGE_UP ? -1 : 1;
                let prevOffset: number = null;
                let offset: number = null;
                let count = 0;
                while (true) {
                    let next = dir == -1 ? sibling.prev(":visible") : sibling.next(":visible");
                    if (next.length == 0)
                        break;
                    if (e.keyCode == Key.UP || e.keyCode == Key.DOWN) {
                        sibling = next;
                        break;
                    }
                    prevOffset = offset;
                    offset = this.getScrollTopViewOffset(sibling[0]);
                    if (offset != 0 && prevOffset == 0 && count != 1)
                        break;
                    sibling = next;
                    if (Math.abs(offset) >= height)
                        break;
                    count++;
                }
            }
            if (sibling.length > 0) {
                selected.removeClass("selected");
                sibling.addClass("selected");
                this.scrollIntoViewIfNeeded(sibling[0]);
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

    gitLogItem_click(e: JQueryEventObject, item: GitLogItem): Promise<any> {
        return this.perlFile.gitShow(item.sha);
    }

    gitShowFile_click(e: JQueryEventObject, file: GitShowFile) {
        window.open("/" + file.path);
        //this.perlFile.url = item.path;
        //this.perlFile.update();
    }
    file_dblclick(e: JQueryEventObject, file: P5File) {
        navigate(file.href);//location.href = file.href;
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
            this.dataBind();
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
    }

    gitGrepItem: GitGrepItem;

}


export function navigate(url: string) {
    console.log("navigate", {url});
    //if (!url.startsWith("/"))
    //    url = "/" + url;
    if (url.startsWith("//"))
        url = url.substr(1);
    console.log("navigate - fixed", {url});

    window.history.pushState("", "", url);
    $(window).trigger("urlchange");
}
export function main() {
    window.onpopstate = e => {
        e.preventDefault();
        $(window).trigger("urlchange");
    };
    //window.setInterval(() => console.log("active element", document.activeElement), 1000);
    //$(window).focusin(e => console.log("focusin", e.target.nodeName || e.target, document.activeElement.nodeName));
    //$(window).focusout(e => console.log("focusout", e.target.nodeName, document.activeElement.nodeName));
    //$(document.body).focus(e=>console.log("BODY IS FOCUSED"));
    //$(window).focus(e=>console.log("WINDOW IS FOCUSED"));

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
            navigate(href);
        }
    });
    let win: any = window;
    let page = new IndexPage();
    win._page = page;

    page.main();
    $(".loading").css({ display: "none" });



}

$(main);
