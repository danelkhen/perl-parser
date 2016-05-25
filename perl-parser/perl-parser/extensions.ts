interface RegExp {
    execFrom(index: number, s: string): RegExpExecArray;
    testFrom(index: number, s: string): boolean;
}

RegExp.prototype.execFrom = function (index: number, s: string): RegExpExecArray {
    let re: RegExp = this;
    re.lastIndex = index;
    return re.exec(s);
}
RegExp.prototype.testFrom = function (index: number, s: string): boolean {
    let re: RegExp = this;
    re.lastIndex = index;
    return re.test(s);
}



interface Array<T> {
    withItemBetweenEach<R>(item: R): Array<T | R>;
    ofType<R extends T>(type: Type<R>): Array<R>;
    selectFirst<V>(selector: (item: T) => V, predicate: (item: T) => boolean): V;
    selectFirstNonNull<V>(selector: (item: T) => V): V;
    reversed(): T[];
}
Array.prototype.ofType = function (ctor) {
    return this.where(t=> t instanceof ctor);
}

Array.prototype.withItemBetweenEach = function (item) {
    let list = [];
    for (let i = 0; i < this.length; i++) {
        if (i > 0)
            list.push(item);
        list.push(this[i]);
    }
    return list;
}
Array.prototype.selectFirstNonNull = function (selector) {
    return this.selectFirst(selector, t=> t != null);
}
Array.prototype.selectFirst = function (selector, predicate) {
    for (let i = 0; i < this.length; i++) {
        let item = this[i];
        let res = selector(item);
        if (predicate(res))
            return res;
    }
    return null;
}
Array.prototype.reversed = function () {
    let x = this.toArray();
    x.reverse();
    return x;
}

interface Type<T> {
    new (): T;
}
