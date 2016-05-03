import {TokenTypes} from "./token-types";
import {
AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
HasArrow, HasLabel,
} from "./ast";


class PrecedenceResolver2 {
    constructor(public mbe: UnresolvedExpression) {
        this.nodes = mbe.nodes.toArray();
        this.index = 0;
    }
    nodes: AstNode[];
    index: number;
    resolve(): Expression {
        return this.parse_expression();
    }


    isRightAssociativeOperator(op: Operator) {
        return false;
        //return op.token.isAny([
        //    TokenTypes.assignment,
        //    TokenTypes.addAssign,
        //    TokenTypes.subtractAssign,
        //    TokenTypes.multiplyAssign,
        //    TokenTypes.divideAssign,

        //    TokenTypes.orAssign,
        //    TokenTypes.divDivAssign,
        //    TokenTypes.concatAssign,
        //]);
    }

    isBinaryOperator(op: Operator): boolean {
        return op.token.isAny(TokenTypes.binaryOperators) || op.token.isAnyKeyword(["and", "or", "eq", "ne", "cmp", ]);
    }
    isUnaryOperator(op: Operator): boolean {
        return op.token.isAny(TokenTypes.unaryOperators) || op.token.isAnyKeyword(["not", ]);
    }
    isNamedUnaryOperator(node: NamedMemberExpression): boolean {
        return TokenTypes.namedUnaryOperators.contains(node.name);
    }

    peekNextToken(): AstNode {
        this.nextToken();
        return this.getNode();
    }
    nextToken() {
        this.index++;
    }
    getPrecedence(op: Operator): number {
        if (op.token.isAny([TokenTypes.arrow]))
            return -2;
        if (op.token.isAny([TokenTypes.not]))
            return -5;
        if (op.token.isAny([TokenTypes.assignment]))
            return -19;
        return 0;
    }
    applyBinaryOp(lhs: Expression, op: Operator, rhs: Expression): Expression {
        let node = new BinaryExpression();
        node.left = lhs;
        node.operator = op;
        node.right = rhs;
        return node;
    }

    getNode(): AstNode {
        return this.nodes[this.index];
    }
    parse_primary(): Expression {
        let node = this.getNode();
        if (node instanceof Operator && this.isUnaryOperator(node)) {
            let op = node;
            let node2 = new PrefixUnaryExpression();
            node2.operator = op;
            this.nextToken();
            node2.expression = this.parse_primary();
            return node2;
        }
        if (node instanceof NamedMemberExpression && this.isNamedUnaryOperator(node)) {
            let op = node;
            let node2 = new InvocationExpression();
            node2.target = node;
            //this.nextToken();
            //let right = this.getNode();
            //if (right instanceof Operator && right.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
            //    return node2;
            //node2.arguments = this.parse_expression_1(node2, -10);
            return node2;
        }
        if (node instanceof Expression)
            return node;
        throw new Error();
    }
    parse_expression(): Expression {
        let node = this.parse_expression_1(this.parse_primary(), -100);
        return node;
    }
    parse_expression_1(lhs: Expression, min_precedence: number): Expression {
        let lookahead = this.peekNextToken();
        while (lookahead instanceof Operator && this.isBinaryOperator(lookahead) && this.getPrecedence(lookahead) >= min_precedence) {
            let op = <Operator>lookahead;
            this.nextToken();
            let rhs = this.parse_primary()
            lookahead = this.peekNextToken();
            //lookahead is a binary operator whose precedence is greater than op's, or a right-associative operator whose precedence is equal to op's
            while (this.shouldLookMoreAhead(op, lookahead)) {
                rhs = this.parse_expression_1(rhs, this.getPrecedence(<Operator>lookahead))
                lookahead = this.peekNextToken();
            }
            lhs = this.applyBinaryOp(lhs, op, rhs);// the result of applying op with operands lhs and rhs
        }
        return lhs
    }

    shouldLookMoreAhead(op: Operator, lookahead: AstNode) {
        if (lookahead instanceof Operator) {
            if (this.isBinaryOperator(lookahead) && this.getPrecedence(lookahead) > this.getPrecedence(op))
                return true;
            if (this.isRightAssociativeOperator(op) && this.getPrecedence(op) == this.getPrecedence(lookahead))
                return true;
        }
        return false;

    }

}
