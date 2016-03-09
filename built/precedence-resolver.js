var PrecedenceResolver = (function () {
    function PrecedenceResolver(mbe) {
        this.mbe = mbe;
        this.nodes = mbe.nodes.toArray();
    }
    //isOperatorOrKeyword(node:Expression | Operator, operators: TokenType[], keywords: string[]) {
    //}
    PrecedenceResolver.prototype.resolve = function () {
        var _this = this;
        //TEMP HACKS
        this.nodes.ofType(Operator).where(function (t) { return t.token.is(TokenTypes.packageSeparator); }).forEach(function (t) { return _this.resolveBinary(t); });
        this.nodes.ofType(HashRefCreationExpression).forEach(function (t) { return _this.resolveHashMemberAccess(t); });
        this.nodes.ofType(ArrayRefDeclaration).forEach(function (t) { return _this.resolveArrayMemberAccess(t); });
        //Statement modifiers (hack)
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAnyKeyword(TokenTypes.statementModifiers); }).forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("unresolved", this.mbe.nodes);
        //    left terms and list operators (leftward)
        //    left	->
        this.nodes.ofType(Operator).where(function (t) { return t.token.is(TokenTypes.arrow); }).forEach(function (t) { return _this.resolveArrow(t); });
        this.nodes.ofType(ParenthesizedList).forEach(function (t) { return _this.resolveInvocation(t); });
        //console.log("resolved", this.nodes);
        //    nonassoc	++ --
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.inc, TokenTypes.dec]); }).forEach(function (t) { return _this.resolveAutoIncDec(t); });
        //console.log("resolved", this.nodes);
        //    right	**
        //    right	! ~ \ and unary + and - //TODO: \
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.not, TokenTypes.tilda, TokenTypes.makeRef /*TODO:, TokenTypes.plus, TokenTypes.minus*/]); }).forEach(function (t) { return _this.resolvePrefixUnary(t); });
        //console.log("resolved", this.nodes);
        //    left	=~ !~
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.regexEquals, TokenTypes.regexNotEquals]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("resolved", this.nodes);
        //    left	* / % x   //TODO: %
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.multiply, TokenTypes.div, TokenTypes.multiplyString]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("resolved", this.nodes);
        //        left	+ - .
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.plus, TokenTypes.minus, TokenTypes.concat]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("resolved", this.nodes);
        //        left	<< >>
        //        nonassoc	named unary operators
        this.nodes.ofType(Expression).where(function (t) { return _this.isNamedUnaryOperator(t); }).forEach(function (t) { return _this.resolveNamedUnaryOperator(t); });
        //hack: assume any consecutive expression is invocation
        this.nodes.ofType(NamedMemberExpression).where(function (t) { return t.token.is(TokenTypes.identifier); }).forEach(function (t) { return _this.resolveImplicitInvocation(t); });
        //console.log("resolved", this.nodes);
        //        nonassoc	< > <= >= lt gt le ge            //TODO: lt gt le ge
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([
            TokenTypes.greaterThan, TokenTypes.greaterOrEqualsThan,
            TokenTypes.smallerThan, TokenTypes.smallerOrEqualsThan,
        ]) || t.token.isAnyKeyword(["lt", "gt", "le", "ge"]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("resolved", this.nodes);
        //        nonassoc	== != <=> eq ne cmp ~~
        this.nodes.ofType(Operator).where(function (t) {
            return t.token.isAny([TokenTypes.equals, TokenTypes.notEquals, TokenTypes.numericCompare,])
                ||
                    t.token.isAnyKeyword(["eq", "ne", "cmp",]);
        })
            .forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("resolved", this.nodes);
        //        left	&
        //        left	| ^
        //        left	&&
        this.nodes.ofType(Operator).where(function (t) { return t.token.is(TokenTypes.and); }).forEach(function (t) { return _this.resolveBinary(t); });
        //        left	|| //
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.or, TokenTypes.divDiv]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //    nonassoc	..  ... //TODO: ...
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.range]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //    right	?:
        this.nodes.ofType(Operator).where(function (t) { return t.token.is(TokenTypes.question); }).forEach(function (t) { return _this.resolveTrinaryExpression(t); });
        //    right	= += -= *= etc. goto last next redo dump
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([
            TokenTypes.assignment,
            TokenTypes.addAssign,
            TokenTypes.subtractAssign,
            TokenTypes.multiplyAssign,
            TokenTypes.divideAssign,
        ]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //    left	, =>
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.comma, TokenTypes.fatComma]); }).forEach(function (t) { return _this.resolveComma(t); });
        //    nonassoc	list operators (rightward)
        //    right	not
        //    left	and
        this.nodes.ofType(Operator).where(function (t) { return t.token.isKeyword("and"); }).forEach(function (t) { return _this.resolveBinary(t); });
        //    left	or xor
        this.nodes.ofType(Operator).where(function (t) { return t.value == "or"; }).forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("resolved", this.nodes);
        if (this.nodes.length > 1)
            throw new Error("mbe not completely resolved");
        var resolved = this.nodes[0];
        return resolved;
        //return this.mbe;
    };
    PrecedenceResolver.prototype.resolveComma = function (op) {
        var index = this.nodes.indexOf(op);
        var left = this.nodes[index - 1];
        var right = this.nodes[index + 1];
        //if (left instanceof NonParenthesizedList && right instanceof Expression) {
        //    left.items.addRange(right.items);
        //    left.itemsSeparators.addRange(right.itemsSeparators);
        //    this.nodes.removeAt(index);
        //    this.nodes.removeAt(index);
        //    return left;
        //}
        if (left instanceof NonParenthesizedList) {
            left.itemsSeparators.add(op);
            this.nodes.removeAt(index);
            if (right instanceof Expression) {
                left.items.add(right);
                this.nodes.removeAt(index);
            }
            else if (right != null)
                throw new Error();
            return left;
        }
        else if (left instanceof Expression && right instanceof Expression) {
            var list = new NonParenthesizedList();
            list.items = [left, right];
            list.itemsSeparators = [op];
            this.nodes.removeAt(index - 1);
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = list;
            return list;
        }
        else if (left instanceof Expression && right == null) {
            var list = new NonParenthesizedList();
            list.items = [left];
            list.itemsSeparators = [op];
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = list;
            return list;
        }
        else
            throw new Error();
    };
    PrecedenceResolver.prototype.resolveInvocation = function (node) {
        var index = this.nodes.indexOf(node);
        if (index <= 0)
            return node;
        var left = this.nodes[index - 1];
        if (left instanceof NamedMemberExpression) {
            var node2 = new InvocationExpression();
            node2.target = left;
            node2.arguments = node;
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = node2;
            return node2;
        }
        return node;
    };
    PrecedenceResolver.prototype.toMemberExpression = function (node) {
        if (node instanceof Expression) {
            if (node instanceof MemberExpression) {
                return node;
            }
            else if (node instanceof ArrayRefDeclaration) {
                var node2 = new ArrayMemberAccessExpression();
                node2.member = node;
                return node2;
            }
            else if (node instanceof HashRefCreationExpression) {
                var node2 = new HashMemberAccessExpression();
                node2.member = node;
                return node2;
            }
        }
        return null;
    };
    PrecedenceResolver.prototype.resolveArrow = function (op) {
        var index = this.nodes.indexOf(op);
        var left = this.nodes[index - 1];
        var right = this.toMemberExpression(this.nodes[index + 1]);
        if (right == null)
            throw new Error();
        if (left instanceof Expression) {
            if (right.target != null)
                throw new Error();
            right.target = left;
            right.arrow = true;
            right.memberSeparatorToken = op.token; //TODO:.arrowOperator = op;
            this.nodes.removeAt(index - 1);
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = right;
            return right;
        }
        else {
            throw new Error();
        }
    };
    PrecedenceResolver.prototype.resolveHashMemberAccess = function (node) {
        var index = this.nodes.indexOf(node);
        var left = this.nodes[index - 1];
        if (left == null || !(left instanceof Expression))
            return;
        //if(left instanceof MemberExpression
        var node2 = new HashMemberAccessExpression();
        node2.member = node;
        node2.target = left;
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node2;
        return node2;
    };
    PrecedenceResolver.prototype.resolveArrayMemberAccess = function (node) {
        var index = this.nodes.indexOf(node);
        var left = this.nodes[index - 1];
        if (left == null || !(left instanceof Expression))
            return;
        var node2 = new ArrayMemberAccessExpression();
        node2.member = node;
        node2.target = left;
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node2;
        return node2;
    };
    PrecedenceResolver.prototype.resolveTrinaryExpression = function (op) {
        if (this.nodes.length < 5)
            throw new Error();
        var index = this.nodes.indexOf(op);
        var node = new TrinaryExpression();
        node.condition = this.nodes[index - 1];
        node.questionOperator = op;
        node.trueExpression = this.nodes[index + 1];
        node.colonOperator = this.nodes[index + 2];
        node.falseExpression = this.nodes[index + 3];
        console.log("before", this.nodes.length);
        this.nodes.splice(index - 1, 5, node);
        console.log("after", this.nodes.length);
        return node;
    };
    PrecedenceResolver.prototype.toBlockExpression = function (block) {
        var node = new BlockExpression();
        node.block = block;
        return node;
    };
    // a b c =>a(b,c)
    PrecedenceResolver.prototype.resolveImplicitInvocation = function (target) {
        var _this = this;
        var index = this.nodes.indexOf(target);
        if (index == -1)
            return null;
        var args = [];
        var i = index;
        while (true) {
            i++;
            var arg = this.nodes[i];
            if (arg == null || !(arg instanceof Expression || arg instanceof Block)) {
                break;
            }
            args.push(arg);
        }
        if (args.length == 0)
            return target;
        var node2 = new InvocationExpression();
        node2.target = target;
        var list = new NonParenthesizedList();
        list.items = args.select(function (t) { return t instanceof Block ? _this.toBlockExpression(t) : t; }); //TODO:
        list.itemsSeparators = [];
        node2.arguments = list; // new ParenthesizedList();
        //node2.arguments.items = args;
        this.nodes.splice(index, i - index, node2);
        return node2;
    };
    PrecedenceResolver.prototype.resolveNamedUnaryOperator = function (node) {
        var index = this.nodes.indexOf(node);
        if (index == -1)
            return null;
        var nextNode = this.nodes[index + 1];
        if (nextNode instanceof Expression) {
            var node2 = new InvocationExpression();
            node2.target = node;
            node2.arguments = nextNode;
            this.nodes.removeAt(index);
            this.nodes.removeAt(index);
            this.nodes[index] = node2;
            return node2;
        }
        else if (nextNode instanceof Block) {
            var node2 = new InvocationExpression();
            node2.target = node;
            node2.arguments = this.toBlockExpression(nextNode);
            this.nodes.removeAt(index);
            this.nodes[index] = node2;
            return node2;
        }
        return node;
    };
    PrecedenceResolver.prototype.isWhitespaceOperator = function (op) {
        return op.token.is(TokenTypes.whitespace);
    };
    PrecedenceResolver.prototype.isNamedUnaryOperator = function (node) {
        return node instanceof NamedMemberExpression && TokenTypes.namedUnaryOperators.contains(node.name);
    };
    PrecedenceResolver.prototype.getAs = function (type, index) {
        var node = this.nodes[index];
        if (node instanceof type)
            return node;
        return null;
    };
    PrecedenceResolver.prototype.resolveBinary = function (op) {
        var node = new BinaryExpression();
        var index = this.nodes.indexOf(op);
        node.left = this.nodes[index - 1];
        node.operator = op;
        node.right = this.nodes[index + 1];
        this.nodes.removeAt(index - 1);
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node;
        return node;
    };
    PrecedenceResolver.prototype.resolveAutoIncDec = function (op) {
        var index = this.nodes.indexOf(op);
        var left = this.nodes[index - 1];
        if (left instanceof Expression)
            return this.resolvePostfixUnary(op);
        var right = this.nodes[index + 1];
        if (right instanceof Expression)
            return this.resolvePrefixUnary(op);
        throw new Error();
    };
    PrecedenceResolver.prototype.resolvePostfixUnary = function (op) {
        var node = new PostfixUnaryExpression();
        var index = this.nodes.indexOf(op);
        node.operator = op;
        node.expression = this.nodes[index - 1];
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node;
        return node;
    };
    PrecedenceResolver.prototype.resolvePrefixUnary = function (op) {
        var node = new PrefixUnaryExpression();
        var index = this.nodes.indexOf(op);
        node.operator = op;
        node.expression = this.nodes[index + 1];
        this.nodes.removeAt(index);
        this.nodes[index] = node;
        return node;
    };
    return PrecedenceResolver;
}());
