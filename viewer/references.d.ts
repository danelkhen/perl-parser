/// <reference path="extensions.ts" />
/// <reference path="../libs/corex.d.ts" />
/// <reference path="../libs/corex-jquery.d.ts" />
/// <reference path="../typings/globals/jquery/index.d.ts" />
/// <reference path="../typings/globals/es6-shim/index.d.ts" />
/// <reference path="../typings/globals/ace/index.d.ts" />
/// <reference path="../built/perl-parser/perl-parser.d.ts" />
/// <reference path="../typings/globals/require/index.d.ts" />
/// <reference path="../ace/ace.d.ts" />

declare class Tooltip {
    constructor(opts?: TooltipOptions);
}

declare interface TooltipOptions {
    target: any;
    position?: string;
    content?: any;
    classes?: string;
}
