"use strict";
$(main);
function main() {
    new IndexPage().main();
}

class IndexPage {

    tokenToElement: Map<Token, HTMLElement> = new Map<Token, HTMLElement>();

    main() {
        $("#tbUrl").change(e=> this.update());
        this.update();
    }
    update() {
        let filename = $("#tbUrl").val();
        if (filename.length == 0)
            return;
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
            let codeEl = $(".code").empty();
            tok.tokens.forEach(token=> {
                let span = $.create("span").addClass(token.type.name).text(token.value).appendTo(codeEl)[0];
                this.tokenToElement.set(token, span);
            });
            var statements = parser.doParse();
            console.log(statements);
            $(".tree").empty().getAppend("ul").append(this.createTree(statements[0]));
            //$.create("pre").text(stringifyNodes(statements)).appendTo("body")

        });
    }

    onMouseOverNode(e: Event, node: AstNode) {
        $(".selected").removeClass("selected");
        $(e.target).closest(".self").addClass("selected");
        node.tokens.forEach(token => $(this.tokenToElement.get(token)).addClass("selected"));
        let el = this.tokenToElement.get(node.token);
        if (el != null) {
            let div = $(".code")[0];
            let top = div.scrollTop;
            let bottom = div.scrollTop+div.scrollHeight;
            let top2 = el.offsetTop;
            let bottom2 = el.offsetTop+el.offsetHeight;
            console.log({top, bottom, top2, bottom2});
            if(top2<top)
                div.scrollTop = top2;
            else if(bottom2>bottom)
                div.scrollTop = top2;
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