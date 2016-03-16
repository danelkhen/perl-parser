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


        if (filename.startsWith("http") || filename.startsWith("./")) {
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
        //new FindEvalsWithout1AtTheEnd().process(this.unit);
        new RefArrayToRefUtil(this.unit).process();
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



class Refactor {
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
    selectFirstNonNull<R>(node: AstNode, predicate: (node: AstNode) => R): R {
        let children = this.getChildren(node);
        for (let child of children) {
            let res = predicate(child);
            if (res != null)
                return res;
            res = this.selectFirstNonNull(child, predicate);
            if (res != null)
                return res;
        }
        return null;
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

class FindEvalsWithout1AtTheEnd extends Refactor {
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

}




class RefArrayToRefUtil extends Refactor {
    constructor(public root: AstNode) {
        super();
    }

    addUse(name: string) {
        let node = <PackageDeclaration>this.first(this.root, t=> t instanceof PackageDeclaration);
        if (node == null) {
            console.warn("can't find package declaration");
            return;
        }
        node.statements.insert(0, CodeBuilder.rawStatement("use " + name + ";\n").node);
    }

    identifyRefArray(node: AstNode): { node: BinaryExpression, target: Expression } {
        if (node instanceof BinaryExpression) {
            if (node.operator.token.isKeyword("eq")) {
                let right = node.right;
                if (right instanceof ValueExpression && ["'ARRAY'", '"ARRAY"'].contains(right.value)) {
                    let left = node.left;
                    if (left instanceof InvocationExpression) {
                        let target = left.target;
                        if (target instanceof NamedMemberExpression) {
                            if (target.name == "ref") {
                                let args = left.arguments;
                                return { node: node, target: args };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    process() {
        var i = 0;
        let count = 0;
        while (i < 1000) {
            let res = this.selectFirstNonNull(this.root, t=> this.identifyRefArray(t) || this.identifyRefArray2(t));
            console.log(res);
            if (res == null)
                break;
            let node = res.node;
            let arg = res.target;
            let newNode = CodeBuilder.member("is_arrayref").invokeSingleArgOrList(arg).node;
            console.log("REPLACING FROM:\n" + res.node.toCode() + "\nTO:\n", newNode.toCode());
            this.replaceNode(res.node, newNode);
            count++;
        }
        if (count > 0)
            this.addUse("Ref::Util");
    }


    identifyRefArray2(node: AstNode): { node: InvocationExpression, target: Expression } {
        if (node instanceof InvocationExpression) {
            let target = node.target;
            if (target instanceof NamedMemberExpression) {
                if (target.name == "ref") {
                    let args = node.arguments;
                    if (args instanceof BinaryExpression) {
                        if (args.operator.token.isKeyword("eq")) {
                            let right = args.right;
                            let left = args.left;
                            if (right instanceof ValueExpression && ["'ARRAY'", '"ARRAY"'].contains(right.value))
                                return { node: node, target: left };
                        }
                    }
                }
            }
        }
        return null;
    }
}
class CodeBuilder<T extends AstNode> {
    constructor(public node?: T) {
    }
    static rawStatement(code: string): CodeBuilder<RawStatement> {
        let node = new RawStatement();
        node.code = code;
        return new CodeBuilder(node);
    }
    static rawExpression(code: string): CodeBuilder<RawExpression> {
        let node = new RawExpression();
        node.code = code;
        return new CodeBuilder(node);
    }
    static member(name: string): CodeBuilder<NamedMemberExpression> {
        let node = new NamedMemberExpression();
        node.name = name;
        return new CodeBuilder(node);
    }
    static value(value: any): CodeBuilder<ValueExpression> {
        let node = new ValueExpression();
        node.token = TokenTypes.string.create2(JSON.stringify(value));
        node.value = value;
        return new CodeBuilder(node);
    }
    static parenthesizedList(items: Expression[]): CodeBuilder<ParenthesizedList> {
        let node = new ParenthesizedList();
        node.parenOpenToken = TokenTypes.parenOpen.create2("(");
        node.list = this.nonParenthesizedList(items).node;
        node.parenCloseToken = TokenTypes.parenOpen.create2(")");
        return new CodeBuilder(node);
    }
    static op(tt: TokenType, value: string): Operator {
        let op = new Operator();
        op.token = tt.create2(value);
        op.value = value;
        return op;
    }
    static nonParenthesizedList(items: Expression[]): CodeBuilder<NonParenthesizedList> {
        let node = new NonParenthesizedList();
        node.items = items;
        node.itemsSeparators = items.skip(1).select(t=> this.op(TokenTypes.comma, ", "));
        return new CodeBuilder(node);
    }
    invoke(args: Expression[]): CodeBuilder<InvocationExpression> {
        return this.invokeList(CodeBuilder.parenthesizedList(args).node);
    }
    invokeSingleArgOrList(arg: Expression): CodeBuilder<InvocationExpression> {
        if (arg instanceof ParenthesizedList)
            return this.invokeList(arg);
        return this.invoke([arg]);
    }
    invokeList(args: ParenthesizedList): CodeBuilder<InvocationExpression> {
        let node = new InvocationExpression();
        node.arguments = args;
        let target = this.node;
        if (target instanceof Expression) {
            node.target = <Expression><any>target;
            return new CodeBuilder(node);
        }
        throw new Error();
    }
    statement(): Statement {
        let node = new ExpressionStatement();
        node.expression = <Expression><any>this.node;
        node.semicolonToken = TokenTypes.semicolon.create2(";");
        //node.whitespaceBefore = [TokenTypes.whitespace.create2("    ")];
        //node.whitespaceAfter = [TokenTypes.whitespace.create2("\n    ")];
        return node;
    }

}
