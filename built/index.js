"use strict";
$(main);
function main() {
    new IndexPage().main();
}
var IndexPage = (function () {
    function IndexPage() {
        this.tokenToElement = new Map();
        this.firstTime = true;
    }
    IndexPage.prototype.main = function () {
        var _this = this;
        this.tbUrl = $("#tbUrl");
        this.urlKey = "perl-parser\turl";
        this.tbRegex = $("#tbRegex");
        $("#btnRefactor").click(function (e) { return _this.refactor(); });
        this.tbRegex.keyup(function (e) {
            var s = _this.tbRegex.val();
            try {
                var regex = new Function("return " + s + ";")();
                var res = regex.exec(_this.code);
                if (res instanceof Array)
                    console.log(JSON.stringify(res[0]), { regex: res });
                else
                    console.log(res);
            }
            catch (e) {
                console.log(e);
            }
        });
        var lastUrl = localStorage[this.urlKey];
        if (lastUrl != null && lastUrl != "")
            this.tbUrl.val(lastUrl);
        this.tbUrl.change(function (e) { return _this.update(); });
        this.update();
    };
    IndexPage.prototype.update = function () {
        var _this = this;
        var filename = this.tbUrl.val();
        localStorage[this.urlKey] = filename;
        if (filename.length == 0)
            return;
        if (filename.startsWith("http")) {
            $.get(filename).then(function (data) {
                _this.parse(filename, data);
            });
            return;
        }
        this.parse("noname.pm", filename);
    };
    IndexPage.prototype.renderLineNumbers = function (count) {
        var lineNumbers = $(".line-numbers").empty();
        for (var i = 0; i < count; i++) {
            lineNumbers.append($.create("div").text(i + 1));
        }
    };
    IndexPage.prototype.parse = function (filename, data) {
        var _this = this;
        if (localStorage.getItem("pause") == "1" && this.firstTime) {
            console.warn("not running parse, last time crashed unexpectedly");
            this.firstTime = false;
            return;
        }
        this.firstTime = false;
        this.code = data;
        var codeEl = $(".code").empty().text(data);
        var file = new File2(filename, data);
        var tok = new Tokenizer();
        tok.file = file;
        localStorage.setItem("pause", "1");
        safeTry(function () { return tok.main(); }).catch(function (e) { return console.error(e); }).then(function () {
            var parser = new Parser();
            parser.logger = new Logger();
            parser.reader = new TokenReader();
            parser.reader.logger = parser.logger;
            parser.reader.tokens = tok.tokens;
            parser.init();
            _this.tokens = tok.tokens;
            _this.renderTokens();
            var statements = parser.doParse();
            console.log(statements);
            var unit = new Unit();
            unit.statements = statements;
            _this.unit = unit;
            _this.renderTree();
            _this.generateCode();
            localStorage.removeItem("pause");
            _this.renderGeneratedCode();
        });
        //$.create("pre").text(stringifyNodes(statements)).appendTo("body")
    };
    IndexPage.prototype.generateCode = function () {
        var writer = new AstWriter();
        writer.main();
        writer.write(this.unit);
        this.generatedCode = writer.sb.join("");
    };
    IndexPage.prototype.render = function () {
        $(".code").empty().text(this.code);
        this.renderTokens();
        this.renderGeneratedCode();
        this.renderTree();
    };
    IndexPage.prototype.renderTree = function () {
        $(".tree").empty().getAppend("ul").append(this.createTree(this.createInstanceNode(this.unit)));
    };
    IndexPage.prototype.renderTokens = function () {
        var _this = this;
        var codeEl = $(".code");
        codeEl.empty();
        if (this.tokens == null || this.tokens.length == 0)
            return;
        this.tokens.forEach(function (token) {
            var span = $.create("span").addClass(token.type.name).text(token.value).appendTo(codeEl)[0];
            _this.tokenToElement.set(token, span);
        });
        this.renderLineNumbers(this.tokens.last().range.end.line);
    };
    IndexPage.prototype.renderGeneratedCode = function () {
        $(".generated-code").val(this.generatedCode);
    };
    IndexPage.prototype.refactor = function () {
        new AstNodeFixator().process(this.unit);
        new FindEvalsWithout1AtTheEnd().process(this.unit);
        this.generateCode();
        this.render();
    };
    IndexPage.prototype.onMouseOverNode = function (e, node) {
        var _this = this;
        $(".selected").removeClass("selected");
        //let obj = node.obj;
        //if (obj == null)
        //    return;
        //if (!(obj instanceof AstNode))
        //    return;
        var tokens = this.getTokens(node.value, true);
        if (tokens.length == 0)
            tokens = this.getTokens(node.obj, true);
        //let astNode = <AstNode>obj;
        $(e.target).closest(".self").addClass("selected");
        tokens.forEach(function (token) { return $(_this.tokenToElement.get(token)).addClass("selected"); });
        var el = this.tokenToElement.get(tokens[0]);
        if (el != null) {
            var div = $(".code")[0];
            var top_1 = div.scrollTop;
            var bottom = div.scrollTop + div.offsetHeight;
            var top2 = el.offsetTop;
            var bottom2 = el.offsetTop + el.offsetHeight;
            if (top2 < top_1)
                div.scrollTop = top2;
            else if (bottom2 > bottom)
                div.scrollTop = top2;
        }
    };
    IndexPage.prototype.createInstanceNode = function (obj) {
        var _this = this;
        if (typeof (obj) != "object") {
            var anp2 = { text: obj.constructor.name, value: obj, children: [] };
            return anp2;
        }
        var anp = { text: obj.constructor.name, obj: obj, children: [] };
        if (obj instanceof Token) {
            anp.text = obj.type.name + " { Token }";
            return anp;
        }
        anp.children = Object.keys(obj).select(function (prop) { return _this.createPropertyNode(obj, prop); }).exceptNulls();
        return anp;
    };
    IndexPage.prototype.createPropertyNode = function (parentObj, prop) {
        var _this = this;
        if (["parentNode", "parentNodeProp", "tokens", "token", "isStatement", "isExpression" /*, "whitespaceBefore", "whitespaceAfter"*/].contains(prop))
            return null;
        var anp = { prop: prop, text: prop, obj: parentObj, children: [], value: parentObj[prop] };
        if (anp.value == null)
            return anp;
        if (typeof (anp.value) == "object") {
            if (anp.value instanceof Array)
                anp.children = anp.value.select(function (t) { return _this.createInstanceNode(t); });
            else
                anp.children = [this.createInstanceNode(anp.value)];
        }
        return anp;
    };
    IndexPage.prototype.createTree = function (node) {
        var _this = this;
        var li = $.create("li.node");
        var ul = $.create("ul.children");
        var span = li.getAppend("span.self").text(node.text);
        span.mouseover(function (e) { return _this.onMouseOverNode(e, node); });
        if (node.children.length > 0) {
            li.addClass("collapsed");
            ul.append(node.children.select(function (t) { return _this.createTree(t); }));
            li.append(ul);
            span.mousedown(function (e) { li.toggleClass("collapsed"); li.toggleClass("expanded"); });
        }
        return li[0];
    };
    IndexPage.prototype.getTokens = function (obj, deep) {
        var _this = this;
        if (obj == null)
            return [];
        if (typeof (obj) != "object")
            return [];
        if (obj instanceof Token) {
            return [obj];
        }
        else if (obj instanceof Array) {
            if (deep)
                return obj.select(function (t) { return _this.getTokens(t, false); });
            return obj.where(function (t) { return t instanceof Token; });
        }
        else {
            if (deep)
                return Object.keys(obj).selectMany(function (value) { return _this.getTokens(obj[value], false); });
            return [];
        }
        console.log("can't getTokens for", obj);
        return null;
    };
    return IndexPage;
}());
function stringifyNodes(node) {
    var sb = [];
    function stringify(obj) {
        if (obj instanceof Array)
            return obj.forEach(stringify);
        if (typeof (obj) == "object") {
            if (obj instanceof Token) {
                stringify(obj.value);
            }
            if (obj instanceof AstNode) {
                sb.push(obj.constructor.name);
                Object.keys(obj).forEach(function (key) {
                    var value = obj[key];
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
var FindEvalsWithout1AtTheEnd = (function () {
    function FindEvalsWithout1AtTheEnd() {
    }
    FindEvalsWithout1AtTheEnd.prototype.getChildren = function (node) {
        var list = [];
        Object.keys(node).where(function (key) { return key != "parentNode"; }).select(function (key) { return node[key]; }).forEach(function (obj) {
            if (obj instanceof Array)
                list.addRange(obj.where(function (t) { return t instanceof AstNode; }));
            else if (obj instanceof AstNode)
                list.add(obj);
        });
        return list;
    };
    FindEvalsWithout1AtTheEnd.prototype.getDescendants = function (node) {
    };
    FindEvalsWithout1AtTheEnd.prototype.first = function (node, predicate) {
        var children = this.getChildren(node);
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            if (predicate(child))
                return child;
            var res = this.first(child, predicate);
            if (res != null)
                return res;
        }
        return null;
    };
    FindEvalsWithout1AtTheEnd.prototype.process = function (root) {
        var node = this.first(root, function (t) { return t instanceof NativeInvocation_BlockOrExpr && t.keywordToken.value == "eval"; });
        var lastStatement = node.block.statements.last();
        var valueExp = lastStatement.expression;
        var endsWithOne = valueExp.token.value == "1";
        console.log("this eval ends with 1; ?", endsWithOne);
        if (endsWithOne)
            return;
        node.block.statements.add(CodeBuilder.value("1").statement()); // new ExpressionStatement());
        //this.replaceNode(node, node.block || node.expr);
    };
    FindEvalsWithout1AtTheEnd.prototype.replaceNode = function (oldNode, newNode) {
        var parentNode = oldNode.parentNode;
        var prop = oldNode.parentNodeProp;
        var value = parentNode[prop];
        if (value instanceof Array) {
            var index = value.indexOf(oldNode);
            value[index] = newNode;
        }
        else {
            parentNode[prop] = newNode;
        }
        newNode.parentNode = parentNode;
        newNode.parentNodeProp = prop;
    };
    return FindEvalsWithout1AtTheEnd;
}());
var CodeBuilder = (function () {
    function CodeBuilder(node) {
        this.node = node;
    }
    CodeBuilder.value = function (value) {
        var node = new ValueExpression();
        node.token = TokenTypes.string.create2(JSON.stringify(value));
        node.value = value;
        return new CodeBuilder(node);
    };
    CodeBuilder.prototype.statement = function () {
        var node = new ExpressionStatement();
        node.expression = this.node;
        node.semicolonToken = TokenTypes.semicolon.create2(";");
        node.whitespaceBefore = [TokenTypes.whitespace.create2("    ")];
        node.whitespaceAfter = [TokenTypes.whitespace.create2("\n    ")];
        return node;
    };
    return CodeBuilder;
}());
