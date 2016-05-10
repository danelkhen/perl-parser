"use strict";

export class Monitor {
    private map = new WeakMap<Object, Object>();

    methodInvoked = new SimpleEventEmitter<MFuncCallEvent>();
    propSet = new SimpleEventEmitter<MPropSetEvent>();

    register(obj: any, enter?: PropValuePredicate) {
        if (obj == null)
            return;
        if (typeof (obj) != "object")
            return;
        if (obj instanceof Date)
            return;
        if (this.map.has(obj))
            return;

        let _monitor = this;
        this.map.set(obj);
        let _storage = {};
        let keys: string[];
        let protoKeys: string[];
        if (obj instanceof Array) {
            keys = [];
            protoKeys = ["push", "splice"];
        }
        else {
            keys = Object.getOwnPropertyNames(obj);
            protoKeys = Object.getOwnPropertyNames(obj.constructor.prototype);
        }
        let allKeys = keys.concat(protoKeys).distinct();
        allKeys.forEach(key => {
            let value = obj[key];
            let newValue = value;
            if (typeof (value) == "function") {
                let func: Function = value;
                let func2 = function () {
                    let res = func.apply(this, arguments);
                    _monitor.methodInvoked.emit({ type: "propset", obj: this, key, func, args: arguments });
                    return res;
                };
                value = func2;
                obj[key] = value;  //existing properties on prototype might refuse overwriting before this
            }
            _storage[key] = value;
            Object.defineProperty(obj, key, { set: function (value) { let prevValue = _storage[key]; _storage[key] = value; _monitor.propSet.emit({ obj: this, key, value, prevValue, type: "funccall" }); }, get: function () { return _storage[key]; }, });
            if (enter({ obj, key, value }))
                this.register(value);
        });
        if (enter != null && obj instanceof Array) {
            let list = <Array<any>>obj;
            list.forEach((t, i) => {
                if (enter({ obj, key: i, value: t }))
                    this.register(t);
            });
        }
    }
}

export class ChangeTracker {
    constructor(public root: Object) {
    }
    monitor: Monitor = monitor;
    objects: Map<Object, CtData>;
    //log: MEvent[];

    init() {
        this.objects = new Map<Object, CtData>();
        monitor.methodInvoked.attach(e => {
            let info = this.objects.get(e.obj);
            if (info == null)
                return;
            //this.log.push(e);
            if (e.obj instanceof Array) {
                let list = <Array<any>>e.obj;
                if (e.key == "push") {
                    let items = Array.from(e.args);
                    items.forEach(t => this.track(t));
                }
                else {
                    console.warn("NotImplemented: ", e.key);
                }
            }
        });
        monitor.propSet.attach(e => {
            if (!this.isTracked(e.obj))
                return;
            if (!this.enter(e))
                return;

            let currentValue = e.obj[e.key];
            this.track(e.value);
        });
        this.track(this.root);
    }
    isTracked(obj) {
        return this.objects.get(obj) != null;
    }

    track(obj) {
        let info = this.objects.get(obj);
        if (info != null) {
            info.refCount++;
            return;
        }
        this.objects.set(obj, { refCount: 1 });
        this.monitor.register(obj, this.enter);
    }
    untrack(obj) {
        let info = this.objects.get(obj);
        if (info == null)
            return;
        info.refCount--;
        if (info.refCount <= 0)
            this.objects.delete(obj);
    }
    enter: PropValuePredicate;

}

export interface ObjectChange<T> {
    added:T[];
    removed:T[];
    //changed:T[]
}
export interface CtData {
    refCount: number;
}

export interface PropValuePredicate {
    (e: { obj: any, key: string | number, value: any }): boolean;
}

export interface MEvent {
    type: string;
}

export interface MPropSetEvent extends MEvent {
    obj: Object;
    key: string;
    prevValue: any;
    value: any;
}
export interface MFuncCallEvent extends MEvent {
    obj: Object;
    key: string;
    func: Function;
    args: ArrayLike<any>;
}


export interface EventEmitter<T> {
    emit(args: T);
    attach(handler: (args: T) => any);
    detach(handler: (args: T) => any);
}

class SimpleEventEmitter<T> {
    handlers: Array<(args: T) => any> = [];
    emit(args: T) {
        this.handlers.forEach(h => h(args));
    }
    attach(handler: (args: T) => any) {
        this.handlers.add(handler);
    }
    detach(handler: (args: T) => any) {
        this.handlers.remove(handler);
    }
}

export let monitor: Monitor = new Monitor();

