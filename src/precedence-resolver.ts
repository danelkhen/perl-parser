class PrecedenceResolver {
    constructor(public mbe: UnresolvedExpression) {
        this.nodes = mbe.nodes.toArray();
    }
    nodes: Array<Expression | Operator | Block>;

    //isOperatorOrKeyword(node:Expression | Operator, operators: TokenType[], keywords: string[]) {

    //}
    resolve() {
        //TEMP HACKS
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.packageSeparator)).forEach(t=> this.resolveBinary(t));
        this.nodes.ofType(HashRefCreationExpression).forEach(t=> this.resolveHashMemberAccess(t));
        this.nodes.ofType(ArrayRefDeclaration).forEach(t=> this.resolveArrayMemberAccess(t));
        //Statement modifiers (hack)
        this.nodes.ofType(Operator).where(t=> t.token.isAnyKeyword(["for", "if", "while", "foreach"])).forEach(t=> this.resolveBinary(t));

        console.log("unresolved", this.mbe.nodes);
        //    left terms and list operators (leftward)
        //    left	->
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.arrow)).forEach(t=> this.resolveBinary(t));
        console.log("resolved", this.nodes);
        //    nonassoc	++ --
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.inc, TokenTypes.dec])).forEach(t=> this.resolveAutoIncDec(<Operator>t));
        console.log("resolved", this.nodes);
        //    right	**
        //    right	! ~ \ and unary + and - //TODO: \
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.not, TokenTypes.tilda, TokenTypes.makeRef/*TODO:, TokenTypes.plus, TokenTypes.minus*/])).forEach(t=> this.resolvePrefixUnary(t));
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
        //        nonassoc	< > <= >= lt gt le ge            //TODO: lt gt le ge
        this.nodes.ofType(Operator).where(t=> t.token.isAny([
            TokenTypes.greaterThan, TokenTypes.greaterOrEqualsThan,
            TokenTypes.smallerThan, TokenTypes.smallerOrEqualsThan,
        ]) || t.token.isAnyKeyword(["lt", "gt", "le", "ge"])).forEach(t=> this.resolveBinary(<Operator>t));
        console.log("resolved", this.nodes);
        //        nonassoc	== != <=> eq ne cmp ~~
        this.nodes.ofType(Operator).where(t=>
            t.token.isAny([TokenTypes.equals, TokenTypes.notEquals, TokenTypes.numericCompare, ])
            ||
            t.token.isAnyKeyword(["eq", "ne", "cmp", ]))
            .forEach(t=> this.resolveBinary(t));
        console.log("resolved", this.nodes);
        //        left	&
        //        left	| ^
        //        left	&&
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.and)).forEach(t=> this.resolveBinary(<Operator>t));
        //        left	|| //
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.or, TokenTypes.divDiv])).forEach(t=> this.resolveBinary(<Operator>t));
        //    nonassoc	..  ... //TODO: ...
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.range])).forEach(t=> this.resolveBinary(<Operator>t));
        //    right	?:
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.question)).forEach(t=> this.resolveTrinaryExpression(<Operator>t));
        //    right	= += -= *= etc. goto last next redo dump
        this.nodes.ofType(Operator).where(t=> t.token.isAny([
            TokenTypes.assignment,
            TokenTypes.addAssign,
            TokenTypes.subtractAssign,
            TokenTypes.multiplyAssign,
            TokenTypes.divideAssign,
        ])).forEach(t=> this.resolveBinary(<Operator>t));
        //    left	, =>
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.comma, TokenTypes.fatComma])).forEach(t=> this.resolveComma(t));
        //    nonassoc	list operators (rightward)
        //    right	not
        //    left	and
        this.nodes.ofType(Operator).where(t=> t.token.isKeyword("and")).forEach(t=> this.resolveBinary(<Operator>t));
        //    left	or xor
        this.nodes.ofType(Operator).where(t=> t.value == "or").forEach(t=> this.resolveBinary(t));


        //hack: assume any consecutive expression is invocation
        this.nodes.ofType(Expression).where(t=> true).forEach(t=> this.resolveImplicitInvocation(t));
        console.log("resolved", this.nodes);
        if (this.nodes.length > 1)
            throw new Error("mbe not completely resolved");
        let resolved = <Expression>this.nodes[0];
        return resolved;
        //return this.mbe;
    }

    resolveComma(op: Operator) {
        let index = this.nodes.indexOf(op);
        let left = this.nodes[index - 1];
        let right = this.nodes[index + 1];
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
        //else if (left instanceof Expression && right instanceof NonParenthesizedList) {
        //    throw new Error("shouldn't happen");
        //    right.items.insert(0, left);
        //    right.itemsSeparators.insert(0, [op.token]);
        //    this.nodes.removeAt(index - 1);
        //    this.nodes.removeAt(index - 1);
        //    return right;
        //}
        else if (left instanceof Expression && right instanceof Expression) {
            let list = new NonParenthesizedList();
            list.items = [left, right];
            list.itemsSeparators = [op];
            this.nodes.removeAt(index - 1);
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = list;
            return list;
        }
        else if (left instanceof Expression && right == null) {
            let list = new NonParenthesizedList();
            list.items = [left];
            list.itemsSeparators = [op];
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = list;
            return list;
        }
        else
            throw new Error();
    }

    resolveHashMemberAccess(node: HashRefCreationExpression): Expression {
        let index = this.nodes.indexOf(node);
        let left = this.nodes[index - 1];
        if (left == null || !(left instanceof Expression))
            return;
        let node2 = new HashMemberAccessExpression();
        node2.member = node;
        node2.target = <Expression>left;
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node2;
        return node2;
    }
    resolveArrayMemberAccess(node: ArrayRefDeclaration): Expression {
        let index = this.nodes.indexOf(node);
        let left = this.nodes[index - 1];
        if (left == null || !(left instanceof Expression))
            return;
        let node2 = new ArrayMemberAccessExpression();
        node2.member = node;
        node2.target = <Expression>left;
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node2;
        return node2;
    }

    resolveTrinaryExpression(op: Operator): TrinaryExpression {
        if(this.nodes.length<5)
            throw new Error();
        let index = this.nodes.indexOf(op);
        let node = new TrinaryExpression();
        node.condition = <Expression>this.nodes[index - 1];
        node.questionOperator = op;
        node.trueExpression = <Expression>this.nodes[index + 1];
        node.colonOperator = <Operator>this.nodes[index + 2];
        node.falseExpression = <Expression>this.nodes[index + 3];
        console.log("before", this.nodes.length);
        this.nodes.splice(index-1, 5, node);
        console.log("after", this.nodes.length);
        return node;
    }
    // a b c =>a(b,c)
    resolveImplicitInvocation(target: Expression) {
        let index = this.nodes.indexOf(target);
        if (index == -1)
            return null;
        let args = [];
        let i = index;
        while (true) {
            i++;
            let arg = this.nodes[i];
            if (arg == null || !(arg instanceof Expression)) {
                break;
            }
            args.push(arg);
        }
        if (args.length == 0)
            return target;
        let node2 = new InvocationExpression();
        node2.target = target;
        let list = new NonParenthesizedList();
        list.items = args;//TODO:
        list.itemsSeparators = [];
        node2.arguments = list;// new ParenthesizedList();
        //node2.arguments.items = args;
        this.nodes.splice(index, i - index, node2);
        return node2;
    }
    isWhitespaceOperator(op: Operator) {
        return op.token.is(TokenTypes.whitespace);
    }
    resolveNamedUnaryOperator(node: Expression) {
        let index = this.nodes.indexOf(node);
        if(index==-1)
            return null;
        let nextNode = this.nodes[index + 1];

        if (nextNode instanceof Expression) {
            let node2 = new InvocationExpression();
            node2.target = node;
            node2.arguments = nextNode;
            this.nodes.removeAt(index);
            this.nodes.removeAt(index);
            this.nodes[index] = node2;
            return node2;
        }
        else if (nextNode instanceof Block) { //TODO: check next param without comma
            let node2 = new InvocationExpression();
            node2.target = node;
            node2.firstParamBlock = nextNode;
            this.nodes.removeAt(index);
            this.nodes.removeAt(index);
            this.nodes[index] = node2;
            return node2;
        }
        return node;

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
        this.nodes.removeAt(index - 1);
        this.nodes[index - 1] = node;
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

