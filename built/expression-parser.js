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
        this.log("parseExpression", this.token);
        var node = this._parseExpression();
        this.log("parseExpression Finished", this.token, node);
        return node;
    };
    ExpressionParser.prototype.toListDeclaration = function (exp) {
        if (exp instanceof ListDeclaration)
            return exp;
        var node = this.create(ListDeclaration);
        node.items = [exp];
        return node;
    };
    ExpressionParser.prototype._parseExpression = function (lastExpression) {
        var i = 0;
        while (true) {
            i++;
            this.log("parseExpression", i, this.token, lastExpression);
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.bracketOpen)) {
                if (lastExpression == null)
                    return this.parseArrayRefDeclaration();
                lastExpression = this.parseArrayMemberAccess(lastExpression);
            }
            else if (this.token.isIdentifier("qw"))
                return this.parseQw();
            else if (this.token.is(TokenTypes.braceOpen)) {
                if (lastExpression == null)
                    return this.parseHashRefCreation();
                lastExpression = this.parseHashMemberAccess(lastExpression);
            }
            else if (this.token.is(TokenTypes.parenOpen)) {
                if (lastExpression == null) {
                    lastExpression = this.parseParenthesizedList();
                }
                else {
                    var node = this.parseInvocationExpression();
                    node.target = lastExpression;
                    lastExpression = node;
                }
            }
            else if (this.token.isAny([TokenTypes.comma, TokenTypes.semicolon])) {
                if (lastExpression == null)
                    throw new Error();
                return lastExpression;
            }
            else if (this.token.isIdentifier() || this.token.isKeyword()) {
                var node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
                if (this.token.is(TokenTypes.whitespace)) {
                    this.skipWhitespaceAndComments();
                    if (!this.token.isAny([TokenTypes.parenOpen, TokenTypes.comma, TokenTypes.arrow])) {
                        var invocation = this.parseInvocationExpression();
                        invocation.target = node;
                        lastExpression = invocation;
                    }
                }
            }
            else if (this.token.is(TokenTypes.sigiledIdentifier)) {
                var node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.isAny([TokenTypes.integer, TokenTypes.interpolatedString, TokenTypes.qq, TokenTypes.string])) {
                var node = this.create(ValueExpression);
                node.value = this.token.value; //TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.isAny([TokenTypes.regex, TokenTypes.regexSubstitute])) {
                var node = this.create(RegexExpression);
                node.value = this.token.value; //TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.is(TokenTypes.arrow) || this.token.is(TokenTypes.packageSeparator)) {
                var arrow = this.token.is(TokenTypes.arrow);
                if (arrow) {
                    if (!(lastExpression instanceof MemberExpression)) {
                        console.warn("can't set arrow");
                    }
                    var me = lastExpression;
                    me.arrow = arrow;
                }
                this.nextToken();
                var node = this._parseExpression(lastExpression);
                return node;
            }
            else if (this.token.isAny([
                TokenTypes.assignment, TokenTypes.concat, TokenTypes.divDiv, TokenTypes.regExpEquals,
                TokenTypes.equals, TokenTypes.and, TokenTypes.or, TokenTypes.greaterOrEqualsThan,
                TokenTypes.greaterThan, TokenTypes.smallerOrEqualsThan, TokenTypes.smallerThan,
                TokenTypes.concatAssign, TokenTypes.divideAssign, TokenTypes.subtractAssign,
                TokenTypes.addAssign, TokenTypes.multiplyAssign, TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply, TokenTypes.multiplyString
            ])) {
                if (lastExpression == null)
                    throw new Error();
                var exp = this.create(BinaryExpression);
                exp.token = this.token;
                exp.left = lastExpression;
                exp.operator = new Operator();
                exp.operator.value = this.token.value;
                this.nextNonWhitespaceToken(exp);
                exp.right = this.parseExpression();
                lastExpression = exp;
            }
            else if (lastExpression != null)
                return lastExpression;
            else
                return null;
        }
    };
    ExpressionParser.prototype.parseArrayMemberAccess = function (target) {
        this.expect(TokenTypes.bracketOpen);
        var node = this.create(ArrayMemberAccessExpression);
        this.nextNonWhitespaceToken(node);
        node.expression = this.parseExpression();
        node.target = target;
        this.expect(TokenTypes.bracketClose, node);
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseHashMemberAccess = function (target) {
        var exp = this.create(HashMemberAccessExpression);
        var exp2 = this.parseHashRefCreation();
        exp.name = exp2.items[0].token.value; //TODO:
        exp.target = target;
        return exp;
    };
    //parseBareword(): BarewordExpression {
    //    this.expectIdentifier();
    //    let exp = new BarewordExpression();
    //    exp.token = this.token;
    //    exp.value = this.token.value;
    //    return exp;
    //}
    ExpressionParser.prototype.parseHashRefCreation = function () {
        this.expect(TokenTypes.braceOpen);
        var exp = this.create(HashRefCreationExpression);
        exp.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.braceOpen, TokenTypes.braceClose, exp);
        return exp;
    };
    ExpressionParser.prototype.parseMemberExpression = function () {
        this.log("parseMemberExpression", this.token);
        var node = this.create(MemberExpression);
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseInvocationExpression = function () {
        this.log("parseInvocationExpression", this.token);
        var node = this.create(InvocationExpression);
        if (this.token.is(TokenTypes.parenOpen))
            node.arguments = this.parseParenthesizedList().items;
        else
            node.arguments = this.parseCommaSeparatedExpressions();
        return node;
    };
    ExpressionParser.prototype.parseArrayRefDeclaration = function () {
        this.log("parseArrayRefDeclaration", this.token);
        this.expect(TokenTypes.bracketOpen);
        var node = this.create(ArrayRefDeclaration);
        node.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.bracketOpen, TokenTypes.bracketClose, node);
        //this.nextNonWhitespaceToken();
        //while (this.token != null) {
        //    node.items.push(this.parseExpression());
        //    this.skipWhitespaceAndComments();
        //    if (this.token.is(TokenTypes.bracketClose))
        //        break;
        //    this.expect(TokenTypes.comma);
        //    this.nextNonWhitespaceToken();
        //    if (this.token.is(TokenTypes.bracketClose))
        //        break;
        //}
        //this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseParenthesizedList = function () {
        var node = this.create(ListDeclaration);
        node.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.parenOpen, TokenTypes.parenClose, node);
        return node;
    };
    ExpressionParser.prototype.parseBracedCommaSeparatedExpressions = function (opener, closer, node) {
        this.log("parseBracedCommaSeparatedExpressions", this.token);
        this.expect(opener, node);
        var items = [];
        this.nextNonWhitespaceToken(node);
        while (this.token != null) {
            if (this.token.is(TokenTypes.parenClose))
                break;
            var exp = this.parseExpression();
            items.push(exp);
            this.skipWhitespaceAndComments(exp);
            if (this.token.is(closer))
                break;
            this.expectAny([TokenTypes.comma, TokenTypes.fatComma]);
            this.nextNonWhitespaceToken(node);
        }
        this.expect(closer, node);
        this.nextToken();
        return items;
    };
    ExpressionParser.prototype.parseCommaSeparatedExpressions = function () {
        this.log("parseCommaSeparatedExpressions", this.token);
        var items = [];
        this.skipWhitespaceAndComments();
        //this.nextNonWhitespaceToken();
        while (this.token != null) {
            var exp = this.parseExpression();
            if (exp == null)
                break;
            items.push(exp);
            this.skipWhitespaceAndComments();
            if (!this.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                break;
            this.nextNonWhitespaceToken();
        }
        return items;
    };
    ExpressionParser.prototype.parseQw = function () {
        this.log("parseQw", this.token);
        this.expectValue(TokenTypes.identifier, "qw");
        var node = this.create(QwExpression);
        node.items = [];
        this.nextToken();
        this.expect(TokenTypes.smallerThan, node);
        this.nextToken();
        while (true) {
            this.expect(TokenTypes.identifier, node);
            var item = this.create(ValueExpression);
            item.value = this.token.value;
            node.items.push(item);
            this.nextToken();
            if (this.token.is(TokenTypes.greaterThan))
                break;
            this.expect(TokenTypes.whitespace, node);
            this.nextNonWhitespaceToken(node);
        }
        this.nextToken();
        return node;
    };
    return ExpressionParser;
}(ParserBase));
