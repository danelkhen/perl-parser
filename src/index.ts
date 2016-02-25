"use strict";
$(main);
function main() {
    new IndexPage().main();
}

class IndexPage {

    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();
    tbUrl: JQuery;
    urlKey: string;
    main() {

        this.tbUrl = $("#tbUrl");
        this.urlKey = "perl-parser\turl";
        let lastUrl = localStorage[this.urlKey];
        if (lastUrl != null)
            this.tbUrl.val(lastUrl);
        this.tbUrl.change(e=> this.update());
        this.update();
    }

    update() {
        let filename = this.tbUrl.val();
        localStorage[this.urlKey] = filename;
        if (filename.length == 0)
            return;


        if (filename.startsWith("http")) {
            $.get(filename).then(data => {
                this.parse(filename, data);
            });
            return;
        }
        this.parse("noname.pm", filename);
    }

    parse(filename: string, data: string) {
        let codeEl = $(".code").empty().text(data);
        let file = new File2(filename, data);
        let tok = new Tokenizer();
        tok.file = file;
        tok.main();
        let parser = new Parser();
        parser.logger = new Logger();
        parser.reader = new TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = tok.tokens;
        codeEl.empty();
        tok.tokens.forEach(token=> {
            let span = $.create("span").addClass(token.type.name).text(token.value).appendTo(codeEl)[0];
            this.tokenToElement.set(token, span);
        });
        var statements = parser.doParse();
        console.log(statements);
        let unit = new Unit();
        unit.statements = statements;

        $(".tree").empty().getAppend("ul").append(this.createTree(this.createInstanceNode(unit)));
        //$.create("pre").text(stringifyNodes(statements)).appendTo("body")
    }

    onMouseOverNode(e: Event, node: AstNode) {
        $(".selected").removeClass("selected");
        if (node == null)
            return;
        $(e.target).closest(".self").addClass("selected");
        node.tokens.forEach(token => $(this.tokenToElement.get(token)).addClass("selected"));
        let el = this.tokenToElement.get(node.token);
        if (el != null) {
            let div = $(".code")[0];
            let top = div.scrollTop;
            let bottom = div.scrollTop + div.offsetHeight;
            let top2 = el.offsetTop;
            let bottom2 = el.offsetTop + el.offsetHeight;
            if (top2 < top)
                div.scrollTop = top2;
            else if (bottom2 > bottom)
                div.scrollTop = top2;
        }
    }

    //toAstNodeProp(prop: string, node: AstNode): AstNodeProp {
    //    let anp: AstNodeProp = { text: null, node: node, prop: prop, children: [] };
    //    if (node != null)
    //        anp.text = node.constructor.name
    //    else if (prop != null)
    //        anp.text = prop;
    //    else
    //        throw new Error();
    //    return anp;
    //}

    createInstanceNode(node: AstNode) {
        let anp: AstNodeProp = { text: node.constructor.name, node: node, children: [] };
        anp.children = Object.keys(node).select(prop=> this.createPropertyNode(node, prop)).exceptNulls();
        return anp;
    }

    createPropertyNode(parentNode: AstNode, prop: string) {
        let anp: AstNodeProp = { prop: prop, text: prop, node: null, children: [] };
        let value = parentNode[prop];
        if (value == null)
            return anp;
        if (value instanceof AstNode) {
            anp.children = [this.createInstanceNode(value)];
        }
        else if (value instanceof Array) {
            anp.children = value.where(t=> t instanceof AstNode).select(t=> this.createInstanceNode(t));
        }
        return anp;

    }
    //getChildNodes(node: AstNode): AstNodeProp[] {
    //    let list: AstNodeProp[] = [];
    //    Object.keys(node).forEach(key=> {
    //        let value = node[key];
    //        if (value == null)
    //            return;

    //        if (value instanceof AstNode) {
    //            let anp: AstNodeProp = this.toAstNodeProp(key, value);
    //            list.add(anp);
    //        }
    //        else if (value instanceof Array) {
    //            list.addRange(value.where(t=> t instanceof AstNode).select(t=> this.toAstNodeProp(key, t)));
    //        }
    //    });
    //    return list;
    //}

    createTree(node: AstNodeProp): HTMLElement {
        let li = $.create("li.node");
        let ul = $.create("ul.children");
        let span = li.getAppend("span.self").text(node.text);
        span.mouseover(e=> this.onMouseOverNode(e, node.node));
        if (node.children.length > 0) {
            li.addClass("collapsed");
            ul.append(node.children.select(t=> this.createTree(t)));
            li.append(ul);
            span.mousedown(e=> { li.toggleClass("collapsed"); li.toggleClass("expanded"); });
        }
        return li[0];
    }

}
function stringifyNodes(node) {
    let sb = [];
    function stringify(obj) {
        if (obj instanceof Array)
            return obj.forEach(stringify);
        if (typeof (obj) == "object") {
            if (obj instanceof Token) {
                stringify((<Token>obj).value);
            }
            if (obj instanceof AstNode) {
                sb.push(obj.constructor.name);
                Object.keys(obj).forEach(key=> {
                    let value = obj[key];
                    if (key != "token")
                        sb.push(key);
                    stringify(value);
                    sb.push("\n");
                });
            }
            return;
        }
        sb.push(JSON.stringify(obj));
    }
    stringify(node);
    return sb.join(" ");

}


interface AstNodeProp {
    node?: AstNode;
    prop?: string;
    text: string;
    children: AstNodeProp[];
}

interface Function {
    name: string;
}