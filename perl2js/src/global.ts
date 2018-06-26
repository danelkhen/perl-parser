import * as mason from "./mason.js"
import * as perl from "./perl.js"
import * as index from "./index.js"
import * as convert from "./convert.js"
import * as utils from "./utils.js"
import * as expressionParser from "./expression.js"

let modules = { perl, mason, index, convert, utils, expressionParser, };
let win: any = window;
win.modules = modules;
//Object.keys(modules).forEach(key => win[key] = modules[key]);

declare global {
    interface Hash<T> {
        [key: string]: T;
    }
}

