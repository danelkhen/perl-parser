var PrecedenceResolver2 = (function () {
    function PrecedenceResolver2(mbe) {
        this.mbe = mbe;
        this.nodes = mbe.nodes.toArray();
        this.index = 0;
    }
    PrecedenceResolver2.prototype.resolve = function () {
        return this.parse_expression();
    };
    PrecedenceResolver2.prototype.isRightAssociativeOperator = function (op) {
        return false;
        return op.token.isAny([
            TokenTypes.assignment,
            TokenTypes.addAssign,
            TokenTypes.subtractAssign,
            TokenTypes.multiplyAssign,
            TokenTypes.divideAssign,
            TokenTypes.orAssign,
            TokenTypes.divDivAssign,
            TokenTypes.concatAssign,
        ]);
    };
    PrecedenceResolver2.prototype.isBinaryOperator = function (op) {
        return op.token.isAny(TokenTypes.binaryOperators) || op.token.isAnyKeyword(["and", "or", "eq", "ne", "cmp",]);
    };
    PrecedenceResolver2.prototype.isUnaryOperator = function (op) {
        return op.token.isAny(TokenTypes.unaryOperators) || op.token.isAnyKeyword(["not",]);
    };
    PrecedenceResolver2.prototype.isNamedUnaryOperator = function (node) {
        return TokenTypes.namedUnaryOperators.contains(node.name);
    };
    PrecedenceResolver2.prototype.peekNextToken = function () {
        this.nextToken();
        return this.getNode();
    };
    PrecedenceResolver2.prototype.nextToken = function () {
        this.index++;
    };
    PrecedenceResolver2.prototype.getPrecedence = function (op) {
        if (op.token.isAny([TokenTypes.arrow]))
            return -2;
        if (op.token.isAny([TokenTypes.not]))
            return -5;
        if (op.token.isAny([TokenTypes.assignment]))
            return -19;
        return 0;
    };
    PrecedenceResolver2.prototype.applyBinaryOp = function (lhs, op, rhs) {
        var node = new BinaryExpression();
        node.left = lhs;
        node.operator = op;
        node.right = rhs;
        return node;
    };
    PrecedenceResolver2.prototype.getNode = function () {
        return this.nodes[this.index];
    };
    PrecedenceResolver2.prototype.parse_primary = function () {
        var node = this.getNode();
        if (node instanceof Expression)
            return node;
        if (node instanceof Operator && this.isUnaryOperator(node)) {
            var op = node;
            var node2 = new PrefixUnaryExpression();
            node2.operator = op;
            this.nextToken();
            node2.expression = this.parse_primary();
            return node2;
        }
        else if (node instanceof NamedMemberExpression && this.isNamedUnaryOperator(node)) {
            var op = node;
            var node2 = new InvocationExpression();
            node2.target = node;
            this.nextToken();
            var right = this.getNode();
            if (right instanceof Operator && right.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                return node2;
            node2.arguments = this.parse_primary();
            return node2;
        }
        throw new Error();
    };
    PrecedenceResolver2.prototype.parse_expression = function () {
        return this.parse_expression_1(this.parse_primary(), -100);
    };
    PrecedenceResolver2.prototype.parse_expression_1 = function (lhs, min_precedence) {
        var lookahead = this.peekNextToken();
        while (lookahead instanceof Operator && this.isBinaryOperator(lookahead) && this.getPrecedence(lookahead) >= min_precedence) {
            var op = lookahead;
            this.nextToken();
            var rhs = this.parse_primary();
            lookahead = this.peekNextToken();
            //lookahead is a binary operator whose precedence is greater than op's, or a right-associative operator whose precedence is equal to op's
            while (this.shouldLookMoreAhead(lookahead, op)) {
                rhs = this.parse_expression_1(rhs, this.getPrecedence(lookahead));
                lookahead = this.peekNextToken();
            }
            lhs = this.applyBinaryOp(lhs, op, rhs); // the result of applying op with operands lhs and rhs
        }
        return lhs;
    };
    PrecedenceResolver2.prototype.shouldLookMoreAhead = function (lookahead, op) {
        if (lookahead instanceof Operator) {
            if (this.isBinaryOperator(lookahead) && this.getPrecedence(lookahead) > this.getPrecedence(op))
                return true;
            if (this.isRightAssociativeOperator(op) && this.getPrecedence(op) == this.getPrecedence(lookahead))
                return true;
        }
        return false;
    };
    return PrecedenceResolver2;
}());
