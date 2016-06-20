﻿import {FunctionHelper} from "./common";

export function isPromise(obj: any): boolean {
    return obj != null && obj.then && obj.catch;
}
export class Template {
    static tags: Map<string, string> = new Map<string, string>();
    static registerTag(tag: string, html: string) {
        this.tags.set(tag.toUpperCase(), html);
    }
    static compileTemplateString(s: string) {
        if (s.startsWith("{{") && s.endsWith("}}")) {
            let code = s.substring(2, s.length - 2);
            return this.compileTemplateExpression(code);
        }
        return null;
    }
    static compileTemplateExpression(code: string) {
        let parsed = FunctionHelper.parse(code);
        if (parsed != null && parsed.type == "ArrowExpressionFunction") {
            let body = parsed.body;
            let prmsAndBody = parsed.prms.toArray();
            prmsAndBody.push("return " + body);
            let func = Function.apply(null, prmsAndBody);
            return func;
        }
        let func = new Function("___", "return ___." + code);
        return func;
    }

    static onPromise(promise: Promise<any>): Promise<any> { return promise; }
    static dataBind(node: Node, obj: any, thisContext: any) {
        if (node.nodeType == 3) {
            let s = node.nodeValue;
            if ((node.nextSibling != null || node.previousSibling != null) && s.trim() == "") {
                node.parentElement.removeChild(node);
                return;
            }
            let func = this.compileTemplateString(s);
            if (func != null)
                node.nodeValue = func.call(thisContext, obj);
        }
        else if (node.nodeType == 1) {
            let el = <HTMLElement>node;
            let ignoreAtt = el.getAttribute("_ignore");
            if (ignoreAtt != null)
                return;
            let tmpl = this.tags.get(el.nodeName);
            if (tmpl != null && el.childNodes.length == 0) {
                el.innerHTML = tmpl;
            }
            let ifAtt = el.getAttribute("_if");
            let forAtt = el.getAttribute("_for");
            if (ifAtt != null) {
                let func = this.compileTemplateExpression(ifAtt);
                let res = func.call(thisContext, obj);
                if (!res) {
                    el.style.display = "none";
                    return;
                }
                else {
                    el.style.display = "";
                }
            }
            if (forAtt != null) {
                let sourceFunc = this.compileTemplateExpression(forAtt);
                let source = sourceFunc.call(thisContext, obj);
                this.repeat(el, source, thisContext);
                return;
            }
            let atts = Array.from(node.attributes);
            atts.forEach(att => {
                if (att.name.startsWith("_")) {
                    let func = this.compileTemplateExpression(att.value);
                    if (att.name.startsWith("_on")) {
                        let evName = att.name.substr(3);
                        let evFullName = evName + ".templator";
                        $(el).off(evFullName).on(evFullName, e => {
                            let res = func.call(thisContext, e, obj);
                            if (isPromise(res)) {
                                res = this.onPromise(res);
                            }
                            return res;
                        });
                    }
                    else {
                        let res = func.call(thisContext, obj);
                        let propName = att.name.substr(1);
                        if (propName == "class")
                            propName = "className";
                        node[propName] = res;
                    }
                    return;
                }
                let func = this.compileTemplateString(att.value);
                if (func != null) {
                    let res = func.call(thisContext, obj);
                    let propName = att.name;
                    if (propName == "class")
                        propName = "className";
                    node[propName] = res;
                }
            });
            Array.from(node.childNodes).forEach(t => this.dataBind(t, obj, thisContext));
        }
    }
    static repeat(el: any, list: any[], thisContext: any) {
        let el2: JQuery;
        if (typeof (el) == "string")
            el2 = $(el + ".template");
        else
            el2 = $(el);

        if (el2.length == 0) {
            console.warn("can't find template", el);
            return;
        }

        let els2: HTMLElementEx[] = el2.siblings(".template-instance").toArray();
        if (list != null) {
            let els = list.select(obj => {
                let el4 = els2.first(t => t._data == obj);
                if (el4 == null) {
                    let el3 = el2.clone().removeAttr("_for");
                    el4 = el3[0];
                    el4._data = obj;
                    el3.removeClass("template").addClass("template-instance");
                }
                else {
                    els2.remove(el4);
                }
                this.dataBind(el4, obj, thisContext);
                return el4;
            });
            $(els2).remove();
            el2.after(els);
        }
        else {
            $(els2).remove();
        }
    }
    //static initTemplate(el: HTMLElement, ctl: Object) {
    //    this.dataBind(el, ctl, ctl);
    //}

    //static initTemplate2(el: HTMLElement, ctl: Object) {
    //    let tracker = new ChangeTracker(ctl);
    //    tracker.enter = e => {
    //        if (e.value == null)
    //            return true;
    //        let ctor = e.value.constructor;
    //        let allowed: any[] = [Object, Array, Number, Boolean, String, Function];
    //        let enter = allowed.contains(ctor);
    //        return enter;
    //    };
    //    tracker.init();
    //}
}


interface HTMLElementEx extends HTMLElement {
    _data?: any;
}