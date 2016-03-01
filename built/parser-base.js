//class AstNodeBuilder<T extends AstNode>{
//}
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
        if (this.reader.expectKeyword(value))
            return this.token;
        return null;
    };
    ParserBase.prototype.expectAny = function (types, node) {
        var res = this.reader.expectAny(types);
        if (res && node != null)
            node.tokens.add(this.token);
        return res;
    };
    ParserBase.prototype.expect = function (type, node) {
        var res = this.reader.expect(type);
        if (res && node != null)
            node.tokens.add(this.token);
        return this.token;
    };
    ParserBase.prototype.expectToken = function (query, node) {
        if (query(this.token)) {
            if (node != null)
                node.tokens.add(this.token);
            return this.token;
        }
        this.onUnexpectedToken();
        return null;
    };
    ParserBase.prototype.expectValue = function (type, value, node) {
        var res = this.reader.expect(type, value);
        if (res && node != null)
            node.tokens.add(this.token);
        return res;
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
    ParserBase.prototype.nextNonWhitespaceToken = function (node) {
        var skipped = this.reader.nextNonWhitespaceToken();
        if (node != null)
            node.tokens.addRange(skipped);
        return skipped;
    };
    ParserBase.prototype.skipWhitespaceAndComments = function (node) {
        var skipped = this.reader.skipWhitespaceAndComments();
        if (node != null)
            node.tokens.addRange(skipped);
        return skipped;
    };
    ParserBase.prototype.expectAndSkipWhitespace = function (node) {
        this.expect(TokenTypes.whitespace);
        return this.skipWhitespaceAndComments(node);
    };
    //expectCreate<T extends AstNode>(query: TokenQuery, ctor: Type<T>): T {
    //    this.expectToken(query);
    //    this.create(ctor);
    //}
    ParserBase.prototype.create = function (ctor) {
        var node = new ctor();
        node.token = this.token;
        node.tokens.add(this.token);
        return node;
    };
    return ParserBase;
}());
