"use strict";
var TokenType = (function () {
    function TokenType() {
    }
    TokenType.prototype.create = function (range) {
        return new Token(range, this);
    };
    TokenType.prototype.create2 = function (value) {
        return new Token(null, this, value);
    };
    TokenType.prototype.match = function (tokenizer) {
        throw new Error();
    };
    TokenType.prototype.tryTokenize = function (tokenizer) {
        var range = this.match(tokenizer);
        if (range == null)
            return 0;
        if (range.length == 0)
            throw new Error();
        var token = this.create(range);
        tokenizer.tokens.push(token);
        tokenizer.cursor.pos = range.end;
        return 1;
    };
    TokenType._fixRegex = function (regex) {
        var regex2 = new RegExp("^" + regex.source, (regex.multiline ? "m" : "") + (regex.global ? "g" : ""));
        return regex2;
    };
    TokenType._words = function (list) {
        var tt = TokenType._rs(list.map(function (t) { return new RegExp(t + "\\b"); }));
        tt.words = list;
        return tt;
    };
    TokenType._rs = function (list) {
        var tt = new TokenType();
        list = list.select(function (t) { return TokenType._fixRegex(t); });
        tt.regexes = list;
        tt.match = function (tokenizer) {
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
    TokenType._r = function (regex) {
        var tt = new TokenType();
        regex = TokenType._fixRegex(regex);
        tt.match = function (tokenizer) {
            return tokenizer.cursor.next(regex);
        };
        return tt;
    };
    TokenType._custom = function (matcher) {
        var tt = new TokenType();
        tt.match = matcher;
        return tt;
    };
    return TokenType;
}());
var Token = (function () {
    function Token(range, type, value) {
        this.range = range;
        this.type = type;
        if (this.range == null)
            this.value = value;
        else
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
    Token.prototype.isAnyIdentifier = function (values) {
        return this.is(TokenTypes.identifier) && values.contains(this.value);
    };
    return Token;
}());
var TextRange2 = (function () {
    function TextRange2(file, start, end) {
        this.file = file;
        this.start = start;
        this.end = end;
        if (this.end == null)
            this.end = this.start;
    }
    Object.defineProperty(TextRange2.prototype, "index", {
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
        var regex2 = regex;
        var s = this.src.substr(this.index);
        var res = regex2.exec(s);
        if (res == null)
            return null;
        var range = this.getRange(this.index + res.index, res[0].length);
        return range;
    };
    Cursor.prototype.nextAny = function (list) {
        var _this = this;
        return list.selectFirstNonNull(function (t) { return _this.next(t); });
    };
    Cursor.prototype.captureAny = function (list) {
        var _this = this;
        return list.selectFirstNonNull(function (t) { return _this.capture(t); });
    };
    Cursor.prototype.capture = function (regex) {
        var regex2 = regex;
        var s = this.src.substr(this.index);
        var res = regex2.exec(s);
        if (res == null || res.length <= 1)
            return null;
        var index = s.indexOf(res[1]);
        var range = this.getRange(this.index + index, res[1].length);
        return range;
    };
    Cursor.prototype.getRange = function (index, length) {
        var start = this.file.getPos(index);
        var end = this.file.getPos(index + length);
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
