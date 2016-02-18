var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ExpressionParser = (function (_super) {
    __extends(ExpressionParser, _super);
    function ExpressionParser() {
        _super.apply(this, arguments);
    }
    ExpressionParser.prototype.parseExpression = function () {
        console.log("parseExpression", this.token);
        var node = this._parseExpression();
        console.log("parseExpression Finished", this.token, node);
        return node;
    };
    ExpressionParser.prototype._parseExpression = function (lastExpression) {
        var i = 0;
        while (true) {
            i++;
            console.log("parseExpression", i, this.token, lastExpression);
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.bracketOpen))
                return this.parseArrayRefDeclaration();
            else if (this.token.isIdentifier("qw"))
                return this.parseQw();
            else if (this.token.is(TokenTypes.parenOpen) && lastExpression == null) {
                return this.parseList();
            }
            else if (this.token.is(TokenTypes.parenOpen) && lastExpression != null) {
                var node = this.parseInvocationExpression();
                node.target = lastExpression;
                lastExpression = node;
            }
            else if (this.token.isIdentifier()) {
                var node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.is(TokenTypes.sigiledIdentifier)) {
                var node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.is(TokenTypes.integer)) {
                var node = new ValueExpression();
                node.token = this.token;
                node.value = this.token.value; //TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.is(TokenTypes.arrow) || this.token.is(TokenTypes.packageSeparator)) {
                var arrow = this.token.is(TokenTypes.arrow);
                if (arrow) {
                    if (!(lastExpression instanceof MemberExpression))
                        throw new Error("unexpected node " + lastExpression);
                    var me = lastExpression;
                    me.arrow = arrow;
                }
                this.nextToken();
                var node = this._parseExpression(lastExpression);
                return node;
            }
            else if (lastExpression != null)
                return lastExpression;
            else
                throw new Error();
        }
    };
    ExpressionParser.prototype.parseMemberExpression = function () {
        console.log("parseMemberExpression", this.token);
        var node = new MemberExpression();
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseInvocationExpression = function () {
        console.log("parseInvocationExpression", this.token);
        var node = new InvocationExpression();
        node.token = this.token;
        node.arguments = this.parseList().items;
        return node;
    };
    ExpressionParser.prototype.parseArrayRefDeclaration = function () {
        console.log("parseArrayRefDeclaration", this.token);
        this.expect(TokenTypes.bracketOpen);
        var node = new ArrayRefDeclaration();
        node.token = this.token;
        node.items = [];
        this.nextNonWhitespaceToken();
        while (this.token != null) {
            node.items.push(this.parseExpression());
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.bracketClose))
                break;
            this.expect(TokenTypes.comma);
            this.nextNonWhitespaceToken();
            if (this.token.is(TokenTypes.bracketClose))
                break;
        }
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseList = function () {
        console.log("parseList", this.token);
        this.expect(TokenTypes.parenOpen);
        var node = new ListDeclaration();
        node.token = this.token;
        node.items = [];
        this.nextNonWhitespaceToken();
        while (this.token != null) {
            if (this.token.is(TokenTypes.parenClose))
                break;
            node.items.push(this.parseExpression());
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.parenClose))
                break;
            this.expect(TokenTypes.comma);
            this.nextNonWhitespaceToken();
        }
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseQw = function () {
        console.log("parseQw", this.token);
        this.expect(TokenTypes.identifier, "qw");
        var node = new QwExpression();
        node.token = this.token;
        node.items = [];
        this.nextToken();
        this.expect(TokenTypes.smallerThan);
        this.nextToken();
        while (true) {
            this.expect(TokenTypes.identifier);
            var item = new ValueExpression();
            item.token = this.token;
            item.value = this.token.value;
            node.items.push(item);
            this.nextToken();
            if (this.token.is(TokenTypes.greaterThan))
                break;
            this.expect(TokenTypes.whitespace);
            this.nextNonWhitespaceToken();
        }
        this.nextToken();
        return node;
    };
    return ExpressionParser;
}(ParserBase));
