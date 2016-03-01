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
    ExpressionParser.prototype._parseExpression = function () {
        var i = 0;
        var mbe = this.create(MultiBinaryExpression);
        mbe.expressions = [];
        mbe.operators = [];
        var tempParser;
        while (true) {
            i++;
            var exp = void 0;
            if (tempParser != null) {
                exp = tempParser.call(this);
                tempParser = null;
            }
            else {
                exp = this.parseNonBinaryExpression();
            }
            mbe.expressions.push(exp);
            if (this.token == null)
                break;
            if (this.token.isAny([
                TokenTypes.assignment, TokenTypes.concat, TokenTypes.divDiv, TokenTypes.regExpEquals, TokenTypes.regExpNotEquals,
                TokenTypes.equals, TokenTypes.and, TokenTypes.or, TokenTypes.greaterOrEqualsThan,
                TokenTypes.greaterThan, TokenTypes.smallerOrEqualsThan, TokenTypes.smallerThan,
                TokenTypes.numericCompare,
                TokenTypes.concatAssign, TokenTypes.divideAssign, TokenTypes.subtractAssign,
                TokenTypes.addAssign, TokenTypes.multiplyAssign, TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply, TokenTypes.multiplyString, TokenTypes.div, TokenTypes.range,
            ]) || this.token.isAnyKeyword(["if", "unless", "while", "until", "for", "foreach", "when", "and", "eq"])) {
                if (this.token.isAnyKeyword(["for", "foreach"])) {
                    tempParser = this.parseSingleOrCommaSeparatedExpressions;
                }
                var operator = new Operator();
                operator.value = this.token.value;
                mbe.operators.push(operator);
                this.nextNonWhitespaceToken(mbe);
            }
            else
                break;
        }
        if (mbe.operators.length == 0)
            return mbe.expressions[0];
        if (mbe.operators.length == 1) {
            var be = new BinaryExpression();
            be.left = mbe.expressions[0];
            be.tokens = mbe.tokens;
            be.token = mbe.token;
            be.right = mbe.expressions[1];
            be.operator = mbe.operators[0];
            return be;
        }
        return mbe;
    };
    ExpressionParser.prototype.parseNonBinaryExpression = function (lastExpression) {
        var i = 0;
        while (true) {
            i++;
            this.log("parseExpression", i, this.token, lastExpression);
            this.skipWhitespaceAndComments();
            if (this.token == null)
                return lastExpression;
            if (this.token.is(TokenTypes.bracketOpen)) {
                if (lastExpression == null)
                    lastExpression = this.parseArrayRefDeclaration();
                else
                    lastExpression = this.parseArrayMemberAccess(lastExpression);
            }
            else if (this.token.is(TokenTypes.braceOpen)) {
                if (lastExpression == null)
                    return this.parseHashRefOrBlockExpression();
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
            else if (this.token.isKeyword("my")) {
                var node = this.parseVariableDeclarationExpression();
                return node;
            }
            else if (this.token.isKeyword("sub")) {
                if (lastExpression != null)
                    throw new Error();
                return this.parseSubroutineExpression();
            }
            else if (this.token.isKeyword("return")) {
                return this.parseReturnExpression();
            }
            else if (this.token.isAny([TokenTypes.comma, TokenTypes.semicolon])) {
                if (lastExpression == null)
                    throw new Error();
                return lastExpression;
            }
            else if (this.token.is(TokenTypes.sigil)) {
                var node = this.create(PrefixUnaryExpression);
                node.operator = new Operator();
                node.operator.value = this.token.value;
                this.nextNonWhitespaceToken(node);
                if (this.token.is(TokenTypes.braceOpen)) {
                    this.nextNonWhitespaceToken();
                    node.expression = this.parseExpression();
                    this.skipWhitespaceAndComments();
                    this.expect(TokenTypes.braceClose);
                    this.nextToken();
                }
                else {
                    node.expression = this.parseNonBinaryExpression();
                }
                lastExpression = node;
            }
            else if (this.token.isAny([TokenTypes.not, TokenTypes.makeRef, TokenTypes.multiply, TokenTypes.codeRef, TokenTypes.lastIndexVar]) || this.token.isAnyKeyword(["not"])) {
                var node = this.create(PrefixUnaryExpression);
                node.operator = new Operator();
                node.operator.value = this.token.value;
                this.nextNonWhitespaceToken(node);
                node.expression = this.parseExpression();
                lastExpression = node;
            }
            else if (this.token.isAny([TokenTypes.inc, TokenTypes.dec])) {
                var node = this.create(PostfixUnaryExpression);
                node.expression = lastExpression;
                node.operator = new Operator();
                node.operator.value = this.token.value;
                this.nextNonWhitespaceToken(node);
                lastExpression = node;
            }
            else if (this.token.isIdentifier()) {
                var node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
                if (this.token.is(TokenTypes.whitespace)) {
                    this.skipWhitespaceAndComments();
                    if (!this.token.isAny([TokenTypes.parenOpen, TokenTypes.arrow, TokenTypes.comma, TokenTypes.fatComma, TokenTypes.keyword])) {
                        var invocation = this.parseInvocationExpression();
                        invocation.target = node;
                        lastExpression = invocation;
                    }
                }
            }
            else if (this.token.isAny([TokenTypes.sigiledIdentifier, TokenTypes.evalErrorVar])) {
                var node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.is(TokenTypes.question)) {
                var exp = this.create(TrinaryExpression);
                exp.condition = lastExpression;
                this.nextNonWhitespaceToken(exp);
                exp.trueExpression = this.parseExpression();
                this.skipWhitespaceAndComments();
                this.expect(TokenTypes.colon);
                this.nextNonWhitespaceToken();
                exp.falseExpression = this.parseExpression();
                lastExpression = exp;
            }
            else if (this.token.isAny([TokenTypes.integer, TokenTypes.interpolatedString, TokenTypes.qq, TokenTypes.string, TokenTypes.qw])) {
                var node = this.create(ValueExpression);
                node.value = this.token.value; //TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.isAny([TokenTypes.regex, TokenTypes.regexSubstitute, TokenTypes.qr, TokenTypes.tr])) {
                var node = this.create(RegexExpression);
                node.value = this.token.value; //TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.is(TokenTypes.arrow) || this.token.is(TokenTypes.packageSeparator)) {
                var arrow = this.token.is(TokenTypes.arrow);
                this.nextToken();
                var node = this.parseNonBinaryExpression(lastExpression);
                var node2 = node;
                node2.arrow = arrow;
                return node;
            }
            else if (lastExpression != null)
                return lastExpression;
            else
                return null;
        }
    };
    ExpressionParser.prototype.parseSubroutineExpression = function () {
        var node = this.create(SubroutineExpression);
        this.nextNonWhitespaceToken(node);
        if (this.token.is(TokenTypes.identifier)) {
            node.name = this.parser.parseSimpleName();
            this.nextNonWhitespaceToken(node);
        }
        if (this.token.is(TokenTypes.colon)) {
            this.nextNonWhitespaceToken(node);
            node.attribute = this.parser.parseSimpleName();
            this.nextNonWhitespaceToken(node);
        }
        if (this.token.is(TokenTypes.parenOpen)) {
            node.prototype = this.parseParenthesizedList();
            this.skipWhitespaceAndComments(node);
        }
        node.statements = this.parser.parseBracedStatements(node);
        return node;
    };
    ExpressionParser.prototype.parseReturnExpression = function () {
        this.expectKeyword("return");
        var node = this.create(ReturnExpression);
        this.nextNonWhitespaceToken(node);
        if (!this.token.is(TokenTypes.semicolon)) {
            node.expression = this.parseSingleOrCommaSeparatedExpressions();
        }
        return node;
    };
    ExpressionParser.prototype.parseSingleOrCommaSeparatedExpressions = function () {
        var returnItems = this.parseCommaSeparatedExpressions();
        if (returnItems.length == 1)
            return returnItems[0];
        var list = new ListDeclaration();
        list.items = returnItems;
        list.tokens = [returnItems[0].token];
        list.token = returnItems[0].token;
        return list;
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
        this.expect(TokenTypes.braceOpen);
        var exp = this.create(HashMemberAccessExpression);
        this.nextNonWhitespaceToken(exp);
        exp.member = this.parseExpression();
        this.expect(TokenTypes.braceClose, exp);
        this.nextToken();
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
    ExpressionParser.prototype.isBlockExpression = function () {
        var reader2 = this.reader.clone();
        var depth = 0;
        while (reader2.token != null) {
            if (reader2.token.is(TokenTypes.braceOpen))
                depth++;
            else if (reader2.token.is(TokenTypes.braceClose))
                depth--;
            else if (depth == 1 && reader2.token.is(TokenTypes.semicolon))
                return true;
            if (depth == 0)
                break;
            reader2.nextNonWhitespaceToken();
        }
        return false;
    };
    ExpressionParser.prototype.parseHashRefOrBlockExpression = function () {
        var isBlock = this.isBlockExpression();
        if (isBlock)
            return this.parseBlockExpression();
        return this.parseHashRefCreation();
        //let index = this.reader.clone().findClosingBraceIndex(TokenTypes.braceOpen, TokenTypes.braceClose);
        //if (index < 0)
        //    throw new Error("can't find brace close");
        //let tokens = this.reader.getRange(this.reader.tokenIndex, index);
        //for (let token of tokens) {
        //    if (token.is(TokenTypes.braceOpen))
        //}
        //if (tokens.first(t=> t.is(TokenTypes.semicolon)) != null) {
        //    return this.parseBlockExpression();
        //}
        //return this.parseHashRefCreation();
    };
    ExpressionParser.prototype.parseHashRefCreation = function () {
        this.expect(TokenTypes.braceOpen);
        var exp = this.create(HashRefCreationExpression);
        exp.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.braceOpen, TokenTypes.braceClose, exp);
        return exp;
    };
    ExpressionParser.prototype.parseBlockExpression = function () {
        this.expect(TokenTypes.braceOpen);
        var node = this.create(BlockExpression);
        node.statements = this.parser.parseBracedStatements(node);
        return node;
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
    ExpressionParser.prototype.parseVariableDeclarationExpression = function () {
        var node = this.create(VariableDeclarationExpression);
        if (!this.token.isKeyword("my"))
            return this.onUnexpectedToken();
        this.nextNonWhitespaceToken(node);
        if (this.token.is(TokenTypes.parenOpen)) {
            node.variables = this.parseParenthesizedList();
        }
        else if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variables = this.parseMemberExpression();
        }
        else {
            this.logger.error("unexpected token in VariableDeclarationExpression", this.token);
        }
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.assignment)) {
            this.nextToken();
            this.skipWhitespaceAndComments();
            node.initializer = this.parseExpression();
        }
        return node;
    };
    return ExpressionParser;
}(ParserBase));
