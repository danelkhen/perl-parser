/// <reference path="../src/extensions.ts" />
"use strict";


export class P5Service {
    baseUrl = localStorage.getItem("p5-service-url") || "";
    fs(path: string): Promise<P5File> {
        return this.ajax({ url: "fs/:path", query: { path } });
    }

    src(path: string): Promise<string> {
        return this.ajax({ url: "src/:path", query: { path } });
    }

    critique(path: string): Promise<CritiqueResponse> {
        return this.ajax({ url: "critique/:path", query: { path } });
    }

    gitBlame(path: string): Promise<GitBlameItem[]> {
        return this.ajax({ url: "git/blame/:path", query: { path } });
    }


    ajax<T>(opts: { method?: string, url: string, query?: any }): Promise<T> {
        let url2 = this.baseUrl + opts.url;
        Object.keys(opts.query).forEach(key => {
            url2 = url2.replaceAll(":" + key, opts.query[key]);
        });


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
    is_dir?: string;
    children?: P5File[];
    src?: string;

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


export interface GitBlameItem {
    author:string,
    date:string,
    line_num:string,
    sha:string,
}