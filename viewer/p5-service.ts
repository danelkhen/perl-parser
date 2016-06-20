"use strict";

export class P5Service {
    baseUrl = localStorage.getItem("p5-service-url") || `${location.protocol}//${location.host}//`;
    fs(path: string): Promise<P5File> {
        return this.ajax({ url: "fs/:path", query: { path } });
    }

    src(path: string): Promise<string> {
        return this.ajax({ url: "src/:path", query: { path } });
    }

    perlCritique(path: string): Promise<CritiqueResponse> {
        return this.ajax({ url: "perl/critique/:path", query: { path } });
    }
    perlDocHtml(req: PerlDocRequest): Promise<string> {
        return this.ajax({ url: "perl/doc/:name", query: { name: req.name, f: req.funcName } });
    }
    perlModuleClassify(packageNames: string[]): Promise<PerlModuleClassify[]> {
        if (packageNames.length == 0)
            return Promise.resolve([]);
        return this.ajax({ url: "perl/module/classify/:packageNames", query: { packageNames } });
    }

    gitBlame(path: string): Promise<GitBlameItem[]> {
        return this.ajax({ url: "git/blame/:path", query: { path } });
    }

    gitLog(path: string): Promise<GitLogItem[]> {
        return this.ajax({ url: "git/log/:path", query: { path } });
    }
    gitShow(sha: string): Promise<GitShow> {
        return this.ajax<GitShow>({ url: "git/show/:sha", query: { sha } }).then(res => {
            //TODO: numify numbers on the backend
            res.files.forEach(t => {
                t.added = Number(t.added);
                t.removed = Number(t.removed);
            });
            return res;
        });
    }
    gitGrep(search: string): Promise<GitGrepItem[]> {
        return this.ajax<GitGrepItem[]>({ url: "git/grep/:search", query: { search } }).then(res => {
            res.forEach(item => {
                item.matches.forEach(match => {
                    match.line_num = Number(match.line_num);
                });
            });
            return res;
        });
    }

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

    urlEncodeIfNeeded(s: string): string {
        if (/^[a-zA-Z0-9\/\:\.]*$/.test(s))
            return s;
        return encodeURIComponent(s);
    }
    ajax<T>(opts: { method?: string, url: string, query?: any }): Promise<T> {
        let url2 = this.baseUrl + opts.url;
        if (opts.query != null) {
            let query = {};
            Object.keys(opts.query).forEach(key => query[key] = opts.query[key]);
            Object.keys(query).forEach(key => {
                let value = query[key];
                if (!url2.contains(":" + key)) {
                    if (value == null)
                        delete query[key];
                    return;
                }
                let urlValue: string;
                if (value instanceof Array) {
                    let list: Array<any> = value;
                    urlValue = list.map(t => this.urlEncodeIfNeeded(t)).join(",");
                }
                else if (value == null) {
                    urlValue = "";
                }
                else {
                    urlValue = this.urlEncodeIfNeeded(value);
                }
                url2 = url2.replaceAll(":" + key, urlValue);
                delete query[key];
            });
            let qs = $.param(query);
            if (qs != "")
                url2 += "?" + qs;
        }


        return new Promise((resolve, reject) => {
            $.ajax({ method: opts.method || "GET", url: url2, })
                .done(resolve)
                .fail(reject);
        });
    }
}

export interface P5File {
    name?: string;
    path?: string;
    is_dir?: boolean;
    children?: P5File[];
    src?: string;
    href?: string;
    exists?:boolean;
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