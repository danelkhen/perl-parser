export function arrayMin<T>(list: T[], selector: (item: T, index?: number) => any): T {
    let min = undefined;
    let minItem = undefined;
    let first = true;
    for (let item of list) {
        if (first) {
            first = false;
            min = selector(item);
            minItem = item;
            continue;
        }
        let value = selector(item);
        if (value < min) {
            min = value;
            minItem = item;
        }
    }
    return minItem;
}


function escapeHtml(string: string): string {
    var entityMap: any = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}


export function* regexExec(regex: RegExp, s: string): IterableIterator<RegExpExecArray> {
    while (true) {
        let match = regex.exec(s);
        if (match == null)
            return;
        yield match;
    }
}


export function pathJoin(x: string, y: string): string {
    let tokens = x.split('/');
    tokens.removeLast();
    let tokens2 = y.split('/');
    tokens.push(...tokens2)
    return tokens.join("/");
    //let url = new URL(x, location.href)
    //let url2 = new URL(y, url.toString());
    //console.log("pathjoin", {x,y, url, url2});
    //return url2.pathname;
}

export function xhr(req: { method: string, url: string }): Promise<any> {
    return new Promise((resolve, reject) => {
        let { method, url, } = req;
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(xhr.response);
        xhr.send();
    });
}

export class ArrayItem<T> {
    constructor(public list: T[], public index: number, public emptyValue: T) {

    }

    get(index: number) {
        return new ArrayItem<T>(this.list, index, this.emptyValue);
    }

    get value(): T {
        if (this.index >= this.list.length || this.index < 0)
            return this.emptyValue;
        return this.list[this.index];
    }
    get prev(): ArrayItem<T> {
        return this.get(this.index - 1);
    }
    get next(): ArrayItem<T> {
        return this.get(this.index + 1);
    }

}
export function sleep(ms?: number): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms || 0));
}