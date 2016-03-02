"use strict";
$(main);
function main() {
    new IndexPage().main();
}

class IndexPage {

    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();
    tbUrl: JQuery;
    tbRegex: JQuery;
    urlKey: string;
    code: string;
    main() {

        this.tbUrl = $("#tbUrl");
        this.urlKey = "perl-parser\turl";
        this.tbRegex = $("#tbRegex");
        this.tbRegex.keyup(e=> {
            let s = this.tbRegex.val();
            try {
                let regex = new Function("return " + s + ";")();
                let res = regex.exec(this.code);
                if (res instanceof Array)
                    console.log(JSON.stringify(res[0]), { regex: res });
                else
                    console.log(res);
            }
            catch (e) {
                console.log(e);
            }
        });
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

    renderLineNumbers(count: number) {
        let lineNumbers = $(".line-numbers").empty();
        for (let i = 0; i < count; i++) {
            lineNumbers.append($.create("div").text(i + 1));
        }
    }
    parse(filename: string, data: string) {
        this.code = data;
        let codeEl = $(".code").empty().text(data);
        let file = new File2(filename, data);
        let tok = new Tokenizer();
        tok.file = file;
        safeTry(() => tok.main()).catch(e=> console.error(e)).then(() => {
            let parser = new Parser();
            parser.logger = new Logger();
            parser.reader = new TokenReader();
            parser.reader.logger = parser.logger;
            parser.reader.tokens = tok.tokens;
            codeEl.empty();
            if (tok.tokens.length > 0) {
                tok.tokens.forEach(token=> {
                    let span = $.create("span").addClass(token.type.name).text(token.value).appendTo(codeEl)[0];
                    this.tokenToElement.set(token, span);
                });
                this.renderLineNumbers(tok.tokens.last().range.end.line);
            }
            var statements = parser.doParse();
            console.log(statements);
            let unit = new Unit();
            unit.statements = statements;
            $(".tree").empty().getAppend("ul").append(this.createTree(this.createInstanceNode(unit)));


            let writer = new AstWriter();
            writer.main();
            writer.write(unit);
            $(".generated-code").val(writer.sb.join(""));
        });
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