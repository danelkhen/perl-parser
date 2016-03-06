var PrecedenceResolver = (function () {
    function PrecedenceResolver(mbe) {
        this.mbe = mbe;
        //resolveMemberExpression(op: Operator) {
        //    let index = this.mbe.items.indexOf(op);
        //    let left = this.mbe.items[index - 1];
        //    let right = this.mbe.items[index + 1];
        //    let arrow = op.token.is(TokenTypes.arrow);
        //    if (right instanceof MemberExpression) {
        //        right.target = left;
        //        right.arrow = arrow;
        //        //right.arr
        //    }
        //    else if (right instanceof HashMemberAccessExpression) {
        //        right.target = left;
        //        right.arrow = arrow;
        //    }
        //    else if (right instanceof ArrayMemberAccessExpression) {
        //        right.target = left;
        //        right.arrow = arrow;
        //    }
        //    else
        //        throw new Error();
        //    this.mbe.expressions.removeAt(index);
        //    this.mbe.operators.removeAt(index);
        //    return right;
        //}
        //Named Unary Operators
        this.namedUnaryOperators = [
            "gethostbyname", "localtime", "return",
            "alarm", "getnetbyname", "lock", "rmdir",
            "caller", "getpgrp", "log", "scalar",
            "chdir", "getprotobyname", "lstat", "sin",
            "chroot", "glob", "my", "sleep",
            "cos", "gmtime", "oct", "sqrt",
            "defined", "goto", "ord", "srand",
            "delete", "hex", "quotemeta", "stat",
            "do", "int", "rand", "uc",
            "eval", "lc", "readlink", "ucfirst",
            "exists", "lcfirst", "ref", "umask",
            "exit", "length", "require", "undef",
        ];
        this.nodes = mbe.nodes.toArray();
    }
    PrecedenceResolver.prototype.resolve = function () {
        var _this = this;
        console.log("unresolved", Q.copy(this.mbe.nodes));
        //    left terms and list operators (leftward)
        //    left	->
        this.nodes.ofType(Operator).where(function (t) { return t.token.is(TokenTypes.arrow); }).forEach(function (t) { return _this.resolveBinary(t); });
        console.log("resolved", this.nodes);
        //    nonassoc	++ --
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.inc, TokenTypes.dec]); }).forEach(function (t) { return _this.resolveAutoIncDec(t); });
        console.log("resolved", this.nodes);
        //    right	**
        //    right	! ~ \ and unary + and - //TODO: \
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.not, TokenTypes.tilda, TokenTypes.plus, TokenTypes.minus]); }).forEach(function (t) { return _this.resolveBinary(t); });
        console.log("resolved", this.nodes);
        //    left	=~ !~
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.regexEquals, TokenTypes.regexNotEquals]); }).forEach(function (t) { return _this.resolveBinary(t); });
        console.log("resolved", this.nodes);
        //    left	* / % x   //TODO: %
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.multiply, TokenTypes.div, TokenTypes.multiplyString]); }).forEach(function (t) { return _this.resolveBinary(t); });
        console.log("resolved", this.nodes);
        //        left	+ - .
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([TokenTypes.plus, TokenTypes.minus, TokenTypes.concat]); }).forEach(function (t) { return _this.resolveBinary(t); });
        console.log("resolved", this.nodes);
        //        left	<< >>
        //        nonassoc	named unary operators
        this.nodes.ofType(Expression).where(function (t) { return _this.isNamedUnaryOperator(t); }).forEach(function (t) { return _this.resolveNamedUnaryOperator(t); });
        console.log("resolved", this.nodes);
        //        nonassoc	< > <= >= lt gt le ge
        this.nodes.ofType(Operator).where(function (t) { return t.token.isAny([
            TokenTypes.greaterThan, TokenTypes.greaterOrEqualsThan,
            TokenTypes.smallerThan, TokenTypes.smallerOrEqualsThan,
        ]); }).forEach(function (t) { return _this.resolveBinary(t); });
        console.log("resolved", this.nodes);
        //        nonassoc	== != <=> eq ne cmp ~~
        //        left	&
        //        left	| ^
        //        left	&&
        //        left	|| //
        //    nonassoc	..  ...
        //    right	?:
        //    right	= += -= *= etc. goto last next redo dump
        //    left	, =>
        //    nonassoc	list operators (rightward)
        //    right	not
        //    left	and
        //    left	or xor
        this.nodes.ofType(Operator).where(function (t) { return t.value == "or"; }).forEach(function (t) { return _this.resolveBinary(t); });
        console.log("resolved", this.nodes);
        if (this.nodes.length > 1)
            throw new Error("mbe not completely resolved");
        var resolved = this.nodes[0];
        return resolved;
        //return this.mbe;
    };
    PrecedenceResolver.prototype.isWhitespaceOperator = function (op) {
        return op.token.is(TokenTypes.whitespace);
    };
    PrecedenceResolver.prototype.resolveNamedUnaryOperator = function (node) {
        var index = this.nodes.indexOf(node);
        var nextNode = this.nodes[index + 1];
        var node2 = new InvocationExpression();
        node2.arguments = new ListDeclaration();
        if (nextNode instanceof Expression) {
            node2.arguments.items.add(nextNode);
            this.nodes.removeAt(index);
            this.nodes.removeAt(index);
        }
        return node2;
    };
    PrecedenceResolver.prototype.isNamedUnaryOperator = function (node) {
        return node instanceof MemberExpression && this.namedUnaryOperators.contains(node.name);
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
