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
        var filename = "DateTime.pm";
        console.log(filename);
        //fs.readFile(filename, "utf8", (e, data) => { this.src = data; this.pos = 0; this.main2(); });
        $.get(filename).then(function (data) {
            var file = new File2(filename, data);
            var tok = new Tokenizer();
            tok.file = file;
            tok.main();
            var parser = new Parser();
            parser.logger = new Logger();
            parser.reader = new TokenReader();
            parser.reader.logger = parser.logger;
            parser.reader.tokens = tok.tokens;
            var statements = parser.doParse();
            console.log(statements);
            $("body").getAppend(".tree").getAppend("ul").append(_this.createTree(statements[0]));
            var div = $.create(".code").appendTo("body");
            tok.tokens.forEach(function (token) {
                var span = $.create("span").addClass(token.type.name).text(token.value).appendTo(div)[0];
                _this.tokenToElement.set(token, span);
            });
            //$.create("pre").text(stringifyNodes(statements)).appendTo("body")
        });
    };
    IndexPage.prototype.onMouseOverNode = function (e, node) {
        var _this = this;
        $(".selected").removeClass("selected");
        $(e.target).closest(".self").addClass("selected");
        node.tokens.forEach(function (token) { return $(_this.tokenToElement.get(token)).addClass("selected"); });
        var el = this.tokenToElement.get(node.token);
        if (el != null) {
            el.scrollIntoView(false);
        }
    };
    IndexPage.prototype.createTree = function (node) {
        var _this = this;
        var li = $.create("li.node");
        var ul = $.create("ul.children");
        var span = li.getAppend("span.self").text(node.constructor.name);
        //span.getAppend(".icon");
        //span.getAppend(".text")
        span.mouseover(function (e) { return _this.onMouseOverNode(e, node); });
        span.mousedown(function (e) { li.toggleClass("collapsed"); li.toggleClass("expanded"); });
        var childNodes = node.getChildNodes();
        if (childNodes.length > 0) {
            li.addClass("collapsed");
            ul.append(childNodes.select(function (t) { return _this.createTree(t); }));
            li.append(ul);
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
