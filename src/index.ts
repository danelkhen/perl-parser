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
    firstTime: boolean = true;
    main() {
        this.tbUrl = $("#tbUrl");
        this.urlKey = "perl-parser\turl";
        this.tbRegex = $("#tbRegex");
        $("#btnRefactor").click(e=> this.refactor());
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
        if (lastUrl != null && lastUrl != "")
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
    unit: Unit;
    tokens: Token[];
    generatedCode: string;

    parse(filename: string, data: string) {
        if (localStorage.getItem("pause") == "1" && this.firstTime) {
            console.warn("not running parse, last time crashed unexpectedly");
            this.firstTime = false;
            return;
        }
        this.firstTime = false;
        this.code = data;
        let codeEl = $(".code").empty().text(data);
        let file = new File2(filename, data);
        let tok = new Tokenizer();
        tok.file = file;
        localStorage.setItem("pause", "1");
        safeTry(() => tok.main()).catch(e=> console.error(e)).then(() => {
            let parser = new Parser();
            parser.logger = new Logger();
            parser.reader = new TokenReader();
            parser.reader.logger = parser.logger;
            parser.reader.tokens = tok.tokens;
            parser.init();

            this.tokens = tok.tokens;
            this.renderTokens();

            var statements = parser.doParse();
            console.log(statements);
            let unit = new Unit();
            unit.statements = statements;
            this.unit = unit;

            this.renderTree();

            this.generateCode();
            localStorage.removeItem("pause");

            this.renderGeneratedCode();

        });
        //$.create("pre").text(stringifyNodes(statements)).appendTo("body")
    }

    generateCode() {
        let writer = new AstWriter();
        writer.main();
        writer.write(this.unit);
        this.generatedCode = writer.sb.join("");
    }

    render() {
        $(".code").empty().text(this.code);
        this.renderTokens();
        this.renderGeneratedCode();
        this.renderTree();
    }
    renderTree() {
        $(".tree").empty().getAppend("ul").append(this.createTree(this.createInstanceNode(this.unit)));
    }
    renderTokens() {
        let codeEl = $(".code");
        codeEl.empty();
        if (this.tokens == null || this.tokens.length == 0)
            return;
        this.tokens.forEach(token=> {
            let span = $.create("span").addClass(token.type.name).text(token.value).appendTo(codeEl)[0];
            this.tokenToElement.set(token, span);
        });
        this.renderLineNumbers(this.tokens.last().range.end.line);
    }
    renderGeneratedCode() {
        $(".generated-code").val(this.generatedCode);
    }

    refactor() {
        new AstNodeFixator().process(this.unit);
        new FindEvalsWithout1AtTheEnd().process(this.unit);
        this.generateCode();
        this.render();
    }

    onMouseOverNode(e: Event, node: TreeNodeData) {
        $(".selected").removeClass("selected");
        //let obj = node.obj;
        //if (obj == null)
        //    return;
        //if (!(obj instanceof AstNode))
        //    return;
        let tokens = this.getTokens(node.value, true);
        if (tokens.length == 0)
            tokens = this.getTokens(node.obj, true);

        //let astNode = <AstNode>obj;
        $(e.target).closest(".self").addClass("selected");
        tokens.forEach(token => $(this.tokenToElement.get(token)).addClass("selected"));
        let el = this.tokenToElement.get(tokens[0]);
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

    createInstanceNode(obj: Object) {
        if (typeof (obj) != "object") {
            let anp2: TreeNodeData = { text: obj.constructor.name, value: obj, children: [] };
            return anp2;
        }
        let anp: TreeNodeData = { text: obj.constructor.name, obj: obj, children: [] };
        if (obj instanceof Token) {
            anp.text = obj.type.name + " { Token }";
            return anp;
        }
        anp.children = Object.keys(obj).select(prop=> this.createPropertyNode(obj, prop)).exceptNulls();
        return anp;
    }

    createPropertyNode(parentObj: Object, prop: string) {
        if (["parentNode", "parentNodeProp", "tokens", "token", "isStatement", "isExpression"/*, "whitespaceBefore", "whitespaceAfter"*/].contains(prop))
            return null;
        let anp: TreeNodeData = { prop: prop, text: prop, obj: parentObj, children: [], value: parentObj[prop] };
        if (anp.value == null)
            return anp;
        if (typeof (anp.value) == "object") {
            if (anp.value instanceof Array)
                anp.children = anp.value.select(t=> this.createInstanceNode(t));
            else
                anp.children = [this.createInstanceNode(anp.value)];
        }
        return anp;

    }

    createTree(node: TreeNodeData): HTMLElement {
        let li = $.create("li.node");
        let ul = $.create("ul.children");
        let span = li.getAppend("span.self").text(node.text);
        span.mouseover(e=> this.onMouseOverNode(e, node));
        if (node.children.length > 0) {
            li.addClass("collapsed");
            ul.append(node.children.select(t=> this.createTree(t)));
            li.append(ul);
            span.mousedown(e=> { li.toggleClass("collapsed"); li.toggleClass("expanded"); });
        }
        return li[0];
    }

    getTokens(obj: any, deep: boolean): Token[] {
        if (obj == null)
            return [];
        if (typeof (obj) != "object")
            return [];
        if (obj instanceof Token) {
            return [obj];
        }
        else if (obj instanceof Array) {
            if (deep)
                return obj.select(t=> this.getTokens(t, false));
            return obj.where(t=> t instanceof Token);
        }
        else { // if (obj instanceof AstNode)
            if (deep)
                return Object.keys(obj).selectMany(value=> this.getTokens(obj[value], false));
            return [];
        }
        console.log("can't getTokens for", obj);
        return null;
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


interface TreeNodeData {
    obj?: Object;
    prop?: string;
    value?: any;
    text: string;
    children: TreeNodeData[];
}

interface Function {
    name: string;
}



class FindEvalsWithout1AtTheEnd {
    getChildren(node: AstNode): AstNode[] {
        let list: AstNode[] = [];
        Object.keys(node).where(key=> key != "parentNode").select(key=> node[key]).forEach(obj=> {
            if (obj instanceof Array)
                list.addRange(obj.where(t=> t instanceof AstNode));
            else if (obj instanceof AstNode)
                list.add(obj);
        });
        return list;
    }
    getDescendants(node: AstNode) {
    }
    first(node: AstNode, predicate: (node: AstNode) => boolean): AstNode {
        let children = this.getChildren(node);
        for (let child of children) {
            if (predicate(child))
                return child;
            let res = this.first(child, predicate);
            if (res != null)
                return res;
        }
        return null;
    }
    process(root: AstNode) {
        let node = <NativeInvocation_BlockOrExpr>this.first(root, t=> t instanceof NativeInvocation_BlockOrExpr && t.keywordToken.value == "eval");
        let lastStatement = node.block.statements.last();
        let valueExp = <ValueExpression>(<ExpressionStatement>lastStatement).expression;
        let endsWithOne = valueExp.token.value == "1";
        console.log("this eval ends with 1; ?", endsWithOne);
        if (endsWithOne)
            return;
        node.block.statements.add(CodeBuilder.value("1").statement());// new ExpressionStatement());
        //this.replaceNode(node, node.block || node.expr);

    }

    replaceNode(oldNode: AstNode, newNode: AstNode) {
        let parentNode = oldNode.parentNode;
        let prop = oldNode.parentNodeProp;
        let value = parentNode[prop];
        if (value instanceof Array) {
            let index = value.indexOf(oldNode);
            value[index] = newNode;
        }
        else {
            parentNode[prop] = newNode;
        }
        newNode.parentNode = parentNode;
        newNode.parentNodeProp = prop;
    }
}


class CodeBuilder<T extends AstNode> {
    constructor(public node?: T) {
    }
    static value(value: any): CodeBuilder<ValueExpression> {
        let node = new ValueExpression();
        node.token = TokenTypes.string.create2(JSON.stringify(value));
        node.value = value;
        return new CodeBuilder(node);
    }
    statement(): Statement {
        let node = new ExpressionStatement();
        node.expression = <Expression><any>this.node;
        node.semicolonToken = TokenTypes.semicolon.create2(";");
        node.whitespaceBefore = [TokenTypes.whitespace.create2("    ")];
        node.whitespaceAfter = [TokenTypes.whitespace.create2("\n    ")];
        return node;
    }

}
