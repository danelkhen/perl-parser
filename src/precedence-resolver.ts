class PrecedenceResolver {
    constructor(public mbe: FlatExpressionsAndOperators) {
        this.nodes = mbe.nodes.toArray();
    }
    nodes: Array<Expression | Operator>;
    resolve() {
        console.log("unresolved", Q.copy(this.mbe.nodes));
        //    left terms and list operators (leftward)
        //    left	->
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.arrow)).forEach(t=> this.resolveBinary(<Operator>t));
        console.log("resolved", this.nodes);
        //    nonassoc	++ --
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.inc, TokenTypes.dec])).forEach(t=> this.resolveAutoIncDec(<Operator>t));
        console.log("resolved", this.nodes);
        //    right	**
        //    right	! ~ \ and unary + and - //TODO: \
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.not, TokenTypes.tilda, TokenTypes.plus, TokenTypes.minus])).forEach(t=> this.resolveBinary(t));
        console.log("resolved", this.nodes);
        //    left	=~ !~
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.regexEquals, TokenTypes.regexNotEquals])).forEach(t=> this.resolveBinary(t));
        console.log("resolved", this.nodes);
        //    left	* / % x   //TODO: %
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.multiply, TokenTypes.div, TokenTypes.multiplyString])).forEach(t=> this.resolveBinary(t));
        console.log("resolved", this.nodes);
        //        left	+ - .
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.plus, TokenTypes.minus, TokenTypes.concat])).forEach(t=> this.resolveBinary(t));
        console.log("resolved", this.nodes);
        //        left	<< >>
        //        nonassoc	named unary operators
        this.nodes.ofType(Expression).where(t=> this.isNamedUnaryOperator(t)).forEach(t=> this.resolveNamedUnaryOperator(t));
        console.log("resolved", this.nodes);
        //        nonassoc	< > <= >= lt gt le ge
        this.nodes.ofType(Operator).where(t=> t.token.isAny([
            TokenTypes.greaterThan, TokenTypes.greaterOrEqualsThan, 
            TokenTypes.smallerThan, TokenTypes.smallerOrEqualsThan, 
            //TODO: lt gt le ge
            ])).forEach(t=> this.resolveBinary(<Operator>t));
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
        this.nodes.ofType(Operator).where(t=> t.value == "or").forEach(t=> this.resolveBinary(t));
        console.log("resolved", this.nodes);
        if (this.nodes.length > 1)
            throw new Error("mbe not completely resolved");
        let resolved = <Expression>this.nodes[0];
        return resolved;
        //return this.mbe;
    }


    isWhitespaceOperator(op: Operator) {
        return op.token.is(TokenTypes.whitespace);
    }
    resolveNamedUnaryOperator(node: Expression) {
        let index = this.nodes.indexOf(node);
        let nextNode = this.nodes[index + 1];
        let node2 = new InvocationExpression();
        node2.arguments = new ListDeclaration();

        if (nextNode instanceof Expression) {
            node2.arguments.items.add(nextNode);
            this.nodes.removeAt(index);
            this.nodes.removeAt(index);
        }

        return node2;
    }
    isNamedUnaryOperator(node: Expression): boolean {
        return node instanceof MemberExpression && this.namedUnaryOperators.contains(node.name);
    }

    getAs<T extends Expression | Operator>(type: Type<T>, index: number): T {
        let node = this.nodes[index];
        if (node instanceof type)
            return <T>node;
        return null;
    }
    resolveBinary(op: Operator) {
        let node = new BinaryExpression();
        let index = this.nodes.indexOf(op);
        node.left = <Expression>this.nodes[index - 1];
        node.operator = op;
        node.right = <Expression>this.nodes[index + 1];
        this.nodes.removeAt(index - 1);
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node;
        return node;
    }
    resolveAutoIncDec(op: Operator) {
        let index = this.nodes.indexOf(op);
        let left = this.nodes[index - 1];
        if (left instanceof Expression)
            return this.resolvePostfixUnary(op);
        let right = this.nodes[index + 1];
        if (right instanceof Expression)
            return this.resolvePrefixUnary(op);
        throw new Error();
    }
    resolvePostfixUnary(op: Operator) {
        let node = new PostfixUnaryExpression();
        let index = this.nodes.indexOf(op);
        node.operator = op;
        node.expression = <Expression>this.nodes[index - 1];
        this.nodes.removeAt(index-1);
        this.nodes[index-1] = node;
        return node;
    }
    resolvePrefixUnary(op: Operator) {
        let node = new PrefixUnaryExpression();
        let index = this.nodes.indexOf(op);
        node.operator = op;
        node.expression = <Expression>this.nodes[index + 1];
        this.nodes.removeAt(index);
        this.nodes[index] = node;
        return node;
    }

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
    namedUnaryOperators = [
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

}

