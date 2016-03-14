var Logger = (function () {
    function Logger() {
        this.errors = 0;
    }
    Logger.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        //console.log.apply(console, args);
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.error.apply(console, args);
        throw new Error();
        //this.errors++;
        //if (this.errors > 10)
        //    throw new Error();
    };
    return Logger;
}());
var TokenReader = (function () {
    function TokenReader() {
        this.tokenIndex = -1;
    }
    Object.defineProperty(TokenReader.prototype, "currentLineText", {
        get: function () {
            return this.token.range.file.getLineText(this.token.range.start.line);
        },
        enumerable: true,
        configurable: true
    });
    TokenReader.prototype.goto = function (tokenIndex) {
        this.tokenIndex = tokenIndex;
        this.token = this.tokens[this.tokenIndex];
    };
    TokenReader.prototype.getPrevToken = function () {
        return this.tokens[this.tokenIndex - 1];
    };
    TokenReader.prototype.getNextToken = function () {
        return this.tokens[this.tokenIndex + 1];
    };
    TokenReader.prototype.getPrevNonWhitespaceToken = function () {
        var index = this.tokenIndex;
        while (index > 0) {
            index--;
            var token = this.tokens[index];
            if (!token.is(TokenTypes.whitespace))
                return token;
        }
        return null;
    };
    TokenReader.prototype.getNextNonWhitespaceToken = function () {
        var r = this.clone();
        r.nextNonWhitespaceToken();
        return r.token;
    };
    TokenReader.prototype.getRange = function (start, end) {
        return this.tokens.slice(start, end);
    };
    TokenReader.prototype.findClosingBraceIndex = function (open, close) {
        this.expect(open);
        var depth = 1;
        while (depth > 0) {
            this.nextToken();
            if (this.token == null)
                return -1;
            if (this.token.is(open))
                depth++;
            else if (this.token.is(close))
                depth--;
        }
        return this.tokenIndex;
    };
    TokenReader.prototype.clone = function () {
        var r = new TokenReader();
        r.tokens = this.tokens;
        r.token = this.token;
        r.tokenIndex = this.tokenIndex;
        r.logger = this.logger;
        return r;
    };
    TokenReader.prototype.nextToken = function () {
        this.tokenIndex++;
        this.token = this.tokens[this.tokenIndex];
        if (this.token != null)
            this.logger.log(this.token.value);
    };
    TokenReader.prototype.nextNonWhitespaceToken = function () {
        this.nextToken();
        return this.skipWhitespaceAndComments();
    };
    TokenReader.prototype.skipWhitespaceAndComments = function () {
        var skipped = [];
        while (this.token != null && (this.token.isAny([TokenTypes.whitespace, TokenTypes.comment, TokenTypes.pod, TokenTypes.heredocValue]))) {
            skipped.push(this.token);
            this.nextToken();
        }
        return skipped;
    };
    TokenReader.prototype.expectIdentifier = function (value) {
        return this.expect(TokenTypes.identifier, value);
    };
    TokenReader.prototype.expectKeyword = function (value) {
        return this.expect(TokenTypes.keyword, value);
    };
    TokenReader.prototype.expect = function (type, value) {
        var res = this.token.is(type, value);
        if (!res)
            this.onUnexpectedToken();
        return this.token;
    };
    TokenReader.prototype.expectAny = function (types) {
        var res = this.token.isAny(types);
        if (!res)
            this.onUnexpectedToken();
        return res;
    };
    TokenReader.prototype.onUnexpectedToken = function () {
        this.logger.error("unexecpted token type", this.token, this.token.range.start.line, this.token.range.start.column);
        return null;
    };
    return TokenReader;
}());
RegExp.prototype.execFrom = function (index, s) {
    var re = this;
    re.lastIndex = index;
    return re.exec(s);
};
RegExp.prototype.testFrom = function (index, s) {
    var re = this;
    re.lastIndex = index;
    return re.test(s);
};
var DEBUG = true;
function safeTry(action) {
    return new Promise(function (resolve, reject) {
        if (DEBUG) {
            var res = action();
            resolve(res);
        }
        else {
            try {
                var res = action();
                resolve(res);
            }
            catch (e) {
                reject(e);
            }
        }
    });
}
Array.prototype.ofType = function (ctor) {
    return this.where(function (t) { return t instanceof ctor; });
};
Array.prototype.withItemBetweenEach = function (item) {
    var list = [];
    for (var i = 0; i < this.length; i++) {
        if (i > 0)
            list.push(item);
        list.push(this[i]);
    }
    return list;
};
Array.prototype.selectFirstNonNull = function (selector) {
    return this.selectFirst(selector, function (t) { return t != null; });
};
Array.prototype.selectFirst = function (selector, predicate) {
    for (var i = 0; i < this.length; i++) {
        var item = this[i];
        var res = selector(item);
        if (predicate(res))
            return res;
    }
    return null;
};
var AstNodeFixator = (function () {
    function AstNodeFixator() {
    }
    AstNodeFixator.prototype.process = function (node) {
        var _this = this;
        var props = Object.keys(node);
        props.forEach(function (prop) {
            if (prop == "parentNode")
                return;
            var value = node[prop];
            _this.processProp(node, prop, value);
        });
    };
    AstNodeFixator.prototype.processProp = function (node, prop, value) {
        var _this = this;
        if (value == null)
            return;
        if (value instanceof AstNode) {
            var child = value;
            child.parentNode = node;
            child.parentNodeProp = prop;
            this.process(child);
        }
        else if (value instanceof Array) {
            value.forEach(function (t) { return _this.processProp(node, prop, t); });
        }
    };
    return AstNodeFixator;
}());
