/// <reference path="../src/extensions.ts" />
"use strict";


export class P5Service {
    baseUrl = localStorage.getItem("p5-service-url");
    fs(path: string): Promise<P5File> {
        return this.ajax({ url: "fs/:path", query: { path } });
    }

    src(path: string): Promise<string> {
        return this.ajax({ url: "src/:path", query: { path } });
    }

    ajax<T>(opts: { method?: string, url: string, query?: any }): Promise<T> {
        let url2 = this.baseUrl + opts.url;
        Object.keys(opts.query).forEach(key => {
            url2 = url2.replaceAll(":" + key, opts.query[key]);
        });


        return new Promise((resolve, reject) => {
            $.ajax({ method: opts.method, url: url2, })
                .done(resolve)
                .fail(reject);
        });
    }
}

interface P5File {
    name?:string;
    path?:string;
    is_dir?:string;
    children?:P5File[];

}
