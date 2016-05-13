/// <reference path="extensions.ts" />
/// <reference path="../libs/corex.d.ts" />
/// <reference path="../libs/corex-jquery.d.ts" />
/// <reference path="../typings/browser/ambient/jquery/index.d.ts" />
/// <reference path="../typings/browser/ambient/codemirror/index.d.ts" />
/// <reference path="../typings/browser/ambient/es6-shim/index.d.ts" />

declare class Tooltip {
    constructor(opts?: TooltipOptions);
}

declare interface TooltipOptions {
    target: any;
    position?: string;
    content?: any;
    classes?: string;
}
