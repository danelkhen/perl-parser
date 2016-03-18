var PrecedenceResolver = (function () {
    function PrecedenceResolver(mbe) {
        this.mbe = mbe;
        this.nodes = mbe.nodes.toArray();
    }
    //isOperatorOrKeyword(node:Expression | Operator, operators: TokenType[], keywords: string[]) {
    //}
    PrecedenceResolver.prototype.resolve3 = function (nodes, allowNonParenthesizedList) {
        var mbe = new UnresolvedExpression();
        mbe.nodes = nodes;
        return this.resolve2(mbe, allowNonParenthesizedList);
    };
    PrecedenceResolver.prototype.resolve2 = function (mbe, allowNonParenthesizedList) {
        var resolver = new PrecedenceResolver(mbe);
        return resolver.resolve(allowNonParenthesizedList);
    };
    PrecedenceResolver.prototype.resolveStatementModifier = function (op) {
        var index = this.nodes.indexOf(op);
        if (index <= 0)
            throw new Error();
        var left = new UnresolvedExpression();
        left.nodes = this.nodes.slice(0, index);
        var right = new UnresolvedExpression();
        right.nodes = this.nodes.slice(index + 1);
        var left2 = this.resolve2(left);
        var right2 = this.resolve2(right);
        this.nodes = [left2, op, right2];
        var res = this.resolveBinary(op);
        return res;
    };
    //split(nodes: Expression[]): Array<Expression[]> {
    //    let index = 0;
    //}
    //isFunction(node: Expression | Operator | Block): boolean {
    //}
    PrecedenceResolver.prototype.resolve = function (allowNonParenthesizedList) {
        var _this = this;
        if (this.nodes.length == 1 && this.nodes[0] instanceof Expression)
            return this.nodes[0];
        //TEMP HACKS
        this.nodes.ofType(Operator).where(function (t) { return t.token.is(TokenTypes.packageSeparator); }).forEach(function (t) { return _this.resolveArrow(t); });
        this.nodes.ofType(HashRefCreationExpression).forEach(function (t) { return _this.resolveCodeRefOrDeref(t); });
        this.nodes.ofType(HashRefCreationExpression).forEach(function (t) { return _this.resolveHashMemberAccess(t); });
        this.nodes.ofType(ArrayRefDeclaration).forEach(function (t) { return _this.resolveArrayMemberAccess(t); });
        //Statement modifiers (hack)
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAnyKeyword(TokenTypes.statementModifiers); }).forEach(function (t) { return _this.resolveStatementModifier(t); });
        //    left terms and list operators (leftward)
        this.nodes.ofType(NamedMemberExpression).where(function (t) { return t.token.isAny([TokenTypes.identifier, TokenTypes.keyword]) && !_this.isNamedUnaryOperator(t); }).forEach(function (t) { return _this.resolveImplicitInvocation(t, true); });
        //    left	->
        this.nodes.ofType(Operator).where(function (t) { return t.token.is(TokenTypes.arrow); }).forEach(function (t) { return _this.resolveArrow(t); });
        this.nodes.ofType(ParenthesizedList).forEach(function (t) { return _this.resolveInvocation(t); });
        //console.log("resolved", this.nodes);
        //    nonassoc	++ --
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.inc, TokenTypes.dec]); }).forEach(function (t) { return _this.resolveAutoIncDec(t); });
        //console.log("resolved", this.nodes);
        //    right	**
        //    right	! ~ \ and unary + and - //TODO: moved to be under namedUnaryOperators - since !exists $a->{"b"}
        this.nodes.reversed().ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.not, TokenTypes.tilda, TokenTypes.makeRef, TokenTypes.sigil, TokenTypes.lastIndexVar, TokenTypes.plus, TokenTypes.minus /*TODO: coderef TokenTypes.multiply, TokenTypes.plus, TokenTypes.minus*/]); }).forEach(function (t) { return _this.resolvePrefixUnary(t); });
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
        this.nodes.ofType(NamedMemberExpression).where(function (t) { return _this.isNamedUnaryOperator(t); }).forEach(function (t) { return _this.resolveNamedUnaryOperator(t); });
        //this.nodes.reversed().ofType(Operator).where(t=> t.token.isAny([TokenTypes.not, TokenTypes.tilda, TokenTypes.makeRef, TokenTypes.sigil, TokenTypes.lastIndexVar, TokenTypes.plus, TokenTypes.minus /*TODO: coderef TokenTypes.multiply, TokenTypes.plus, TokenTypes.minus*/])).forEach(t=> this.resolvePrefixUnary(t));        
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
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.range, TokenTypes.range3]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //    right	?:
        this.nodes.reversed().ofType(Operator).where(function (t) { return t.token.is(TokenTypes.question); }).forEach(function (t) { return _this.resolveTrinaryExpression(t); });
        //    right	= += -= *= etc. goto last next redo dump
        this.nodes.reversed().ofType(Operator).where(function (t) { return t.token.isAny([
            TokenTypes.assignment,
            TokenTypes.addAssign,
            TokenTypes.subtractAssign,
            TokenTypes.multiplyAssign,
            TokenTypes.divideAssign,
            TokenTypes.orAssign,
            TokenTypes.xorAssign,
            TokenTypes.divDivAssign,
            TokenTypes.concatAssign,
        ]); }).forEach(function (t) { return _this.resolveBinary(t); });
        //    left	, =>
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.comma, TokenTypes.fatComma]); }).forEach(function (t) { return _this.resolveComma(t); });
        //    nonassoc	list operators (rightward)
        //    right	not
        this.nodes.reversed().ofType(Operator).where(function (t) { return t.token.isAnyKeyword(["not"]); }).forEach(function (t) { return _this.resolvePrefixUnary(t); });
        //    left	and
        this.nodes.ofType(Operator).where(function (t) { return t.token.isKeyword("and"); }).forEach(function (t) { return _this.resolveBinary(t); });
        //    left	or xor
        this.nodes.ofType(Operator).where(function (t) { return t.value == "or"; }).forEach(function (t) { return _this.resolveBinary(t); });
        //console.log("resolved", this.nodes);
        if (this.nodes.length > 1) {
            if (allowNonParenthesizedList && this.nodes.where(function (t) { return t instanceof Expression || t instanceof Block; }).length == this.nodes.length) {
                var node = new NonParenthesizedList();
                node.items = this.nodes.select(function (t) { return t instanceof Block ? _this.toBlockExpression(t) : t; });
                node.itemsSeparators = [];
                return node;
            }
            console.warn("mbe not completely resolved", this.mbe.toCode(), this.mbe, this.nodes);
            return this.mbe;
        }
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
    PrecedenceResolver.prototype.getRootMember = function (node) {
        var target = node.target;
        if (target instanceof MemberExpression)
            return this.getRootMember(target);
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
            else if (node instanceof ParenthesizedList) {
                var node2 = new InvocationExpression();
                node2.arguments = node;
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
            var rootMember = this.getRootMember(right);
            if (rootMember.target != null)
                throw new Error();
            rootMember.target = left;
            rootMember.arrow = op.token.is(TokenTypes.arrow);
            rootMember.memberSeparatorToken = op.token; //TODO:.arrowOperator = op;
            this.nodes.removeAt(index - 1);
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = right;
            return right;
        }
        else {
            throw new Error();
        }
    };
    PrecedenceResolver.prototype.isBareword = function (node) {
        return node instanceof NamedMemberExpression && node.token.is(TokenTypes.identifier);
    };
    PrecedenceResolver.prototype.resolveHashMemberAccess = function (node) {
        var index = this.nodes.indexOf(node);
        if (index < 0)
            return null;
        var left = this.nodes[index - 1];
        if (left == null)
            return node;
        //if (left == null || !(left instanceof Expression) || this.isBareword(left)){
        if (left instanceof Expression) {
            if (left instanceof NamedMemberExpression && left.token.is(TokenTypes.identifier))
                return node;
            var node2 = new HashMemberAccessExpression();
            node2.member = node;
            node2.target = left;
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = node2;
            return node2;
        }
        return node;
    };
    PrecedenceResolver.prototype.resolveCodeRefOrDeref = function (node) {
        var index = this.nodes.indexOf(node);
        var left = this.nodes[index - 1];
        if (left instanceof Operator && left.token.isAny([TokenTypes.multiply, TokenTypes.sigil])) {
            return this.resolvePrefixUnary(left);
        }
        return node;
    };
    PrecedenceResolver.prototype.resolveArrayMemberAccess = function (node) {
        var index = this.nodes.indexOf(node);
        var left = this.nodes[index - 1];
        if (left != null && (left instanceof Expression || (left instanceof Operator && left.token.is(TokenTypes.arrow)))) {
            var node2 = new ArrayMemberAccessExpression();
            node2.member = node;
            if (left instanceof Expression) {
                node2.target = left;
                this.nodes.removeAt(index - 1);
                this.nodes[index - 1] = node2;
            }
            else
                this.nodes[index] = node2;
            return node2;
        }
        return node;
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
    PrecedenceResolver.prototype.isBinaryOperator = function (op) {
        return op.token.isAny(TokenTypes.binaryOperators) || op.token.isAnyKeyword(["and", "or", "eq", "ne", "cmp",]);
    };
    //isUnaryOperator(op: Operator): boolean {
    //    //if(op.value
    //}
    // a b c =>a(b,c)
    PrecedenceResolver.prototype.resolveImplicitInvocation = function (target, allowCommas) {
        var index = this.nodes.indexOf(target);
        if (index == -1)
            return null;
        //TODO: this causes issues
        //let left = this.nodes[index - 1];
        //if (left != null && left instanceof Operator && left.token.isAny([TokenTypes.arrow, TokenTypes.packageSeparator]))
        //    return target;
        var right = this.nodes[index + 1];
        var resolvedArgs = null;
        var i = index;
        if (right == null)
            return target;
        //TODO: this is the alternative that causes issues
        if (right instanceof Operator && right.token.isAny([TokenTypes.arrow, TokenTypes.packageSeparator]))
            return target;
        if (right instanceof Operator && (this.isBinaryOperator(right) || right.token.isAny([TokenTypes.question])))
            return target;
        if (!allowCommas && right instanceof Operator && right.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
            return target;
        var rightCount = 0;
        if (right instanceof ParenthesizedList) {
            resolvedArgs = right;
            rightCount++;
        }
        else {
            var args = new UnresolvedExpression();
            args.nodes = this.takeAsLongAs(i + 1, function (arg) {
                if (!allowCommas && arg instanceof Operator && arg.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                    return false;
                if (arg instanceof Operator && arg.token.isAny([TokenTypes.colon]))
                    return false;
                if (arg instanceof Operator && arg.token.isAnyKeyword(["and", "or", "not"]))
                    return false;
                return true;
            });
            if (args.nodes.length == 0)
                return target;
            resolvedArgs = this.resolve2(args, true);
            rightCount += args.nodes.length;
        }
        var node2 = new InvocationExpression();
        node2.target = target;
        node2.arguments = resolvedArgs;
        this.nodes.splice(index, rightCount + 1, node2);
        return node2;
    };
    PrecedenceResolver.prototype.takeAsLongAs = function (from, until) {
        var list = [];
        for (var _i = 0, _a = this.nodes.skip(from); _i < _a.length; _i++) {
            var item = _a[_i];
            if (!until(item))
                break;
            list.push(item);
        }
        return list;
    };
    PrecedenceResolver.prototype.takeAsLongAsInclusive = function (from, until) {
        var list = [];
        for (var _i = 0, _a = this.nodes.skip(from); _i < _a.length; _i++) {
            var item = _a[_i];
            list.push(item);
            if (!until(item))
                break;
        }
        return list;
    };
    PrecedenceResolver.prototype.resolveNamedUnaryOperator = function (node) {
        //return this.resolveImplicitInvocation(node, false);
        var index = this.nodes.indexOf(node);
        if (index == -1)
            return null;
        var nextNode = this.nodes[index + 1];
        if (nextNode instanceof Expression) {
            var node2 = new InvocationExpression();
            node2.target = node;
            node2.arguments = nextNode;
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
        return TokenTypes.namedUnaryOperators.contains(node.name);
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
        if (index < 0)
            return null;
        var left = this.nodes[index - 1];
        var right = this.nodes[index + 1];
        if (left instanceof Block)
            left = this.toBlockExpression(left);
        if (left instanceof Expression && right instanceof Expression) {
            node.left = left;
            node.operator = op;
            node.right = right;
            this.nodes.removeAt(index - 1);
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = node;
            return node;
        }
        return op;
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
        //let right = this.nodes[index + 1];
        var left = this.nodes[index - 1];
        if (left instanceof Expression && op.token.isAny([TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply])) {
            return null; //op;
        }
        var right = [this.nodes[index + 1]];
        if (right[0] instanceof NamedMemberExpression && this.isNamedUnaryOperator(right[0]))
            right.add(this.nodes[index + 2]);
        var right2 = this.resolve3(right);
        node.operator = op;
        node.expression = right2;
        this.nodes.removeRange(right);
        this.nodes[index] = node;
        return node;
    };
    return PrecedenceResolver;
}());
