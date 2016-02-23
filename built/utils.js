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
        throw new Error();
        //this.errors++;
        //if (this.errors > 10)
        //    throw new Error();
        //console.error.apply(console, args);
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
        return this.skipWhitespaceAndComments();
    };
    TokenReader.prototype.skipWhitespaceAndComments = function () {
        var skipped = [];
        while (this.token != null && (this.token.is(TokenTypes.whitespace) || this.token.is(TokenTypes.comment))) {
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
        return res;
    };
    TokenReader.prototype.expectAny = function (types) {
        var res = this.token.isAny(types);
        if (!res)
            this.onUnexpectedToken();
        return res;
    };
    TokenReader.prototype.onUnexpectedToken = function () {
        this.logger.error("unexecpted token type", this.token);
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
