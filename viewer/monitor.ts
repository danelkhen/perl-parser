"use strict";

export class Monitor {
    private map = new WeakMap<Object, Object>();

    methodInvoked = new SimpleEventEmitter<MethodInvokedEventArgs>();
    propSet = new SimpleEventEmitter<PropSetEventArgs>();

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
                    _monitor.methodInvoked.emit({ obj: this, key, func, args: arguments });
                    return res;
                };
                value = func2;
                obj[key] = value;  //existing properties on prototype might refuse overwriting before this
            }
            _storage[key] = value;
            Object.defineProperty(obj, key, { set: function (value) { _storage[key] = value; _monitor.propSet.emit({ obj: this, key, value }); }, get: function () { return _storage[key]; }, });
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

class ChangeTracker {
    constructor(public monitor: Monitor, public root: Object) {
        monitor.methodInvoked.attach(e => {

        });
        monitor.propSet.attach(e => {
        });
    }
    register(obj) {
        this.monitor.register(obj, this.enter);
    }
    enter: PropValuePredicate;

}

export interface PropValuePredicate {
    (e: { obj: any, key: string | number, value: any }): boolean;
}

export interface PropSetEventArgs {
    obj: Object;
    key: string;
    value: any;
}
export interface MethodInvokedEventArgs {
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

export let monitor = new Monitor();

