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
    Object.defineProperty(TokenReader.prototype, "context", {
        get: function () {
            var index = this.token.range.index;
            var src = this.token.range.src;
            var start = src.lastIndexOf("\n", index) || 0;
            var end = src.indexOf("\n", index) || index + 30;
            return src.substring(start, end);
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
    Object.defineProperty(ParserBase.prototype, "currentLine", {
        get: function () {
            return this.reader.context;
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
