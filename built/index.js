"use strict";
$(main);
function main() {
    new IndexPage().main();
}
var IndexPage = (function () {
    function IndexPage() {
        this.tokenToElement = new Map();
    }
    IndexPage.prototype.main = function () {
        var _this = this;
        this.tbUrl = $("#tbUrl");
        this.urlKey = "perl-parser\turl";
        var lastUrl = localStorage[this.urlKey];
        if (lastUrl != null)
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
        var codeEl = $(".code").empty().text(data);
        var file = new File2(filename, data);
        var tok = new Tokenizer();
        tok.file = file;
        try {
            tok.main();
        }
        catch (e) {
            console.error(e);
        }
        var parser = new Parser();
        parser.logger = new Logger();
        parser.reader = new TokenReader();
        parser.reader.logger = parser.logger;
        parser.reader.tokens = tok.tokens;
        codeEl.empty();
        if (tok.tokens.length > 0) {
            tok.tokens.forEach(function (token) {
                var span = $.create("span").addClass(token.type.name).text(token.value).appendTo(codeEl)[0];
                _this.tokenToElement.set(token, span);
            });
            this.renderLineNumbers(tok.tokens.last().range.end.line);
        }
        var statements = parser.doParse();
        console.log(statements);
        var unit = new Unit();
        unit.statements = statements;
        $(".tree").empty().getAppend("ul").append(this.createTree(this.createInstanceNode(unit)));
        //$.create("pre").text(stringifyNodes(statements)).appendTo("body")
    };
    IndexPage.prototype.onMouseOverNode = function (e, node) {
        var _this = this;
        $(".selected").removeClass("selected");
        if (node == null)
            return;
        $(e.target).closest(".self").addClass("selected");
        node.tokens.forEach(function (token) { return $(_this.tokenToElement.get(token)).addClass("selected"); });
        var el = this.tokenToElement.get(node.token);
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
    IndexPage.prototype.createInstanceNode = function (node) {
        var _this = this;
        var anp = { text: node.constructor.name, node: node, children: [] };
        anp.children = Object.keys(node).select(function (prop) { return _this.createPropertyNode(node, prop); }).exceptNulls();
        return anp;
    };
    IndexPage.prototype.createPropertyNode = function (parentNode, prop) {
        var _this = this;
        var anp = { prop: prop, text: prop, node: null, children: [] };
        var value = parentNode[prop];
        if (value == null)
            return anp;
        if (value instanceof AstNode) {
            anp.children = [this.createInstanceNode(value)];
        }
        else if (value instanceof Array) {
            anp.children = value.where(function (t) { return t instanceof AstNode; }).select(function (t) { return _this.createInstanceNode(t); });
        }
        return anp;
    };
    IndexPage.prototype.createTree = function (node) {
        var _this = this;
        var li = $.create("li.node");
        var ul = $.create("ul.children");
        var span = li.getAppend("span.self").text(node.text);
        span.mouseover(function (e) { return _this.onMouseOverNode(e, node.node); });
        if (node.children.length > 0) {
            li.addClass("collapsed");
            ul.append(node.children.select(function (t) { return _this.createTree(t); }));
            li.append(ul);
            span.mousedown(function (e) { li.toggleClass("collapsed"); li.toggleClass("expanded"); });
        }
        return li[0];
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
