"use strict";

export class P5Service {
    url = "/_api_/";
    ls(req: PathRequest): Promise<P5File> {
        return this.ajax({ action: "ls", req });
    }

    cat(req: PathRequest): Promise<string> {
        return this.ajax({ action: "cat", req });
    }

    perlCritique(path: string): Promise<CritiqueResponse> {
        return this.ajax({ action: "perl/critique/:path", req: { path } });
    }
    perldoc(req: PerlDocRequest): Promise<string> {
        return this.ajax({ action: "perldoc", req });
    }
    perlres(req: PerlResRequest): Promise<PerlModuleClassify[]> {
        if (req.packageNames == null || req.packageNames.length == 0)
            return Promise.resolve([]);
        return this.ajax({ action: "perlres", req });
    }

    gitBlame(path: string): Promise<GitBlameItem[]> {
        return this.ajax({ action: "git/blame/:path", req: { path } });
    }

    gitLog(path: string): Promise<GitLogItem[]> {
        return this.ajax({ action: "git/log/:path", req: { path } });
    }
    gitShow(sha: string): Promise<GitShow> {
        return this.ajax<GitShow>({ action: "git/show/:sha", req: { sha } }).then(res => {
            //TODO: numify numbers on the backend
            res.files.forEach(t => {
                t.added = Number(t.added);
                t.removed = Number(t.removed);
            });
            return res;
        });
    }
    gitGrep(search: string): Promise<GitGrepItem[]> {
        return this.ajax<GitGrepItem[]>({ action: "git/grep/:search", req: { search } }).then(res => {
            res.forEach(item => {
                item.matches.forEach(match => {
                    match.line_num = Number(match.line_num);
                });
            });
            return res;
        });
    }


    setTimeout(ms?: number): Promise<any> {
        if (ms == null)
            ms = 0;
        return new Promise((resolve, reject) => setTimeout(resolve, ms));
    }

    ajax<T>(op: OpReq): Promise<T> {
        let action = op.action;
        let req = op.req;
        let cfg: JQueryAjaxSettings = {
            url: this.url + action,
            method: "GET",
        };
        if (req != null && Object.keys(req).some(key => req[key] != null && typeof (req[key]) == "object")) {
            cfg.method = "POST";
            cfg.data = JSON.stringify(req);
            cfg.contentType = "application/json";
        }
        else if (req != null && Object.keys(req).length > 0) {
            cfg.url += "?" + $.param(req);
        }
        return new Promise<T>((resolve, reject) => $.ajax(cfg).then(t => {
            resolve(t);
        }, e => {
            reject(e.responseJSON);
        }));
    }


}

export interface OpReq {
    action: string;
    req?: any;
}

export interface P5File {
    name?: string;
    path?: string;
    is_dir?: boolean;
    children?: P5File[];
    src?: string;
    href?: string;
    exists?: boolean;
}



export interface CritiqueLines {
    blank: number;
    comments: number;
    data: number;
    perl: number;
    pod: number;
    total: number;
}

export interface CritiqueViolations {
    total: number;
}

export interface CritiqueStatistics {
    lines: CritiqueLines;
    modules: number;
    statements: number;
    subs: number;
    violations: CritiqueViolations;
}

export interface CritiqueLocation {
    column: number;
    line: number;
}

export interface CritiqueSource {
    code: string;
    location: CritiqueLocation;
}

export interface CritiqueViolation {
    description: string;
    policy: string;
    severity: number;
    source: CritiqueSource;
}

export interface CritiqueResponse {
    statistics: CritiqueStatistics;
    violations: CritiqueViolation[];
}

export interface PerlDocRequest {
    name?: string;
    funcName?: string;
    format?: string;
}


export interface GitBlameItem {
    author: string,
    date: string,
    line_num: string,
    sha: string,
}

export interface PerlModuleClassify {
    is_core: boolean;
    is_local: boolean;
    name: string;
    path: string;
    url: string;
}


export interface GitLogItem {
    author: GitAuthor;
    date: string;
    message: string;
    sha: string;
}

export interface GitAuthor {
    email: string;
    name: string;
}

export interface GitShow {
    author: GitAuthor;
    date: string;
    files: GitShowFile[];
    message: string;
    sha: string;
}

export interface GitShowFile {
    action: string;
    path: string;
    added: number;
    removed: number;
}

export interface GitGrepItem {
    matches: GitGrepMatch[];
    path: string;
}
export interface GitGrepMatch {
    line: string;
    line_num: number;
}
export interface PathRequest {
    path: string;
}
export interface PerlResRequest {
    path: string;
    packageNames: string[];
}
/*
{matches: [{line: "use Bookings::Loader::DateTime; # load and fixup DateTime", line_num: "153"},…],…}
matches
:
[{line: "use Bookings::Loader::DateTime; # load and fixup DateTime", line_num: "153"},…]
0
:
{line: "use Bookings::Loader::DateTime; # load and fixup DateTime", line_num: "153"}
line
:
"use Bookings::Loader::DateTime; # load and fixup DateTime"
line_num
:
"153"
1
:
{line: "use DateTime::TimeZone;", line_num: "154"}
path
:
"apps/admin/affiliateadmin/affiliate.html"*/




    //pathJoin(basePath: string, ...paths: string[]) {
    //    let path = basePath;
    //    paths.forEach(t => {
    //        if (path.endsWith("/") && t.startsWith("/"))
    //            path += t.substr(1);
    //        else
    //            path += t;
    //    });
    //    return path;
    //}

    //urlEncodeIfNeeded(s: string): string {
    //    if (/^[a-zA-Z0-9\/\:\.]*$/.test(s))
    //        return s;
    //    return encodeURIComponent(s);
    //}
    //ajax<T>(opts: { method?: string, url: string, query?: any }): Promise<T> {
    //    let url2 = this.baseUrl + opts.url;
    //    if (opts.query != null) {
    //        let query = {};
    //        Object.keys(opts.query).forEach(key => query[key] = opts.query[key]);
    //        Object.keys(query).forEach(key => {
    //            let value = query[key];
    //            if (!url2.contains(":" + key)) {
    //                if (value == null)
    //                    delete query[key];
    //                return;
    //            }
    //            let urlValue: string;
    //            if (value instanceof Array) {
    //                let list: Array<any> = value;
    //                urlValue = list.map(t => this.urlEncodeIfNeeded(t)).join(",");
    //            }
    //            else if (value == null) {
    //                urlValue = "";
    //            }
    //            else {
    //                urlValue = this.urlEncodeIfNeeded(value);
    //            }
    //            url2 = url2.replaceAll(":" + key, urlValue);
    //            delete query[key];
    //        });
    //        let qs = $.param(query);
    //        if (qs != "")
    //            url2 += "?" + qs;
    //    }


    //    return new Promise((resolve, reject) => {
    //        $.ajax({ method: opts.method || "GET", url: url2, })
    //            .done(resolve)
    //            .fail(reject);
    //    });
    //}
