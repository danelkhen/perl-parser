declare var __hashKeyIndex: number;
declare class Q {
    static copy<T>(source: T, target2?: T, options?: any, depth?: any): T;
    static objectValuesToArray(obj: any): any[];
    static cloneJson(obj: any): any;
    static forEachValueInObject(obj: any, func: any, thisArg: any): void;
    static mapKeyValueInArrayOrObject(objOrList: any, func: any, thisArg: any): any[];
    static jMap(objOrList: any, func: any, thisArg: any): any[];
    static isEmptyObject(obj: any): boolean;
    static min(list: any): any;
    static max(list: any): any;
    static stringifyFormatted(obj: any): any;
    static _canInlineObject(obj: any): any;
    static _canInlineArray(list: any): boolean;
    static stringifyFormatted2(obj: any, sb: any): void;
    static bindFunctions(obj: Object): void;
    static parseInt(s: any): number;
    static parseFloat(s: any): number;
    static createSelectorFunction<T, R>(selector: any): any;
    static isNullOrEmpty(stringOrArray: any): boolean;
    static isNotNullOrEmpty(stringOrArray: any): boolean;
    static isNullEmptyOrZero(v: any): boolean;
    static isAny(v: any, vals: any): any;
}
interface ObjectConstructor {
    toArray(obj: Object): any[];
    allKeys(obj: Object): string[];
    keysValues(obj: any): Array<{
        key: string;
        value: any;
    }>;
    pairs(obj: any): any;
    fromPairs(keysValues: any): any;
    fromKeysValues(keysValues: any): any;
    reversePairs(obj: any): any;
    forEach(obj: any, keyValueAction: any): any;
    toSortedByKey(obj: any): any;
    getCreateArray(obj: any, p: any): any;
    jsonStringifyEquals(x: any, y: any): any;
    tryGet(obj: any, indexers: any): any;
    trySet(obj: any, indexers: any, value: any): any;
    select(obj: any, selector: any): any;
    deleteKeysWithValues(obj: any, keysValues: any): any;
    getHashKey(obj: any): any;
    values(obj: any): any;
    removeAll(obj: any, predicate: any): any;
    clear(obj: any): any;
}
interface ArrayConstructor {
    joinAll(lists: any, keySelector: any, resultSelector: any): any;
    outerJoin(list1: any, list2: any, keySelector1: any, keySelector2: any, resultSelector: any): any;
    outerJoinAll(lists: any, keySelector: any, resultSelector: any): any;
    forEachAll(lists: any, action: any): any;
    selectAll(lists: any, func: any): any;
    forEachTwice(list1: any, list2: any, action: any): any;
    selectTwice(list1: any, list2: any, func: any): any;
    generate(length: any, generator: any): any;
    wrapIfNeeded(obj: any): any;
    toArray<T>(arrayLike: any): T[];
    generateNumbers(from: number, until: number): number[];
    slice(): any;
    concat(): any;
    fromIterator(iterator: any): any;
}
interface Array<T> {
    takeWhile(pred: any): T[];
    isArrayOfPairs?: boolean;
    contains(obj: T): boolean;
    remove(obj: T): boolean;
    removeAt(index: number): any;
    take(count: number): T[];
    skip(count: number): T[];
    first(predicate?: (item: T, index?: number) => boolean): T;
    last(predicate?: (item: T, index?: number) => boolean): T;
    exceptNulls(): Array<T>;
    insert(index: number, item: T): any;
    toArray(): Array<T>;
    where(callbackfn: (value: T, index?: number, array?: T[]) => boolean, thisArg?: any): T[];
    removeAll<R>(callbackfn: (value: T, index?: number, array?: T[]) => boolean, thisArg?: any): void;
    select<R>(selector: (value: T, index?: number, array?: T[]) => R, thisArg?: any): R[];
    select<R>(selector: string, thisArg?: any): R[];
    selectMany<R>(callbackfn: (value: T, index: number, array: T[]) => R[], thisArg?: any): R[];
    orderBy<R>(selector: (value: T, index?: number, array?: T[]) => R, desc?: boolean, comparer?: Comparer): T[];
    orderBy<R>(selectors: Array<(value: T, index?: number, array?: T[]) => any>): T[];
    orderByDescending<R>(selector: (value: T, index?: number, array?: T[]) => R, desc?: boolean): T[];
    sortBy<R>(selector: (value: T, index?: number, array?: T[]) => R, desc?: boolean, comparer?: Comparer): T[];
    sortByDescending<R>(selector: (value: T, index?: number, array?: T[]) => R): any;
    groupBy<K>(callbackfn: (value: T, index?: number, array?: T[]) => K, thisArg?: any): Grouping<K, T>[];
    addRange(items: T[]): any;
    distinct(): T[];
    forEachJoin(action: any, actionBetweenItems: any): any;
    toArray(): any;
    insert(index: any, item: any): any;
    insertRange(index: any, items: any): any;
    toObject(selector: any): any;
    toObjectKeys(defaultValue: any): any;
    keysToObject(defaultValue: any): any;
    pairsToObject(selector: any): any;
    copyPairsToObject(obj: any): any;
    removeFirst(): any;
    removeRange(items: any): any;
    containsAny(items: any): any;
    any(predicate: any): any;
    forEachAsyncProgressive(actionWithCallback: any, finalCallback: any): any;
    whereEq(selector: any, value: any): any;
    whereNotEq(selector: any, value: any): any;
    firstEq(selector: any, value: any): any;
    firstNotEq(selector: any, value: any): any;
    addRange(items: any): any;
    diff(target: any): any;
    hasDiff(target: any): any;
    _forEachAsyncProgressive(actionWithCallback: any, finalCallback: any, index: any): any;
    mapAsyncProgressive(actionWithCallback: any, finalCallback: any): any;
    _mapAsyncProgressive(actionWithCallbackWithResult: any, finalCallback: any, index: any, results: any): any;
    mapWith(anotherList: any, funcForTwoItems: any): any;
    min(): any;
    max(): any;
    getEnumerator(): any;
    mapAsyncParallel(asyncFunc: any, finalCallback: any): any;
    forEachAsyncParallel(asyncFunc: any, finalCallback: any): any;
    clear(): any;
    itemsEqual(list: any): any;
    select(selector: any): any;
    selectInvoke(name: any): any;
    joinWith(list2: any, keySelector1: any, keySelector2: any, resultSelector: any): any;
    all(predicate: any): any;
    flatten(): any;
    selectToObject(keySelector: any, valueSelector: any): any;
    groupByToObject(keySelector: any, itemSelector: any): any;
    splitIntoChunksOf(countInEachChunk: any): any;
    avg(): any;
    sum(): any;
    skip(count: any): any;
    take(count: any): any;
    toSelector(): any;
    removeNulls(): any;
    exceptNulls(): T[];
    truncate(totalItems: number): any;
    random(): T;
    selectRecursive(selector: any, recursiveFunc: any): any;
    selectManyRecursive(selector: any, recursiveFunc: any): any;
    peek(predicate: any): any;
    removeLast(): any;
    add(item: T): any;
    forEachWith(list: T[], action: any): any;
    selectWith(list: T[], func: any): any;
    crossJoin(list2: T[], selector: any): any;
}
interface DateConstructor {
    fromUnix(value: any): any;
    today(): any;
    current(): any;
    create(y?: any, m?: any, d?: any, h?: any, mm?: any, s?: any, ms?: any): any;
    _parsePart(ctx: any, part: any, setter?: any): any;
    tryParseExact(s: any, formats: any): any;
    _tryParseExact(s: any, format: any): any;
    tryParseJsonDate(s: any): any;
    roundUsing(mathOp: any, date: any, part: any, precision: any): any;
    _dowNames: any;
    _dowNamesAbbr: any;
    _monthNames: any;
    _monthNamesAbbr: any;
    days: string[];
    _parts: any;
    _formatPartArgIndexes: any;
}
interface Date {
    _Kind: any;
    _parts: any;
    compareTo(value: any): any;
    year(value?: any): any;
    totalDays(): any;
    totalHours(): any;
    totalMinutes(): any;
    totalSeconds(): any;
    month(value?: any): any;
    day(value?: any): any;
    hour(value?: any): any;
    minute(value?: any): any;
    second(value?: any): any;
    ms(value?: any): any;
    toUnix(): any;
    dayOfWeek(): any;
    toLocalTime(): any;
    toUniversalTime(): any;
    subtract(date: any): any;
    Subtract$$DateTime(value: any): any;
    Subtract$$TimeSpan(value: any): any;
    format(format: any): any;
    clone(): any;
    addMs(miliseconds: any): any;
    addSeconds(seconds: any): any;
    addMinutes(minutes: any): any;
    addHours(hours: any): any;
    addDays(days: any): any;
    addWeeks(weeks: any): any;
    addMonths(months: any): any;
    addYears(years: any): any;
    removeTime(): any;
    hasTime(): any;
    hasDate(): any;
    removeDate(): any;
    extractTime(): any;
    extractDate(): any;
    equals(obj: any): any;
    GetHashCode(): any;
    getKind(): any;
    round(part: any, precision: any): any;
    floor(part: any, precision: any): any;
    ceil(part: any, precision: any): any;
    add(value: any, part: any): any;
}
interface FunctionConstructor {
    combine(f1: any, f2: any): any;
    _combined(funcs: any): any;
    lambda(exp: any): any;
    _lambda(exp: any): any;
    addTo(target: any, funcs: any): any;
    _lambda_cache: any;
}
interface Function {
    bindArgs(): any;
    toPrototypeFunction(): any;
    toStaticFunction(): any;
    toNew(): any;
    applyNew(args: any): any;
    callNew(varargs: any): any;
    getName(): any;
    addTo(target: any): any;
    comparers: Comparer[];
}
interface StringConstructor {
    isInt(s: any): any;
    isFloat(s: any): any;
}
interface String {
    every(callbackfn: (value: string, index: number, array: string) => boolean, thisArg?: any): boolean;
    endsWith(s: string): boolean;
    startsWith(s: string): boolean;
    forEach(action: (item: string, index?: number) => void): any;
    contains(s: string): boolean;
    replaceAll(token: string, newToken: string, ignoreCase?: boolean): string;
    replaceMany(finds: string, replacer: Function): any;
    truncateEnd(finalLength: number): any;
    truncateStart(finalLength: number): any;
    remove(index: number, length: number): any;
    insert(index: number, text: string): any;
    replaceAt(index: number, length: number, text: string): any;
    padRight(totalWidth: number, paddingChar?: string): any;
    padLeft(totalWidth: number, paddingChar?: string): any;
    toLambda(): any;
    toSelector(): any;
    substringBetween(start: string, end: string, fromIndex?: number): string;
    all(predicate: (item: string, index?: number) => boolean): boolean;
    every(): any;
    isInt(): boolean;
    isFloat(): boolean;
    last(predicate?: (item: string, index?: number) => boolean): string;
    splitAt(index: number): string[];
    lines(): string[];
}
interface NumberConstructor {
    generate(min: any, max: any, step: any): any;
    roundUsing(mathOp: any, x: any, precision: any): any;
}
interface Number {
    format(format: string): any;
    round(precision?: number): any;
    ceil(precision?: number): any;
    floor(precision?: number): any;
    isInt(): any;
    isFloat(): any;
    inRangeInclusive(min: any, max: any): any;
}
interface JSON {
    iterateRecursively(obj: any, action: any): any;
}
interface Math {
    randomInt(min: any, max: any): any;
}
interface ComparerConstructor {
}
interface Comparer {
    compare(x: any, y: any): any;
}
interface TimerConstructor {
}
interface Timer {
    set(ms: any): any;
    onTick(): any;
    clear(ms: any): any;
}
interface QueryStringConstructor {
    parse(query: any, obj: any, defaults: any): any;
    stringify(obj: any): any;
    write(obj: any, sb: any): any;
}
interface ValueOfEqualityComparerConstructor {
}
interface ValueOfEqualityComparer {
    equals(x: any, y: any): any;
    getHashKey(x: any): any;
}
interface Grouping<K, T> extends Array<T> {
    key: K;
}
declare class TimeSpan {
    constructor(ms: number);
}
interface Error {
    wrap?(e: Error): Error;
    innerError?: Error;
    causedBy?(e: Error): any;
}
declare class ArrayEnumerator<T> {
    list: Array<T>;
    constructor(list: Array<T>);
    index: number;
    moveNext: () => boolean;
    getCurrent: () => any;
}
declare class Comparer {
    static _default: Comparer;
}
declare class Timer {
    action: any;
    _ms: any;
    timeout: any;
    constructor(action: any, ms?: any);
}
declare class QueryString {
    static parse(query: any, obj: any, defaults: any): any;
    static stringify(obj: any): string;
    static write(obj: any, sb: any): void;
}
declare class ValueOfEqualityComparer {
}
declare function combineCompareFuncs(compareFuncs: any): (a: any, b: any) => any;
declare function createCompareFuncFromSelector(selector: any, desc: any): (x: any, y: any) => number;
declare function toStringOrEmpty(val: any): any;
declare class Dictionary<K, T> {
    _obj: any;
    count: any;
    keyGen: any;
    constructor();
    clear(): void;
    add(key: any, value: any): void;
    get(key: any): any;
    set(key: any, value: any): void;
    values(): any[];
}
declare class ComparerHelper {
    static combine(comparers: any[]): (x: any, y: any) => any;
    static _default(x: any, y: any): number;
    static createCombined(list: any): (x: any, y: any) => any;
    static create(selector: any, desc?: any, comparer?: any): (x: any, y: any) => any;
}
