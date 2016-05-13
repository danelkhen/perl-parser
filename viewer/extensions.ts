interface Function {
    name: string;
}


declare class Proxy<T> {
    constructor(target: T, handler: ProxyHandler<T>);
}

declare interface ProxyHandler<T> {
    /** A trap for Object.getPrototypeOf. */
    getPrototypeOf?();
    /**A trap for Object.setPrototypeOf. */
    setPrototypeOf?();
    /**A trap for Object.isExtensible.*/
    isExtensible?();
    /**A trap for Object.preventExtensions.*/
    preventExtensions?();
    /**A trap for Object.getOwnPropertyDescriptor.*/
    getOwnPropertyDescriptor?(oTarget:T, sKey:string);
    /**A trap for Object.defineProperty.*/
    defineProperty?(oTarget:T, sKey:string, oDesc);
    /**A trap for the in operator.*/
    has?(oTarget:T, sKey:string);
    /**A trap for getting property values.*/
    get?(oTarget:T, sKey:string);
    /**A trap for setting property values.*/
    set?(oTarget:T, sKey:string, vValue);
    /**A trap for the delete operator.      */
    deleteProperty?(oTarget:T, sKey:string);
    /**A trap for Object.getOwnPropertyNames.*/
    ownKeys?(oTarget:T, sKey:string);
    /**A trap for a function call.*/
    apply?();
    /**A trap for the new operator.*/
    construct?();
    
    enumerate?(oTarget:T, sKey:string);
}