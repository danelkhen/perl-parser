import {TokenTypes} from "./token-types";
import {Logger, LogLevel} from "./utils";

import {
AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
HasArrow, HasLabel,
} from "./ast";


export class PrecedenceResolver {
    constructor(public mbe: UnresolvedExpression) {
        this.nodes = mbe.nodes.toArray();
    }
    nodes: AstNode[];
    logger: Logger;

    //isOperatorOrKeyword(node:Expression | Operator, operators: TokenType[], keywords: string[]) {

    //}

    resolve3(nodes: AstNode[], allowNonParenthesizedList?: boolean): Expression {
        let mbe = new UnresolvedExpression();
        mbe.nodes = nodes;
        return this.resolve2(mbe, allowNonParenthesizedList);
    }
    resolve2(mbe: UnresolvedExpression, allowNonParenthesizedList?: boolean): Expression {
        let resolver = new PrecedenceResolver(mbe);
        resolver.logger = this.logger;
        return resolver.resolve(allowNonParenthesizedList);
    }
    resolveStatementModifier(op: Operator) {
        let index = this.nodes.indexOf(op);
        if (index <= 0)
            throw new Error("resolveStatementModifier");
        let left = new UnresolvedExpression();
        left.nodes = this.nodes.slice(0, index);
        let right = new UnresolvedExpression();
        right.nodes = this.nodes.slice(index + 1);
        let left2 = this.resolve2(left);
        let right2 = this.resolve2(right);
        this.nodes = [left2, op, right2];
        let res = this.resolveBinary(op);
        return res;
    }


    //split(nodes: Expression[]): Array<Expression[]> {
    //    let index = 0;
    //}

    //isFunction(node: Expression | Operator | Block): boolean {
    //}
    resolve(allowNonParenthesizedNoCommaList?: boolean) {
        if (this.nodes.length == 1 && this.nodes[0] instanceof Expression)
            return <Expression>this.nodes[0];

        //TEMP HACKS
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.packageSeparator)).forEach(t=> this.resolveArrow(t));
        this.nodes.ofType(HashRefCreationExpression).forEach(t=> this.resolveCodeRefOrDeref(t));
        this.nodes.ofType(HashRefCreationExpression).forEach(t=> this.resolveHashMemberAccess(t));
        this.nodes.ofType(ArrayRefDeclaration).forEach(t=> this.resolveArrayMemberAccess(t));
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.bitwiseAnd)).forEach(t=> this.resolveSigilPrefixUnary(t));
        //Statement modifiers (hack)
        this.nodes.ofType(Operator).where(t=> t.token.isAnyKeyword(TokenTypes.statementModifiers)).forEach(t=> this.resolveStatementModifier(t));

        //    left terms and list operators (leftward)
        this.nodes.ofType(NamedMemberExpression).where(t=> t.token.isAny([TokenTypes.identifier, TokenTypes.keyword]) && !this.isNamedUnaryOperator(t)).forEach(t=> this.resolveImplicitInvocation(t, true));
        //    left	->
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.arrow)).forEach(t=> this.resolveArrow(t));

        this.nodes.ofType(ParenthesizedList).forEach(t=> this.resolveInvocation(t));
        //console.log("resolved", this.nodes);
        //    nonassoc	++ --
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.inc, TokenTypes.dec])).forEach(t=> this.resolveAutoIncDec(t));
        //console.log("resolved", this.nodes);
        //    right	**
        //    right	! ~ \ and unary + and -
        this.nodes.reversed().ofType(Operator).where(t=> t.token.isAny([TokenTypes.not, TokenTypes.tilda, TokenTypes.makeRef, TokenTypes.sigil, TokenTypes.lastIndexVar, TokenTypes.plus, TokenTypes.minus,  /*TODO: coderef TokenTypes.multiply*/])).forEach(t=> this.resolvePrefixUnary(t));
        //console.log("resolved", this.nodes);
        //    left	=~ !~
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.regexEquals, TokenTypes.regexNotEquals])).forEach(t=> this.resolveBinary(t));
        //console.log("resolved", this.nodes);
        //    left	* / % x   //TODO: %
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.multiply, TokenTypes.div, TokenTypes.multiplyString])).forEach(t=> this.resolveBinary(t));
        //console.log("resolved", this.nodes);
        //        left	+ - .
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.plus, TokenTypes.minus, TokenTypes.concat])).forEach(t=> this.resolveBinary(t));
        //console.log("resolved", this.nodes);
        //        left	<< >>
        //        nonassoc	named unary operators
        this.nodes.ofType(NamedMemberExpression).where(t=> this.isNamedUnaryOperator(t)).forEach(t=> this.resolveNamedUnaryOperator(t));
        
        //console.log("resolved", this.nodes);
        //        nonassoc	< > <= >= lt gt le ge            //TODO: lt gt le ge
        this.nodes.ofType(Operator).where(t=> t.token.isAny([
            TokenTypes.greaterThan, TokenTypes.greaterThanOrEquals,
            TokenTypes.smallerThan, TokenTypes.smallerThanOrEquals,
        ]) || t.token.isAnyKeyword(["lt", "gt", "le", "ge"])).forEach(t=> this.resolveBinary(t));
        //console.log("resolved", this.nodes);
        //        nonassoc	== != <=> eq ne cmp ~~
        this.nodes.ofType(Operator).where(t=>
            t.token.isAny([TokenTypes.equals, TokenTypes.notEquals, TokenTypes.numericCompare, ])
            ||
            t.token.isAnyKeyword(["eq", "ne", "cmp", ]))
            .forEach(t=> this.resolveBinary(t));
        //console.log("resolved", this.nodes);
        //        left	&
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.bitwiseAnd)).forEach(t=> this.resolveBinary(t));
        //        left	| ^
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.bitwiseOr, TokenTypes.bitwiseXor])).forEach(t=> this.resolveBinary(t));
        //        left	&&
        this.nodes.ofType(Operator).where(t=> t.token.is(TokenTypes.and)).forEach(t=> this.resolveBinary(t));
        //        left	|| //
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.or, TokenTypes.divDiv])).forEach(t=> this.resolveBinary(t));
        //    nonassoc	..  ... //TODO: ...
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.range, TokenTypes.range3])).forEach(t=> this.resolveBinary(t));
        //    right	?:
        this.nodes.reversed().ofType(Operator).where(t=> t.token.is(TokenTypes.question)).forEach(t=> this.resolveTrinaryExpression(t));
        //    right	= += -= *= etc. goto last next redo dump
        this.nodes.reversed().ofType(Operator).where(t=> t.token.isAny([
            TokenTypes.assignment,
            TokenTypes.addAssign,
            TokenTypes.subtractAssign,
            TokenTypes.multiplyAssign,
            TokenTypes.divideAssign,

            TokenTypes.orAssign,
            TokenTypes.xorAssign,
            TokenTypes.divDivAssign,
            TokenTypes.concatAssign,
        ])).forEach(t=> this.resolveBinary(t));
        //    left	, =>
        this.nodes.ofType(Operator).where(t=> t.token.isAny([TokenTypes.comma, TokenTypes.fatComma])).forEach(t=> this.resolveComma(t));
        //    nonassoc	list operators (rightward)
        //    right	not
        this.nodes.reversed().ofType(Operator).where(t=> t.token.isAnyKeyword(["not"])).forEach(t=> this.resolvePrefixUnary(t));
        //    left	and
        this.nodes.ofType(Operator).where(t=> t.token.isKeyword("and")).forEach(t=> this.resolveBinary(t));
        //    left	or xor
        this.nodes.ofType(Operator).where(t=> t.value == "or").forEach(t=> this.resolveBinary(t));


        //console.log("resolved", this.nodes);
        if (this.nodes.length > 1) {
            if (allowNonParenthesizedNoCommaList && this.nodes.where(t=> t instanceof Expression || t instanceof Block).length == this.nodes.length) {
                //if (this.nodes.length > 2)
                //    throw new Error();
                //if (this.nodes.length == 2 && !(this.nodes[0] instanceof Block) && !(this.nodes[0] instanceof HashRefCreationExpression)) //if the latter, convert to block
                //    throw new Error();
                let node = new NonParenthesizedList();
                node.items = <Expression[]>this.nodes.select(t=> t instanceof Block ? this.toBlockExpression(t) : t);
                node.itemsSeparators = [];
                //node.resolvedFrom = this.mbe;
                return node;
            }
            this.logger.warn(["mbe not completely resolved", this.mbe.toCode(), this.mbe, this.nodes]);
            return this.mbe;

        }
        let resolved = <Expression>this.nodes[0];
        //resolved.resolvedFrom = this.mbe;
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
                throw new Error("resolveComma");
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
            throw new Error("resolveComma");
    }

    resolveInvocation(node: ParenthesizedList): Expression {
        let index = this.nodes.indexOf(node);
        if (index <= 0)
            return node;
        let left = this.nodes[index - 1];
        if (left instanceof Expression) { //NamedMemberExpression) {
            let node2 = new InvocationExpression();
            node2.target = left;
            node2.arguments = node;
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = node2;
            return node2;
        }
        return node;
    }

    getRootMember(node: MemberExpression): MemberExpression {
        let target = node.target;
        if (target instanceof MemberExpression)
            return this.getRootMember(target);
        return node;
    }
    toMemberExpression(node: AstNode): MemberExpression {
        if (node instanceof Expression) {
            if (node instanceof MemberExpression) {
                return node;
            }
            else if (node instanceof ArrayRefDeclaration) {
                let node2 = new ArrayMemberAccessExpression();
                node2.member = node;
                return node2;
            }
            else if (node instanceof HashRefCreationExpression) {
                let node2 = new HashMemberAccessExpression();
                node2.member = node;
                return node2;
            }
            else if (node instanceof ParenthesizedList) {
                let node2 = new InvocationExpression();
                node2.arguments = node;
                return node2;
            }
        }
        return null;
    }
    toMemberExpressionOrExpression(node: AstNode): Expression {
        if (node instanceof Expression) {
            if (node instanceof MemberExpression) {
                return node;
            }
            else if (node instanceof ArrayRefDeclaration) {
                let node2 = new ArrayMemberAccessExpression();
                node2.member = node;
                return node2;
            }
            else if (node instanceof HashRefCreationExpression) {
                let node2 = new HashMemberAccessExpression();
                node2.member = node;
                return node2;
            }
            else if (node instanceof ParenthesizedList) {
                return this.resolveInvocation(node);
            }
        }
        return null;
    }

    resolveArrow(op: Operator) {
        let index = this.nodes.indexOf(op);
        let left = this.nodes[index - 1];
        let right = this.toMemberExpression(this.nodes[index + 1]);
        if (right == null)
            throw new Error("resolveArrow");
        if (left instanceof Expression) {
            let rootMember = this.getRootMember(right);
            if (rootMember.target != null)
                throw new Error("resolveArrow");
            rootMember.target = left;
            rootMember.arrow = op.token.is(TokenTypes.arrow);
            rootMember.memberSeparatorToken = op.token; //TODO:.arrowOperator = op;
            this.nodes.removeAt(index - 1);
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = right;
            return right;
        }
        else {
            throw new Error("resolveArrow");
        }
    }

    isBareword(node: Expression) {
        return node instanceof NamedMemberExpression && node.token.is(TokenTypes.identifier);
    }
    resolveHashMemberAccess(node: HashRefCreationExpression): Expression {
        let index = this.nodes.indexOf(node);
        if (index < 0)
            return null;
        let left = this.nodes[index - 1];
        if (left == null)
            return node;
        //if (left == null || !(left instanceof Expression) || this.isBareword(left)){
        if (left instanceof Expression) {// || (left instanceof Operator && left.token.is(TokenTypes.arrow)))) {
            if (left instanceof NamedMemberExpression && left.token.is(TokenTypes.identifier))  //ggg {hello}
                return node;
            let node2 = new HashMemberAccessExpression();
            node2.member = node;
            node2.target = this.toMemberExpressionOrExpression(left);
            this.nodes.removeAt(index - 1);
            this.nodes[index - 1] = node2;
            return node2;
        }
        return node;
    }

    resolveCodeRefOrDeref(node: HashRefCreationExpression): Expression {
        let index = this.nodes.indexOf(node);
        let left = this.nodes[index - 1];
        if (left instanceof Operator && left.token.isAny([TokenTypes.multiply, TokenTypes.sigil])) {
            return this.resolvePrefixUnary(left);
        }
        return node;
    }
    resolveArrayMemberAccess(node: ArrayRefDeclaration): Expression {
        let index = this.nodes.indexOf(node);
        let left = this.nodes[index - 1];
        if (left != null && (left instanceof Expression || (left instanceof Operator && left.token.is(TokenTypes.arrow)))) {
            let node2 = new ArrayMemberAccessExpression();
            node2.member = node;
            if (left instanceof Expression) {
                node2.target = this.toMemberExpressionOrExpression(left);
                this.nodes.removeAt(index - 1);
                this.nodes[index - 1] = node2;
            }
            else
                this.nodes[index] = node2;
            return node2;
        }
        return node;
    }

    resolveTrinaryExpression(op: Operator): TrinaryExpression {
        if (this.nodes.length < 5)
            throw new Error("resolveTrinaryExpression");
        let index = this.nodes.indexOf(op);
        let node = new TrinaryExpression();
        node.condition = <Expression>this.nodes[index - 1];
        node.questionOperator = op;
        node.trueExpression = <Expression>this.nodes[index + 1];
        node.colonOperator = <Operator>this.nodes[index + 2];
        node.falseExpression = <Expression>this.nodes[index + 3];
        //console.log("before", this.nodes.length);
        this.nodes.splice(index - 1, 5, node);
        //console.log("after", this.nodes.length);
        return node;
    }

    toBlockExpression(block: Block): BlockExpression {
        let node = new BlockExpression();
        node.block = block;
        return node;
    }
    isBinaryOperator(op: Operator): boolean {
        return op.token.isAny(TokenTypes.binaryOperators) || op.token.isAnyKeyword(["and", "or", "eq", "ne", "cmp", "ge", "le", "gt", "lt"]);
    }

    //isUnaryOperator(op: Operator): boolean {
    //    //if(op.value
    //}
    // a b c =>a(b,c)
    resolveImplicitInvocation(target: NamedMemberExpression, allowCommas: boolean): Expression {
        let index = this.nodes.indexOf(target);
        if (index == -1)
            return null;

        //TODO: this causes issues
        //let left = this.nodes[index - 1];
        //if (left != null && left instanceof Operator && left.token.isAny([TokenTypes.arrow, TokenTypes.packageSeparator]))
        //    return target;
        let right = this.nodes[index + 1];
        let resolvedArgs: Expression = null;
        let i = index;
        if (right == null)
            return target;
        //TODO: this is the alternative that causes issues
        if (right instanceof Operator && right.token.isAny([TokenTypes.arrow, TokenTypes.packageSeparator]))
            return target;
        if (right instanceof Operator && (this.isBinaryOperator(right) || right.token.isAny([TokenTypes.question])))
            return target;
        if (!allowCommas && right instanceof Operator && right.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
            return target;

        let rightCount = 0;
        if (right instanceof ParenthesizedList) {
            resolvedArgs = right;
            rightCount++;
        }
        else {
            let args = new UnresolvedExpression();
            args.nodes = this.takeAsLongAs(i + 1, arg=> {
                if (!allowCommas && arg instanceof Operator && arg.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                    return false;
                if (arg instanceof Operator && arg.token.isAny([TokenTypes.colon, TokenTypes.question]))
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

        let node2 = new InvocationExpression();
        node2.target = target;
        node2.arguments = resolvedArgs;
        this.nodes.splice(index, rightCount + 1, node2);
        return node2;
    }

    takeAsLongAs(from: number, until: (node: AstNode) => boolean): AstNode[] {
        let list = [];
        for (let item of this.nodes.skip(from)) {
            if (!until(item))
                break;
            list.push(item);
        }
        return list;
    }
    takeAsLongAsInclusive(from: number, until: (node: AstNode) => boolean): AstNode[] {
        let list = [];
        for (let item of this.nodes.skip(from)) {
            list.push(item);
            if (!until(item))
                break;
        }
        return list;
    }


    resolveNamedUnaryOperator(node: NamedMemberExpression): Expression {
        //return this.resolveImplicitInvocation(node, false);
        let index = this.nodes.indexOf(node);
        if (index == -1)
            return null;
        let nextNode = this.nodes[index + 1];

        if (nextNode instanceof Expression) {
            let node2 = new InvocationExpression();
            node2.target = node;
            node2.arguments = nextNode;
            this.nodes.removeAt(index);
            this.nodes[index] = node2;
            return node2;
        }
        else if (nextNode instanceof Block) { //TODO: check next param without comma
            let node2 = new InvocationExpression();
            node2.target = node;
            node2.arguments = this.toBlockExpression(nextNode);
            this.nodes.removeAt(index);
            this.nodes[index] = node2;
            return node2;
        }
        return node;
    }
    isWhitespaceOperator(op: Operator) {
        return op.token.is(TokenTypes.whitespace);
    }
    isNamedUnaryOperator(node: NamedMemberExpression): boolean {
        return TokenTypes.namedUnaryOperators.contains(node.name);
    }

    getAs<T extends Expression | Operator>(type: Type<T>, index: number): T {
        let node = this.nodes[index];
        if (node instanceof type)
            return <T>node;
        return null;
    }


    resolveBinary(op: Operator): Expression | Operator {
        let node = new BinaryExpression();
        let index = this.nodes.indexOf(op);
        if (index < 0)
            return null;
        let left = this.nodes[index - 1];
        let right = this.nodes[index + 1];
        if (left instanceof Block)
            left = this.toBlockExpression(<Block>left);
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
    }
    resolveAutoIncDec(op: Operator) {
        let index = this.nodes.indexOf(op);
        let left = this.nodes[index - 1];
        if (left instanceof Expression)
            return this.resolvePostfixUnary(op);
        let right = this.nodes[index + 1];
        if (right instanceof Expression)
            return this.resolvePrefixUnary(op);
        throw new Error("resolveAutoIncDec");
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

    resolveSigilPrefixUnary(op: Operator) {
        let node = new PrefixUnaryExpression();
        let index = this.nodes.indexOf(op);
        let left = this.nodes[index - 1];
        if (left instanceof Expression)
            return null;//op;
        let right = [this.nodes[index + 1]];
        if (right[0] instanceof NamedMemberExpression && this.isNamedUnaryOperator(<NamedMemberExpression>right[0]))
            right.add(this.nodes[index + 2]);
        let right2 = this.resolve3(right);
        node.operator = op;
        node.expression = right2;
        this.nodes.removeRange(right);
        this.nodes[index] = node;
        return node;
    }

    resolvePrefixUnary(op: Operator) {
        let node = new PrefixUnaryExpression();
        let index = this.nodes.indexOf(op);
        //let right = this.nodes[index + 1];
        let left = this.nodes[index - 1];
        if (left instanceof Expression && op.token.isAny([TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply])) {
            return null;//op;
        }
        let right = [this.nodes[index + 1]];
        if (right[0] instanceof NamedMemberExpression && this.isNamedUnaryOperator(<NamedMemberExpression>right[0]))
            right.add(this.nodes[index + 2]);
        let right2 = this.resolve3(right);
        node.operator = op;
        node.expression = right2;
        this.nodes.removeRange(right);
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

}

