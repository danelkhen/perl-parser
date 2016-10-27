"use strict";


export class PropertyChangeTracker<T> {
    constructor(public obj: T) {
    }
    props: Map<string, ObjProperty<T>> = new Map<string, ObjProperty<T>>();
    getPropName(prop: (obj: T) => any): string {
        let s = prop.toString();
        s = s.substringBetween("{", "}");
        let name = s.split(/[.;]/).map(t => t.trim()).last(t => t != "." && t != ";" && t != "");
        return name;
    }
    getProp(getter: (obj: T) => any, create?: boolean): ObjProperty<T> {
        let name = this.getPropName(getter);
        let prop = this.props.get(name);
        if (prop == null) {
            prop = new ObjProperty<T>();
            prop.obj = this.obj;
            prop.name = name;
            prop.getter = getter;
            prop.handlers = [];
            prop.underlyingValue = prop.value;
            Object.defineProperty(prop.obj, prop.name, {
                set: value => prop.set(value),
                get: () => prop.get(),
            });
            this.props.set(name, prop);
        }
        return prop;
    }
    on(getter: (obj: T) => any, handler: Function) {
        let prop = this.getProp(getter, true);
        prop.handlers.push(handler);
    }
    off(getter: (obj: T) => any, handler: Function) {
        let prop2 = this.getProp(getter, false);
        if (prop2 == null)
            return;
        prop2.handlers.remove(handler);
    }

}

export class ObjProperty<T> {
    obj: T;
    name: string;
    handlers: Function[];
    underlyingValue: any;
    getter: (obj: T) => any;
    get(): any {
        return this.underlyingValue;
    }
    set(value: any): void {
        this.underlyingValue = value;
        if (this.handlers != null && this.handlers.length > 0) 
            this.handlers.forEach(handler => handler());
    }

    get value() {
        return this.getter(this.obj);
    }
    set value(value: any) {
        (this.obj as any)[this.name] = value;
    }
}
