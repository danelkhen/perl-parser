"use strict";

import {
    AstNode, TextFile, Unit, Package, Global, Token, TextFilePos, Tokenizer, EtReport, AstNodeFixator, AstWriter,
    TokenTypes, RefArrayToRefUtil, ExpressionTester, AstQuery, EntityResolver, Expression, InvocationExpression,
    NamedMemberExpression, Logger, Parser, SubroutineExpression, TokenReader, Entity, Subroutine, Member,
} from "perl-parser";
import {PackageResolution, Helper, TokenUtils, CancellablePromise} from "./common";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation, GitBlameItem, PerlDocRequest, GitLogItem, GitShow, GitShowFile, GitGrepItem, GitGrepMatch} from "./p5-service";
import {PropertyChangeTracker, ObjProperty} from "./property-change-tracker";
import {PerlModuleClassify} from "./p5-service";
import {PopupMarker} from "./p5-ace-editor";
import "./extensions";

export class PerlFile {
    constructor() {
        this.service = new P5Service();
        this.tracker = new PropertyChangeTracker(this);
        //this.tracker.on(t => t.tokens, () => console.log("tokens property changed"));
        //this.tracker.on(t => t.sourceFile, () => console.log("sourceFile property changed"));
        //this.tracker.on(t => t.file, () => console.log("file property changed"));
        //this.tracker.on(t => t.critiqueRes, () => console.log("critiqueRes property changed"));
        //this.tracker.on(t => t.gitBlameItems, () => console.log("gitBlameItems property changed"));
        //this.tracker.on(t => t.unitPackage, () => console.log("unitPackage property changed"));
        //this.tracker.on(t => t.global, () => console.log("global property changed"));
        //this.tracker.on(t => t.unit, () => console.log("unitproperty changed"));
        //this.tracker.on(t => t.resolutions, () => console.log("resolutions changed"));
    }
    onPropChanged(getter: (obj: this) => any, handler: Function) { return this.tracker.on(getter, handler); }
    offPropChanged(getter: (obj: this) => any, handler: Function) { return this.tracker.off(getter, handler); }
    tracker: PropertyChangeTracker<this>;
    sourceFile: TextFile;
    file: P5File;
    codePopups: PopupMarker[] = [];
    unit: Unit;
    service: P5Service;
    generatedCode: string;
    critiqueRes: CritiqueResponse;
    unitPackage: Package;
    global: Global;
    gitBlameItems: GitBlameItem[];
    gitGrepItems: GitGrepItem[];
    gitShowResponse: GitShow;
    gitLogItems: GitLogItem[];
    tokens: Token[];
    entities: EntityInfo[] = [];
    cvBaseUrl = "/";


    getCvUrlForIncludeAndPacakge(include: string, packageName: string) {
        let url = Helper.urlJoin([this.cvBaseUrl, include, packageName.split("::")]) + ".pm";
        return url;
    }

    resolvePackageWithInclude(packageName: string, include: string): Promise<string> {
        let url = Helper.urlJoin([include, packageName.split("::")]) + ".pm";
        return this.service.fs(url).then(t => include);
    }

    perlModuleClassifyCache: Map<string, PerlModuleClassify> = new Map<string, PerlModuleClassify>();

    perlModuleClassify(packageNames: string[]): Promise<PerlModuleClassify[]> {
        let cache = this.perlModuleClassifyCache;
        packageNames = packageNames.distinct();
        let resolved = packageNames.where(t => cache.has(t));
        let remaining = packageNames.where(t => !cache.has(t));
        let resolved2 = resolved.map(t => cache.get(t));
        return this.service.perlModuleClassify(remaining).then(list => {
            list.forEach(t => cache.set(t.name, t));
            list.addRange(resolved2);
            return list;
        });
    }
    resolvePackages(pkgs: EntityInfo[]): CancellablePromise<any> {
        return new CancellablePromise<any>((resolve, reject) => {
            this.perlModuleClassify(pkgs.map(t => t.name).distinct()).then(res => {
                res.forEach(mod => {
                    let pkg = pkgs.first(t => t.name == mod.name);
                    if (pkg == null)
                        return;
                    pkg.resolvedPackage = mod;
                    this.processResolvedPackage(pkg);
                });
                this.perlDocPackages(pkgs).then(resolve, reject);
            });
        });
    }

    processResolvedPackage(info: EntityInfo) {
        //info.docHtml = pkg.docHtml;
        let pkg = info.resolvedPackage;
        if (pkg == null)
            return;
        if (pkg.path != null)
            info.href = this.cvBaseUrl + pkg.path;
        else if (pkg.url != null)
            info.href = pkg.url;//"https://metacpan.org/pod/" + pkg.name;
        if (pkg.is_core && !info.attributes.contains("core"))
            info.attributes.push("core");
        if (pkg.is_local && !info.attributes.contains("local"))
            info.attributes.push("local");
    }

    perlDocPackages(pkgs: EntityInfo[]): Promise<any> {
        return Promise.all(pkgs.filter(pkg => pkg.resolvedPackage != null && pkg.resolvedPackage.is_core).map(pkg => this.perlDocHtml({ name: pkg.name }).then(html => pkg.docHtml = html)));
    }


    critique(): Promise<any> {
        return this.service.perlCritique(this.file.path).then(res => this.critiqueRes = res);
    }

    gitBlame(): Promise<any> {
        return this.service.gitBlame(this.file.path).then(items => this.gitBlameItems = items);
    }

    gitLog(): Promise<any> {
        return this.service.gitLog(this.file.path).then(e => this.gitLogItems = e);
    }

    gitShow(sha: string): Promise<any> {
        return this.service.gitShow(sha).then(res => this.gitShowResponse = res);
    }

    gitGrep(grepText: string) {
        return this.service.gitGrep(grepText).then(res => this.gitGrepItems = res);
    }

    findTokens(pos: TextFilePos, length: number): Token[] {
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
    findToken(pos: TextFilePos): Token {
        return this.tokens.first(t => t.range != null && t.range.start.line == pos.line && t.range.start.column == pos.column);
    }

    testTokenize(code: string) {
        if (code == null)
            code = this.sourceFile.text;
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

    reparse() {
        this.tokenizeAsync().then(() => {
            this.parse();
        });
    }

    /** 
    gets a file from the server, 
    if it's a dir, fixes the children data, 
    if it's a file, gets the contents fo the file (TODO: only do this with a limit of file size, and check file extension is supported) 
    */
    getFile(path: string): Promise<P5File> {
        return this.service.fs(path)
            .catch(e => <P5File>{ name: path, is_dir: false, src: "", exists: false })
            .then(file => this.verifyChildren(file))
            .then(file => this.verifySrc(file));
    }


    verifyChildren(file: P5File): P5File {
        if (file.exists === undefined)
            file.exists = true;
        if (!file.is_dir)
            return file;
        file.children.forEach(t => t.exists = true);
        file.children.forEach(t => t.name = t.path);
        file.children.forEach(t => t.path = Helper.urlJoin([file.path, t.path]));
        file.children.forEach(t => t.href = t.is_dir ? "/" + t.path + "/" : "/" + t.path);
        file.children = file.children.orderBy([t => !t.is_dir, t => t.name]);
        return file;
    }
    verifySrc(file: P5File): Promise<P5File> {
        if (file.is_dir)
            return Promise.resolve(file);
        if (!file.exists)
            return Promise.resolve(file);
        return this.service.src(file.path).catch(() => "").then(data => { file.src = data; return file; });
    }

    processFile(): CancellablePromise<any> {
        if (this.file == null || this.file.is_dir)
            return CancellablePromise.resolve();
        this.sourceFile = new TextFile(this.file.name, this.file.src);
        let p = CancellablePromise.resolve()
            .then(() => this.setTimeout(10))
            .then(() => this.tokenizeAsync(p))
            .then(() => this.setTimeout(10))
            .then(() => this.parse())
            .then(() => this.resolveAndHighlightUsedPackages())
            .then(() => console.log("finished..."));
        return p;
    }

    setTimeout(delay?: number): Promise<any> {
        return new Promise((resolve, reject) => {
            window.setTimeout(resolve, delay || 0);
        });
    }

    testExpressions(): Promise<EtReport> {
        let tester = new ExpressionTester();
        return tester.testUnit(this.unit).then(list => {
            console.log("Finished", list);
            console.log("Finished: ", list.where(t => t.success).length, "/", list.length);
            let report = new EtReport();
            report.items = list;
            return report;
        });

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

    refactor() {
        new AstNodeFixator().process(this.unit);
        new RefArrayToRefUtil(this.unit).process();
        this.generateCode();
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


    verifyHref(hl: PopupMarker): void {
        if (hl.href != null)
            return;
        if (this.isBuiltinFunction(hl.name))
            hl.href = "http://perldoc.perl.org/functions/" + name + ".html";
        else
            hl.href = "http://perldoc.perl.org/" + name + ".html";
    }

    hlVerifyPerlDoc(hl: PopupMarker, cacheOnly?: boolean): Promise<PopupMarker> {
        this.verifyHref(hl);
        if (hl.html != null)
            return Promise.resolve(hl);
        let isBuiltinFunction = this.isBuiltinFunction(hl.name);
        let req = { funcName: null, name: null };
        if (isBuiltinFunction)
            req.funcName = hl.name;
        else
            req.name = hl.name;
        return this.perlDocHtml(req, cacheOnly).then(html => {
            let type = isBuiltinFunction ? "builtin-function" : "pragma";
            hl.className = type;
            hl.target = "_blank";
            if (html != null)
                hl.html = AceHelper.createPopupHtml({ name: hl.name, type: type, href: hl.href, docHtml: html });
            return hl;
        });

    }

    isBuiltin(name: string): boolean { return this.isBuiltinFunction(name) || this.isPragma(name); }
    isBuiltinFunction(name: string): boolean {
        return TokenTypes.builtinFunctions.contains(name);
    }
    isPragma(name: string): boolean {
        return TokenTypes.pragmas.contains(name);
    }

    resolveAndHighlightUsedPackages(): CancellablePromise<void> {
        if (this.unit == null)
            return;

        let builtinTokens: Token[] = this.tokens.where(t => (t.isIdentifier() || t.isKeyword()) && (this.isBuiltin(t.value)));
        let pkgRefNodes = this.findPackageRefs(this.unit);
        let inUse: NamedMemberExpression[] = [];
        let builtinNodes: NamedMemberExpression[] = [];
        pkgRefNodes.forEach(t => {
            let name = t.toCode().trim();
            if (this.isBuiltin(name))
                builtinNodes.push(t);
            else if (this.isInsideUse(t))
                inUse.push(t);
        });

        let hls = builtinNodes.map(t => <PopupMarker>{ name: t.toCode().trim(), node: t });
        hls.addRange(builtinTokens.map(t => <PopupMarker>{ name: t.value.trim(), tokens: [t] }));
        let names = hls.map(t => t.name).distinct();
        let p1 = CancellablePromise
            .all(hls.map(hl => this.hlVerifyPerlDoc(hl, true)))
            .then(() => hls.forEach(hl => this.addCodePopup(hl)));

        let pkgs = inUse.select(node => this.getEntityInfo_package(node.toCode().trim()));//, type: EntityType.package }));
        let p2 = this.resolvePackages(pkgs).then(() => {
            console.log({ pkgs });
            let hls = pkgRefNodes.map(node => this.pkgRefToCodeHyperlink(node));
            hls.exceptNulls().forEach(t => this.addCodePopup(t));
        });
        if (this.unitPackage != null) {
            this.unitPackage.members.forEach(me => {
                if (me instanceof Subroutine && me.node.declaration != null) {
                    this.addCodePopup({ node: me.node.declaration.name, name: me.node.toCode().trim(), html: AceHelper.createPopupHtmlFromEntity(me) });
                }
            });
        }
        let all = CancellablePromise.allVoid([p1, p2]);
        return all;




        //console.log("pkgRefNodes", pkgRefNodes.select(t => t.toCode().trim()).distinct().orderBy(t => t));
        //console.log("pragmas", pragmas.select(t => t.toCode().trim()).distinct().orderBy(t => t));
        //console.log("builtins", builtins.select(t => t.toCode().trim()).distinct().orderBy(t => t));
        //console.log("builtinTokens", builtinTokens.select(t => t.value).distinct().orderBy(t => t));
        //console.log("pragmaTokens", pragmaTokens.select(t => t.value).distinct().orderBy(t => t));
        //console.log({ refs, inUse, pragmas, builtins });
        //pragmaTokens.forEach(token => this.resolvePerldocAndAnnotate2(token));
        //let packageNames = pkgRefNodes.where(t => this.isInsideUse(t)).map(t => t.toCode().trim());
        //packageNames.addRange(builtinTokens.map(t => t.value));
        //packageNames.addRange(pragmaTokens.map(t => t.value));
        //packageNames = packageNames.distinct().orderBy(t => t);
        //console.log(packageNames);
        //let resolutions = packageNames.select(name => (<PackageResolution>{ name, resolved: null }));

    }

    getEntityInfo_package(name: string): EntityInfo {
        let info = this.entities.first(t => t.name == name && t.type == EntityType.package);
        if (info == null) {
            info = <EntityInfo>{ attributes: [], name: name, type: "package" };
            this.entities.push(info);
            //info.popupDocHtml = this.createPopupHtml(info);// `<div><div class="popup-header"><a target="_blank" href="${href}">(${core}${local}package) ${name}</a></div>${pkg.docHtml || ""}</div>`;
        }
        return info;
    }

    pkgRefToCodeHyperlink(node: NamedMemberExpression): PopupMarker {
        let info = this.getEntityInfo_package(node.toCode().trim());
        return {
            node: node,
            href: info.href,
            name: info.name,
            className: "package-name",
            html: AceHelper.createPopupHtml(info),
            target: "_blank",
        };
    }
    addCodePopup(hl: PopupMarker) {
        this.codePopups.push(hl);
        this.codePopups = this.codePopups;
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
    perlDocHtml(req: PerlDocRequest, cacheOnly?: boolean): Promise<string> {
        let key = req.name + "_" + req.funcName;
        let storageKey = "perldoc_" + key;
        let res3 = this.perlDocFromStorageOnly(req);
        if (res3 != null)
            return Promise.resolve(res3);
        let res = this.perlDocCache[key];
        if (res !== undefined)
            return Promise.resolve(res3);
        if (cacheOnly)
            return Promise.resolve(res3);
        res = this.service.perlDocHtml(req)
            .then(html => `<div class="pod">` + html.substringBetween("<!-- start doc -->", "<!-- end doc -->") + "</div>")
            .then(res2 => { localStorage.setItem(storageKey, res2); return res2; });
        this.perlDocCache[key] = res;
        return res;
    }

    perlDocHtmlMultiple(names: string[]): Promise<string[]> {
        let reqs = names.map<PerlDocRequest>(name => this.isBuiltinFunction(name) ? { funcName: name } : { name: name });
        let promises: PromiseLike<string>[] = reqs.map(req => this.perlDocHtml(req));
        return Promise.all(promises);
    }


    parse() {
        try {
            let parser = new Parser();
            parser.logger = new Logger();
            parser.reader = new TokenReader();
            parser.reader.logger = parser.logger;
            parser.reader.tokens = this.tokens;
            parser.init();

            var statements = parser.parse();
            let unit = new Unit();
            unit.statements = statements;
            unit.allTokens = this.tokens;
            this.unit = unit;
            console.log(unit);
            new AstNodeFixator().process(this.unit);
            this.unitPackage = EntityResolver.process(this.unit)[0];
            console.log({ package: this.unitPackage });
            this.global = new Global();
            this.global.packages.push(this.unitPackage);
        }
        catch (e) {
            console.warn("parsing failed", e);
        }
    }

    tokenizeAsync(cancellable?: CancellablePromise<any>): Promise<any> {
        if (this.sourceFile == null)
            return Promise.reject("sourceFile is null");
        //this.code = data;
        let start = new Date();
        //this.sourceFile = new TextFile(filename, this.src);
        let tok = new Tokenizer();
        tok.onStatus = () => console.log("Tokenizer status: ", Helper.toPct(tok.cursor.index / tok.file.text.length));
        tok.file = this.sourceFile;
        cancellable.onCancel.attach(() => tok.cancel());
        return tok.processAsync().then(() => {
            let end = new Date();
            console.log("tokenization took " + (end.valueOf() - start.valueOf()) + "ms");
            this.tokens = tok.tokens;
        });
    }

}

export class EntityType {
    static package = "package";
    static builtinFunction = "builtinFunction";
    static subroutine = "subroutine";
}
export interface EntityInfo {
    name: string;
    /** package, builtinFunction, subroutine - EntityType.X */
    type: string;
    attributes?: string[];
    docHtml?: string;
    docText?: string;
    href?: string;
    /** if it's a package, the resolution response */
    resolvedPackage?: PerlModuleClassify;
}

export class AceHelper {
    static createPopupHtmlFromEntity(x: Entity) {
        let info = <EntityInfo>{ name: x.name, docText: x.documentation, type: x.constructor.name };
        return this.createPopupHtml(info);
    }
    static createPopupHtml(x: EntityInfo) {
        if (x.docText != null && x.docHtml == null)
            x.docHtml = `<div class="pod">${this.toDocHtml(x.docText)}</div>`;
        let attsText = x.attributes != null && x.attributes.length > 0 ? `${x.attributes.join()} ` : "";
        let hrefAtt = x.href ? ` href="${x.href}"` : "";
        let html = `<div><div class="popup-header"><a target="_blank"${hrefAtt}>(${attsText}${x.type}) ${x.name}</a></div>${x.docHtml || ""}</div>`;
        return html;
    }

    static toDocHtml(text: string): string {
        if (text == null || text.length == 0)
            return text;
        let html = text.lines().map(t => `<p>${Helper.htmlEncode(t)}</p>`).join("");
        return html;

    }


}




//let enableCollapsing = false;
//if (enableCollapsing) {
//    subs.forEach(sub => {
//        this.editor.collapsable(sub.block);
//    });
//    this.findConsecutiveRepetitions(this.editor.tokens, (x, y) => x.isAny([TokenTypes.comment, TokenTypes.whitespace]) && y.isAny([TokenTypes.comment, TokenTypes.whitespace])).forEach(comments => {
//        while (comments.length > 0 && comments.last().is(TokenTypes.whitespace))
//            comments.removeLast();
//        while (comments.length > 0 && comments.first().is(TokenTypes.whitespace))
//            comments.removeAt(0);
//        if (comments.length <= 1)
//            return;
//        let text = comments.select(t => t.value).join("");
//        if (text.lines().length > 3) {
//            this.editor.collapsable(null, comments);
//        }
//    });
//}
//this.tokens.where(t => t.is(TokenTypes.pod) && t.value.lines().length > 3).forEach(pod => {
//    this.collapsable(null, [pod]);
//});
