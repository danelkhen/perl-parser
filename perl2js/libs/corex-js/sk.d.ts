declare class JsObject<T> { }

declare interface JsFunc<R> { (): R; }
declare interface JsFunc1<T1, R> { (arg1: T1): R; }
declare interface JsFunc2<T1, T2, R> { (arg1: T1, arg2: T2): R; }
declare interface JsFunc3<T1, T2, T3, R> { (arg1: T1, arg2: T2, arg3: T3): R; }
declare interface JsFunc4<T1, T2, T3, T4, R> { (arg1: T1, arg2: T2, arg3: T3, arg4: T4): R; }
declare interface JsFunc5<T1, T2, T3, T4, T5, R> { (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5): R; }

declare interface JsAction { (): void; Trigger?(); }
declare interface JsAction1<T> { (arg: T): void; Trigger?(arg: T); }
declare interface JsAction2<T1, T2> { (arg1: T1, arg2: T2): void; }
declare interface JsAction3<T1, T2, T3> { (arg1: T1, arg2: T2, arg3: T3): void; }
declare interface JsAction4<T1, T2, T3, T4> { (arg1: T1, arg2: T2, arg3: T3, arg4: T4): void; }
declare interface JsAction5<T1, T2, T3, T4, T5> { (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5): void; }


declare class jQueryContext{}

declare function J(x: any):any;

declare class JsError extends Error {
}
declare class JsDateEx extends Date {
}
//declare var JsMath: Math;

declare class JsObjectEx extends Object {
}
declare class NotImplementedException extends Error {
}
