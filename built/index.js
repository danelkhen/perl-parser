"use strict";
$(main);
function main() {
    var filename = "DateTime.pm";
    console.log(filename);
    //fs.readFile(filename, "utf8", (e, data) => { this.src = data; this.pos = 0; this.main2(); });
    $.get(filename).then(function (data) {
        var tok = new Tokenizer();
        tok.src = data;
        tok.pos = 0;
        tok.main();
        var parser = new Parser();
        parser.tokenizer = tok;
        parser.tokens = tok.tokens;
        var statements = parser.doParse();
        console.log(statements);
        $.create("pre").text(stringifyNodes(statements)).appendTo("body");
    });
}
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
