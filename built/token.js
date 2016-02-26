"use strict";
var TokenType = (function () {
    function TokenType() {
    }
    //regex: RegExp;
    TokenType.prototype.create = function (range) {
        return new Token(range, this);
    };
    TokenType.prototype.match = function (tokenizer) {
        return this.matcher(tokenizer);
        //return cursor.next(this.regex);
    };
    return TokenType;
}());
var Token = (function () {
    function Token(range, type) {
        this.range = range;
        this.type = type;
        this.value = this.range.text;
    }
    Token.prototype.toString = function () {
        return this.type.name + " " + this.value;
    };
    Token.prototype.isAnyKeyword = function (values) {
        return this.is(TokenTypes.keyword) && values.contains(this.value);
    };
    Token.prototype.isAny = function (types) {
        var _this = this;
        return types.any(function (t) { return _this.is(t); });
    };
    Token.prototype.is = function (type, value) {
        if (this.type.name != type.name)
            return false;
        if (value != null && this.value != value)
            return false;
        return true;
    };
    Token.prototype.isKeyword = function (value) {
        return this.is(TokenTypes.keyword, value);
    };
    Token.prototype.isIdentifier = function (value) {
        return this.is(TokenTypes.identifier, value);
    };
    return Token;
}());
var TokenTypes = (function () {
    function TokenTypes() {
    }
    TokenTypes.init = function () {
        var _this = this;
        if (this.all != null)
            return;
        this.all = [];
        Object.keys(TokenTypes).forEach(function (k) {
            var tt = TokenTypes[k];
            if (!(tt instanceof TokenType))
                return;
            tt.name = k;
            _this.all.push(tt);
        });
    };
    TokenTypes._rs = function (list) {
        var tt = new TokenType();
        tt.matcher = function (tokenizer) {
            var res = null;
            list.first(function (regex) {
                var res2 = tokenizer.cursor.next(regex);
                if (res2 != null) {
                    res = res2;
                    return true;
                }
                return false;
            });
            return res;
            //return cursor.next(regex);
        };
        return tt;
    };
    TokenTypes._r = function (regex) {
        var tt = new TokenType();
        tt.matcher = function (tokenizer) {
            return tokenizer.cursor.next(regex);
        };
        return tt;
    };
    TokenTypes._custom = function (matcher) {
        var tt = new TokenType();
        tt.matcher = matcher;
        return tt;
    };
    TokenTypes._matchPod = function (tokenizer) {
        var cursor = tokenizer.cursor;
        if (cursor.pos.column > 1)
            return null;
        var start = cursor.next(/=[a-z]+/);
        if (start == null)
            return null;
        //if (!cursor.startsWith("=pod") && !cursor.startsWith("=encoding"))
        //    return null;
        //let start = cursor.index;
        var cursor2 = cursor.clone();
        cursor2.pos = start.end;
        var end;
        var cut = cursor2.next(/=cut/);
        if (cut != null)
            end = cut.index + 4;
        else
            end = cursor.file.text.length;
        //cursor.pos.index = end;
        var range = new TextRange2(cursor.file, start.start, cursor.file.getPos(end));
        return range;
    };
    TokenTypes._findLastNonWhitespaceOrCommentToken = function (tokens) {
        for (var i = tokens.length - 1; i >= 0; i--) {
            var token = tokens[i];
            if (!token.isAny([TokenTypes.comment, TokenTypes.whitespace]))
                return token;
        }
        return null;
    };
    TokenTypes._matchRegex = function (tokenizer) {
        var cursor = tokenizer.cursor;
        var lastToken = TokenTypes._findLastNonWhitespaceOrCommentToken(tokenizer.tokens);
        if (lastToken == null)
            return null;
        if (lastToken.isAny([TokenTypes.braceClose]))
            return null;
        var pattern = /\/.*\/[a-z]*/;
        var res = cursor.next(pattern);
        if (res == null)
            return null;
        var code = res.text.substring(0, res.text.lastIndexOf("/") + 1);
        if (code == "//")
            return null;
        console.log("Detected regex", res.text, lastToken);
        return res;
        //try {
        //    let func = new Function("return " + code + ";");
        //    let res2 = func();
        //    return res;
        //}
        //catch (e) {
        //    return null;
        //}
    };
    TokenTypes.identifierRegex = /[a-zA-Z_][a-zA-Z_0-9]*/;
    TokenTypes.qq = TokenTypes._rs([/qq\|[^|]*\|/, /qq\{[^\}]*\}/]);
    TokenTypes.qw = TokenTypes._rs([/qw\/[^\/]*\/]/m, /qw<[^>]*>/m, /qw\([^\(]*\)/m]);
    TokenTypes.qr = TokenTypes._rs([/qr\/.*\//, /qr\(.*\)/]); //Regexp-like quote
    TokenTypes.tr = TokenTypes._r(/tr\/.*\/.*\//); //token replace
    TokenTypes.pod = TokenTypes._custom(TokenTypes._matchPod);
    //static pod = TokenTypes._r(/=pod.*=cut/m);
    TokenTypes.keyword = TokenTypes._rs([
        "BEGIN", "package", "use", "my", "sub", "return", "elsif", "else", "unless", "__END__",
        "and", "not",
        "foreach", "while", "for",
        "if", "unless", "while", "until", "for", "foreach", "when" //statement modifiers
    ].map(function (t) { return new RegExp(t + "\\b"); })); //\b|use\b|my\b|sub\b|return\b|if\b|defined\b/
    //, "defined", "ref", "exists"
    TokenTypes.end = TokenTypes._r(/__END__/);
    TokenTypes.whitespace = TokenTypes._r(/[ \t\r\n]+/);
    TokenTypes.packageSeparator = TokenTypes._r(/\:\:/);
    TokenTypes.semicolon = TokenTypes._r(/;/);
    TokenTypes.sigiledIdentifier = TokenTypes._r(new RegExp("[\\$@%]" + TokenTypes.identifierRegex.source));
    TokenTypes.evalErrorVar = TokenTypes._r(/\$@/);
    TokenTypes.comment = TokenTypes._r(/\#.*/);
    TokenTypes.equals = TokenTypes._r(/==/);
    TokenTypes.concatAssign = TokenTypes._r(/\.=/);
    TokenTypes.addAssign = TokenTypes._r(/\+=/);
    TokenTypes.subtractAssign = TokenTypes._r(/\-=/);
    TokenTypes.multiplyAssign = TokenTypes._r(/\+=/);
    TokenTypes.divideAssign = TokenTypes._r(/\/=/);
    TokenTypes.comma = TokenTypes._r(/\,/);
    TokenTypes.integer = TokenTypes._r(/[0-9]+/);
    TokenTypes.parenOpen = TokenTypes._r(/\(/);
    TokenTypes.parenClose = TokenTypes._r(/\)/);
    TokenTypes.braceOpen = TokenTypes._r(/\{/);
    TokenTypes.braceClose = TokenTypes._r(/\}/);
    TokenTypes.bracketOpen = TokenTypes._r(/\[/);
    TokenTypes.bracketClose = TokenTypes._r(/\]/);
    TokenTypes.smallerOrEqualsThan = TokenTypes._r(/\<=/);
    TokenTypes.greaterOrEqualsThan = TokenTypes._r(/\>=/);
    TokenTypes.interpolatedString = TokenTypes._r(/\".*\"/);
    TokenTypes.string = TokenTypes._r(/\'[^\']*\'/);
    TokenTypes.regex = TokenTypes._custom(TokenTypes._matchRegex); //_r(/\/.*\/[a-z]*/);
    TokenTypes.regexSubstitute = TokenTypes._r(/s\/.*\/.*\/[a-z]*/); // s/abc/def/mg
    TokenTypes.colon = TokenTypes._r(/\:/);
    TokenTypes.question = TokenTypes._r(/\?/);
    //unary:
    TokenTypes.inc = TokenTypes._r(/\+\+/);
    TokenTypes.dec = TokenTypes._r(/\-\-/);
    TokenTypes.codeRef = TokenTypes._r(/\\\&/);
    //binary
    TokenTypes.numericCompare = TokenTypes._r(/\<=\>/);
    TokenTypes.regExpEquals = TokenTypes._r(/=\~/);
    TokenTypes.regExpNotEquals = TokenTypes._r(/\!\~/);
    TokenTypes.smallerThan = TokenTypes._r(/\</);
    TokenTypes.greaterThan = TokenTypes._r(/\>/);
    TokenTypes.arrow = TokenTypes._r(/\-\>/);
    TokenTypes.fatComma = TokenTypes._r(/\=\>/);
    TokenTypes.assignment = TokenTypes._r(/=/);
    TokenTypes.concat = TokenTypes._r(/\./);
    TokenTypes.divDiv = TokenTypes._r(/\/\//);
    TokenTypes.tilda = TokenTypes._r(/\~/);
    TokenTypes.or = TokenTypes._r(/\|\|/);
    TokenTypes.and = TokenTypes._r(/\&\&/);
    TokenTypes.minus = TokenTypes._r(/\-/);
    TokenTypes.multiply = TokenTypes._r(/\*/); //also typeglob
    TokenTypes.div = TokenTypes._r(/\//);
    TokenTypes.plus = TokenTypes._r(/\+/);
    TokenTypes.multiplyString = TokenTypes._r(/x/);
    //static label = TokenTypes._r(new RegExp(TokenTypes.identifierRegex.source+"[\t\r\n ]*\:"));
    TokenTypes.identifier = TokenTypes._r(TokenTypes.identifierRegex);
    TokenTypes.deref = TokenTypes._r(/\\/);
    TokenTypes.not = TokenTypes._r(/\!/);
    TokenTypes.sigil = TokenTypes._r(/[\$@%]/);
    return TokenTypes;
}());
;
var TextRange2 = (function () {
    function TextRange2(file, start, end) {
        this.file = file;
        this.start = start;
        this.end = end;
        //this.src = src;
        //this.index = index;
        //this.length = length || 0;
        if (this.end == null)
            this.end = this.start;
    }
    Object.defineProperty(TextRange2.prototype, "index", {
        //src: string;
        get: function () { return this.start.index; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextRange2.prototype, "length", {
        get: function () { return this.end.index - this.start.index; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextRange2.prototype, "text", {
        //length: number;
        //get end() { return this.index + this.length; }
        get: function () { return this.file.text.substr(this.index, this.length); },
        enumerable: true,
        configurable: true
    });
    return TextRange2;
}());
var File2 = (function () {
    function File2(name, text) {
        this.newLineIndexes = [];
        this.name = name;
        this.text = text;
        this.scanNewLines();
    }
    Object.defineProperty(File2.prototype, "startPos", {
        get: function () { return this.getPos(0); },
        enumerable: true,
        configurable: true
    });
    File2.prototype.getLineStartIndex = function (line) {
        if (line == 1)
            return 0;
        return this.newLineIndexes[line - 2] + 1;
    };
    //last index relative to start of line, without the line ending char. empty line has startIndex=endIndex=0
    File2.prototype.getLineEndIndex = function (line) {
        var nextLineStartIndex = this.getLineStartIndex(line + 1);
        if (nextLineStartIndex == null)
            return this.text.length - 1;
        return nextLineStartIndex - 1;
    };
    File2.prototype.getLineText = function (line) {
        var startIndex = this.getLineStartIndex(line);
        var endIndex = this.getLineEndIndex(line);
        return this.text.substring(startIndex, endIndex);
    };
    File2.prototype.findLine = function (index) {
        var line = 1;
        for (var i = 0; i < this.newLineIndexes.length; i++) {
            var li = this.newLineIndexes[i];
            if (li > index)
                break;
            line++;
        }
        return line;
    };
    File2.prototype.getPos = function (index) {
        var line = this.findLine(index);
        var lineIndex = this.getLineStartIndex(line);
        //let lineIndex = 0;
        //for (let i = 0; i < this.newLineIndexes.length; i++) {
        //    let li = this.newLineIndexes[i];
        //    if (li > index)
        //        break;
        //    lineIndex = li;
        //}
        var pos = new File2Pos();
        pos.line = line; //lineIndex + 1;
        pos.column = index - lineIndex + 1;
        pos.index = index;
        pos.file = this;
        return pos;
    };
    File2.prototype.scanNewLines = function () {
        var regex = /\n/g;
        while (true) {
            var match = regex.exec(this.text);
            if (match == null)
                break;
            this.newLineIndexes.push(match.index);
        }
    };
    return File2;
}());
var File2Pos = (function () {
    function File2Pos() {
    }
    File2Pos.prototype.skip = function (length) {
        return this.file.getPos(this.index + length);
    };
    return File2Pos;
}());
var Cursor = (function () {
    function Cursor(pos) {
        this.pos = pos;
    }
    Cursor.prototype.clone = function () {
        return new Cursor(this.pos);
    };
    Object.defineProperty(Cursor.prototype, "file", {
        get: function () { return this.pos.file; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cursor.prototype, "src", {
        get: function () { return this.file.text; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Cursor.prototype, "index", {
        get: function () { return this.pos.index; },
        enumerable: true,
        configurable: true
    });
    Cursor.prototype.startsWith = function (s) {
        return this.get(s.length) == s;
    };
    Cursor.prototype.get = function (length) {
        return this.src.substr(this.index, length);
    };
    Cursor.prototype.next = function (regex) {
        var regex2 = new RegExp("^" + regex.source, (regex.multiline ? "m" : "") + (regex.global ? "g" : ""));
        var s = this.src.substr(this.index);
        //regex2.lastIndex = this.index;
        var res = regex2.exec(s);
        if (res == null)
            return null;
        //if (res.index != this.index)
        //    return null;
        var start = this.file.getPos(this.index);
        var end = this.file.getPos(this.index + res[0].length);
        var range = new TextRange2(this.file, start, end);
        return range;
    };
    return Cursor;
}());
var ArrayHelper = (function () {
    function ArrayHelper() {
    }
    ArrayHelper.firstIndex = function (list, predicate) {
        for (var i = 0; i < list.length; i++) {
            if (predicate(list[i]))
                return i;
        }
        return -1;
    };
    return ArrayHelper;
}());
