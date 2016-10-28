/// <reference path="../corex-js/corex.d.ts" />
interface JQueryStatic {
    create(selector: string): JQuery;
}
interface JQuery {
    getAppendRemoveForEach<T>(selector: string, list: Array<T>, action: (el: JQuery, obj: T) => void): any;
    toArray<T>(): Array<T>;
    toArray$(): Array<JQuery>;
}
declare class jQueryHelper {
    static _svgElements: {
        altGlyph: number;
        altGlyphDef: number;
        altGlyphItem: number;
        animate: number;
        animateColor: number;
        animateMotion: number;
        animateTransform: number;
        circle: number;
        clipPath: number;
        "color-profile": number;
        cursor: number;
        defs: number;
        desc: number;
        ellipse: number;
        feBlend: number;
        feColorMatrix: number;
        feComponentTransfer: number;
        feComposite: number;
        feConvolveMatrix: number;
        feDiffuseLighting: number;
        feDisplacementMap: number;
        feDistantLight: number;
        feFlood: number;
        feFuncA: number;
        feFuncB: number;
        feFuncG: number;
        feFuncR: number;
        feGaussianBlur: number;
        feImage: number;
        feMerge: number;
        feMergeNode: number;
        feMorphology: number;
        feOffset: number;
        fePointLight: number;
        feSpecularLighting: number;
        feSpotLight: number;
        feTile: number;
        feTurbulence: number;
        filter: number;
        font: number;
        "font-face": number;
        "font-face-format": number;
        "font-face-name": number;
        "font-face-src": number;
        "font-face-uri": number;
        foreignObject: number;
        g: number;
        glyph: number;
        glyphRef: number;
        hkern: number;
        image: number;
        line: number;
        linearGradient: number;
        marker: number;
        mask: number;
        metadata: number;
        "missing-glyph": number;
        mpath: number;
        path: number;
        pattern: number;
        polygon: number;
        polyline: number;
        radialGradient: number;
        rect: number;
        script: number;
        set: number;
        stop: number;
        style: number;
        svg: number;
        "switch": number;
        symbol: number;
        text: number;
        textPath: number;
        title: number;
        tref: number;
        tspan: number;
        use: number;
        view: number;
        vkern: number;
    };
    static parseSelector(s: any): any;
    static createElementFromSelector(selector: any): any;
    static createElementFromSelectorNode(node: any): any;
    static getOrAppendChildBySelector(parentEl: any, selector: any, options: any): JQuery;
}
declare function jQueryHelper2(): void;
interface JQueryStatic {
    create(selector: string): any;
    fromArray$(list: JQuery[]): any;
    whenAll(list: any): any;
}
interface JQuery {
    bindChildrenToList<T>(selector: string, list: Array<T>, action: (el: JQuery, obj: T, index: number) => void): JQuery;
    getAppendRemoveForEach<T>(selector: string, list: Array<T>, action: (el: JQuery, obj: T) => void): JQuery;
    getAppendRemove<T>(selector: string, total: number): JQuery;
    getAppend(selector: string): JQuery;
    toArray$(): Array<JQuery>;
    val2(value?: any): any;
    generator<T>(func: (obj: T) => JQuery): JQuery;
    generator<T>(): (obj: T) => JQuery;
    zip<T>(list: T[], opts?: Object): BoundJQuery<T>;
    dataItem(obj?: any): any;
}
interface BoundJQuery<T> extends JQuery {
    toArray$(): Array<BoundJQuery<T>>;
    dataItem(): T;
    existing(): BoundJQuery<T>;
    added(): BoundJQuery<T>;
    removed(): BoundJQuery<T>;
}
