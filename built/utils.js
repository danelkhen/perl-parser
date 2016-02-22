var Logger = (function () {
    function Logger() {
        this.errors = 0;
    }
    Logger.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log.apply(console, args);
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        throw new Error();
        this.errors++;
        if (this.errors > 10)
            throw new Error();
        console.error.apply(console, args);
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
    TokenReader.prototype.getPrevToken = function () {
        return this.tokens[this.tokenIndex - 1];
    };
    TokenReader.prototype.nextToken = function () {
        this.tokenIndex++;
        this.token = this.tokens[this.tokenIndex];
        if (this.token != null)
            this.logger.log(this.token.value);
    };
    TokenReader.prototype.nextNonWhitespaceToken = function () {
        this.nextToken();
        this.skipWhitespaceAndComments();
    };
    TokenReader.prototype.skipWhitespaceAndComments = function () {
        while (this.token != null && (this.token.is(TokenTypes.whitespace) || this.token.is(TokenTypes.comment)))
            this.nextToken();
    };
    TokenReader.prototype.expectIdentifier = function (value) {
        return this.expect(TokenTypes.identifier, value);
    };
    TokenReader.prototype.expectKeyword = function (value) {
        return this.expect(TokenTypes.keyword, value);
    };
    TokenReader.prototype.expect = function (type, value) {
        if (!this.token.is(type, value))
            this.onUnexpectedToken();
    };
    TokenReader.prototype.expectAny = function (types) {
        if (!this.token.isAny(types))
            this.onUnexpectedToken();
    };
    TokenReader.prototype.onUnexpectedToken = function () {
        this.logger.error("unexecpted token type", this.token);
        return null;
    };
    return TokenReader;
}());
var ParserBase = (function () {
    function ParserBase() {
    }
    ParserBase.prototype.onUnexpectedToken = function () {
        this.reader.onUnexpectedToken();
        return null;
    };
    ParserBase.prototype.expectIdentifier = function (value) {
        return this.reader.expectIdentifier(value);
    };
    ParserBase.prototype.expectKeyword = function (value) {
        return this.reader.expectKeyword(value);
    };
    ParserBase.prototype.expectAny = function (types) {
        return this.reader.expectAny(types);
    };
    ParserBase.prototype.expect = function (type, value) {
        return this.reader.expect(type, value);
    };
    ParserBase.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.logger.log(args);
    };
    ParserBase.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.logger.error(args);
    };
    Object.defineProperty(ParserBase.prototype, "token", {
        get: function () { return this.reader.token; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ParserBase.prototype, "currentRangeText", {
        get: function () {
            if (this.token == null)
                return null;
            return this.token.range.text;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ParserBase.prototype, "currentLineText", {
        get: function () {
            return this.reader.currentLineText;
        },
        enumerable: true,
        configurable: true
    });
    ParserBase.prototype.getPrevToken = function () {
        return this.reader.getPrevToken();
    };
    ParserBase.prototype.nextToken = function () {
        return this.reader.nextToken();
    };
    ParserBase.prototype.nextNonWhitespaceToken = function () {
        return this.reader.nextNonWhitespaceToken();
    };
    ParserBase.prototype.skipWhitespaceAndComments = function () {
        return this.reader.skipWhitespaceAndComments();
    };
    return ParserBase;
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
