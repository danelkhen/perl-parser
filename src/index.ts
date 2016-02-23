"use strict";
$(main);
function main() {
    new IndexPage().main();
}

class IndexPage {

    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();

    main() {
        let filename = "DateTime.pm";
        console.log(filename);
        //fs.readFile(filename, "utf8", (e, data) => { this.src = data; this.pos = 0; this.main2(); });
        $.get(filename).then(data => {
            let file = new File2(filename, data);
            let tok = new Tokenizer();
            tok.file = file;
            tok.main();
            let parser = new Parser();
            parser.logger = new Logger();
            parser.reader = new TokenReader();
            parser.reader.logger = parser.logger;
            parser.reader.tokens = tok.tokens;
            var statements = parser.doParse();
            console.log(statements);
            $("body").getAppend(".tree").getAppend("ul").append(this.createTree(statements[0]));
            let div = $.create(".code").appendTo("body")
            tok.tokens.forEach(token=> {
                let span = $.create("span").addClass(token.type.name).text(token.value).appendTo(div)[0];
                this.tokenToElement.set(token, span);
            });
            //$.create("pre").text(stringifyNodes(statements)).appendTo("body")

        });
    }

    onMouseOverNode(e: Event, node: AstNode) {
        $(".selected").removeClass("selected");
        $(e.target).closest(".self").addClass("selected");
        node.tokens.forEach(token => $(this.tokenToElement.get(token)).addClass("selected"));
        let el = this.tokenToElement.get(node.token);
        if (el != null) {
            el.scrollIntoView(false);
            //let code = $(".code")[0];
            //code.scrollTop += Math.floor(code.offsetHeight/2);
        }
    }

    createTree(node: AstNode): HTMLElement {
        let li = $.create("li.node");
        let ul = $.create("ul.children");
        let span = li.getAppend("span.self").text(node.constructor.name);
        //span.getAppend(".icon");
        //span.getAppend(".text")
        span.mouseover(e=> this.onMouseOverNode(e, node));
        let childNodes = node.getChildNodes();
        if (childNodes.length > 0) {
            li.addClass("collapsed");
            ul.append(childNodes.select(t=> this.createTree(t)));
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

interface Function {
    name: string;
}