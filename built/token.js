"use strict";
var TokenType = (function () {
    function TokenType(regex) {
        this.regex = regex;
    }
    TokenType.prototype.create = function (range) {
        return new Token(range, this);
    };
    TokenType.prototype.match = function (cursor) {
        return cursor.next(this.regex);
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
    TokenTypes.identifierRegex = /[a-zA-Z_][a-zA-Z_0-9]*/;
    TokenTypes.qq = new TokenType(/qq\|.*\|/);
    TokenTypes.keyword = new TokenType(new RegExp(["package", "use", "my", "sub", "return", "if", "defined", "ref", "exists"].map(function (t) { return t += "\\b"; }).join("|"))); //\b|use\b|my\b|sub\b|return\b|if\b|defined\b/
    TokenTypes.end = new TokenType(/__END__/);
    TokenTypes.whitespace = new TokenType(/[ \t\r\n]+/);
    TokenTypes.packageSeparator = new TokenType(/\:\:/);
    TokenTypes.semicolon = new TokenType(/;/);
    TokenTypes.sigiledIdentifier = new TokenType(new RegExp("[\\$@]" + TokenTypes.identifierRegex.source));
    TokenTypes.comment = new TokenType(/\#.*/);
    TokenTypes.regExpEquals = new TokenType(/=\~/);
    TokenTypes.equals = new TokenType(/=/);
    TokenTypes.comma = new TokenType(/\,/);
    TokenTypes.integer = new TokenType(/[0-9]+/);
    TokenTypes.parenOpen = new TokenType(/\(/);
    TokenTypes.parenClose = new TokenType(/\)/);
    TokenTypes.braceOpen = new TokenType(/\{/);
    TokenTypes.braceClose = new TokenType(/\}/);
    TokenTypes.bracketOpen = new TokenType(/\[/);
    TokenTypes.bracketClose = new TokenType(/\]/);
    TokenTypes.smallerThan = new TokenType(/\</);
    TokenTypes.greaterThan = new TokenType(/\>/);
    TokenTypes.arrow = new TokenType(/\-\>/);
    TokenTypes.fatArrow = new TokenType(/\=\>/);
    TokenTypes.dot = new TokenType(/\./);
    TokenTypes.interpolatedString = new TokenType(/\".*\"/);
    TokenTypes.string = new TokenType(/\'.*\'/);
    TokenTypes.divDiv = new TokenType(/\/\//);
    TokenTypes.tilda = new TokenType(/\~/);
    TokenTypes.regex = new TokenType(/\/.*\/[a-z]*/);
    TokenTypes.regexSubstitute = new TokenType(/s\/.*\/.*\/[a-z]*/); // s/abc/def/mg
    TokenTypes.or = new TokenType(/\|\|/);
    TokenTypes.and = new TokenType(/\&\&/);
    TokenTypes.minus = new TokenType(/\-/);
    TokenTypes.mul = new TokenType(/\*/);
    TokenTypes.plus = new TokenType(/\+/);
    TokenTypes.identifier = new TokenType(TokenTypes.identifierRegex);
    TokenTypes.pod = new TokenType(/\=pod.*/);
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
    Cursor.prototype.get = function (length) {
        return this.src.substr(this.index, length);
    };
    Cursor.prototype.next = function (regex) {
        var regex2 = new RegExp(regex.source, "g");
        regex2.lastIndex = this.index;
        var res = regex2.exec(this.src);
        if (res == null)
            return null;
        if (res.index != this.index)
            return null;
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
