"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AstNode = (function () {
    function AstNode() {
        this.tokens = [];
    }
    AstNode.prototype.toCode = function () {
        var writer = new AstWriter();
        writer.main();
        writer.write(this);
        return writer.sb.join("");
    };
    return AstNode;
}());
var Statement = (function (_super) {
    __extends(Statement, _super);
    function Statement() {
        _super.apply(this, arguments);
        this.isStatement = true;
    }
    return Statement;
}(AstNode));
var EmptyStatement = (function (_super) {
    __extends(EmptyStatement, _super);
    function EmptyStatement() {
        _super.apply(this, arguments);
    }
    return EmptyStatement;
}(Statement));
var Expression = (function (_super) {
    __extends(Expression, _super);
    function Expression() {
        _super.apply(this, arguments);
        this.isExpression = true;
    }
    return Expression;
}(AstNode));
var Block = (function (_super) {
    __extends(Block, _super);
    function Block() {
        _super.apply(this, arguments);
    }
    return Block;
}(AstNode));
//class ParenthesizedExpression extends Expression {
//    parenOpenToken: Token;
//    parenOpenTokenPost: Token[];
//    expression: Expression;
//    parenCloseToken: Token;
//}
var ParenthesizedList = (function (_super) {
    __extends(ParenthesizedList, _super);
    function ParenthesizedList() {
        _super.apply(this, arguments);
    }
    return ParenthesizedList;
}(Expression));
var NonParenthesizedList = (function (_super) {
    __extends(NonParenthesizedList, _super);
    function NonParenthesizedList() {
        _super.apply(this, arguments);
    }
    return NonParenthesizedList;
}(Expression));
var HashRefCreationExpression = (function (_super) {
    __extends(HashRefCreationExpression, _super);
    function HashRefCreationExpression() {
        _super.apply(this, arguments);
    }
    return HashRefCreationExpression;
}(Expression));
var ArrayRefDeclaration = (function (_super) {
    __extends(ArrayRefDeclaration, _super);
    function ArrayRefDeclaration() {
        _super.apply(this, arguments);
    }
    return ArrayRefDeclaration;
}(Expression));
var Unit = (function (_super) {
    __extends(Unit, _super);
    function Unit() {
        _super.apply(this, arguments);
    }
    return Unit;
}(AstNode));
var PackageDeclaration = (function (_super) {
    __extends(PackageDeclaration, _super);
    function PackageDeclaration() {
        _super.apply(this, arguments);
    }
    return PackageDeclaration;
}(Statement));
var VariableDeclarationStatement = (function (_super) {
    __extends(VariableDeclarationStatement, _super);
    function VariableDeclarationStatement() {
        _super.apply(this, arguments);
    }
    return VariableDeclarationStatement;
}(Statement));
var SimpleName = (function (_super) {
    __extends(SimpleName, _super);
    function SimpleName() {
        _super.apply(this, arguments);
    }
    return SimpleName;
}(Expression));
var VariableDeclarationExpression = (function (_super) {
    __extends(VariableDeclarationExpression, _super);
    function VariableDeclarationExpression() {
        _super.apply(this, arguments);
    }
    return VariableDeclarationExpression;
}(Expression));
var SubroutineDeclaration = (function (_super) {
    __extends(SubroutineDeclaration, _super);
    function SubroutineDeclaration() {
        _super.apply(this, arguments);
    }
    return SubroutineDeclaration;
}(Statement));
var RegexExpression = (function (_super) {
    __extends(RegexExpression, _super);
    function RegexExpression() {
        _super.apply(this, arguments);
    }
    return RegexExpression;
}(Expression));
var BlockStatement = (function (_super) {
    __extends(BlockStatement, _super);
    function BlockStatement() {
        _super.apply(this, arguments);
    }
    return BlockStatement;
}(Statement));
var ExpressionStatement = (function (_super) {
    __extends(ExpressionStatement, _super);
    function ExpressionStatement() {
        _super.apply(this, arguments);
    }
    return ExpressionStatement;
}(Statement));
var UseOrNoStatement = (function (_super) {
    __extends(UseOrNoStatement, _super);
    function UseOrNoStatement() {
        _super.apply(this, arguments);
    }
    return UseOrNoStatement;
}(Statement));
var UseStatement = (function (_super) {
    __extends(UseStatement, _super);
    function UseStatement() {
        _super.apply(this, arguments);
    }
    return UseStatement;
}(UseOrNoStatement));
var NoStatement = (function (_super) {
    __extends(NoStatement, _super);
    function NoStatement() {
        _super.apply(this, arguments);
    }
    return NoStatement;
}(UseOrNoStatement));
var MemberExpression = (function (_super) {
    __extends(MemberExpression, _super);
    function MemberExpression() {
        _super.apply(this, arguments);
    }
    return MemberExpression;
}(Expression));
var NamedMemberExpression = (function (_super) {
    __extends(NamedMemberExpression, _super);
    function NamedMemberExpression() {
        _super.apply(this, arguments);
    }
    return NamedMemberExpression;
}(MemberExpression));
var HashMemberAccessExpression = (function (_super) {
    __extends(HashMemberAccessExpression, _super);
    function HashMemberAccessExpression() {
        _super.apply(this, arguments);
    }
    return HashMemberAccessExpression;
}(MemberExpression));
var ArrayMemberAccessExpression = (function (_super) {
    __extends(ArrayMemberAccessExpression, _super);
    function ArrayMemberAccessExpression() {
        _super.apply(this, arguments);
    }
    return ArrayMemberAccessExpression;
}(MemberExpression));
var InvocationExpression = (function (_super) {
    __extends(InvocationExpression, _super);
    function InvocationExpression() {
        _super.apply(this, arguments);
    }
    return InvocationExpression;
}(MemberExpression));
var BlockExpression = (function (_super) {
    __extends(BlockExpression, _super);
    function BlockExpression() {
        _super.apply(this, arguments);
    }
    return BlockExpression;
}(Expression));
var BarewordExpression = (function (_super) {
    __extends(BarewordExpression, _super);
    function BarewordExpression() {
        _super.apply(this, arguments);
    }
    return BarewordExpression;
}(Expression));
//class DerefMemberExpression extends Expression {
//}
var QwExpression = (function (_super) {
    __extends(QwExpression, _super);
    function QwExpression() {
        _super.apply(this, arguments);
    }
    return QwExpression;
}(Expression));
var ValueExpression = (function (_super) {
    __extends(ValueExpression, _super);
    function ValueExpression() {
        _super.apply(this, arguments);
    }
    return ValueExpression;
}(Expression));
//class ReturnStatement extends Statement {
//    value: any;
//    expression: Expression;
//}
var EndStatement = (function (_super) {
    __extends(EndStatement, _super);
    function EndStatement() {
        _super.apply(this, arguments);
    }
    return EndStatement;
}(Statement));
var IfStatement = (function (_super) {
    __extends(IfStatement, _super);
    function IfStatement() {
        _super.apply(this, arguments);
    }
    return IfStatement;
}(Statement));
var UnlessStatement = (function (_super) {
    __extends(UnlessStatement, _super);
    function UnlessStatement() {
        _super.apply(this, arguments);
    }
    return UnlessStatement;
}(IfStatement));
var ElsifStatement = (function (_super) {
    __extends(ElsifStatement, _super);
    function ElsifStatement() {
        _super.apply(this, arguments);
    }
    return ElsifStatement;
}(IfStatement));
var ElseStatement = (function (_super) {
    __extends(ElseStatement, _super);
    function ElseStatement() {
        _super.apply(this, arguments);
    }
    return ElseStatement;
}(Statement));
var PrefixUnaryExpression = (function (_super) {
    __extends(PrefixUnaryExpression, _super);
    function PrefixUnaryExpression() {
        _super.apply(this, arguments);
    }
    return PrefixUnaryExpression;
}(Expression));
var PostfixUnaryExpression = (function (_super) {
    __extends(PostfixUnaryExpression, _super);
    function PostfixUnaryExpression() {
        _super.apply(this, arguments);
    }
    return PostfixUnaryExpression;
}(Expression));
var ReturnExpression = (function (_super) {
    __extends(ReturnExpression, _super);
    function ReturnExpression() {
        _super.apply(this, arguments);
    }
    return ReturnExpression;
}(Expression));
var BinaryExpression = (function (_super) {
    __extends(BinaryExpression, _super);
    function BinaryExpression() {
        _super.apply(this, arguments);
    }
    return BinaryExpression;
}(Expression));
var TrinaryExpression = (function (_super) {
    __extends(TrinaryExpression, _super);
    function TrinaryExpression() {
        _super.apply(this, arguments);
    }
    return TrinaryExpression;
}(Expression));
var UnresolvedExpression = (function (_super) {
    __extends(UnresolvedExpression, _super);
    function UnresolvedExpression() {
        _super.apply(this, arguments);
    }
    return UnresolvedExpression;
}(Expression));
var Operator = (function (_super) {
    __extends(Operator, _super);
    function Operator() {
        _super.apply(this, arguments);
    }
    Operator.prototype.toString = function () { return this.value + " {Operator}"; };
    return Operator;
}(AstNode));
/*  LABEL foreach (EXPR; EXPR; EXPR) BLOCK
    LABEL foreach VAR (LIST) BLOCK
    LABEL foreach VAR (LIST) BLOCK continue BLOCK
*/
var ForEachStatement = (function (_super) {
    __extends(ForEachStatement, _super);
    function ForEachStatement() {
        _super.apply(this, arguments);
    }
    return ForEachStatement;
}(Statement));
var ForStatement = (function (_super) {
    __extends(ForStatement, _super);
    function ForStatement() {
        _super.apply(this, arguments);
    }
    return ForStatement;
}(Statement));
var WhileStatement = (function (_super) {
    __extends(WhileStatement, _super);
    function WhileStatement() {
        _super.apply(this, arguments);
    }
    return WhileStatement;
}(Statement));
var BeginStatement = (function (_super) {
    __extends(BeginStatement, _super);
    function BeginStatement() {
        _super.apply(this, arguments);
    }
    return BeginStatement;
}(Statement));
var SubroutineExpression = (function (_super) {
    __extends(SubroutineExpression, _super);
    function SubroutineExpression() {
        _super.apply(this, arguments);
    }
    return SubroutineExpression;
}(Expression));
var NativeFunctionInvocation = (function (_super) {
    __extends(NativeFunctionInvocation, _super);
    function NativeFunctionInvocation() {
        _super.apply(this, arguments);
    }
    return NativeFunctionInvocation;
}(Expression));
/// map BLOCK LIST
/// map EXPR,LIST
var NativeInvocation_BlockAndListOrExprCommaList = (function (_super) {
    __extends(NativeInvocation_BlockAndListOrExprCommaList, _super);
    function NativeInvocation_BlockAndListOrExprCommaList() {
        _super.apply(this, arguments);
    }
    return NativeInvocation_BlockAndListOrExprCommaList;
}(NativeFunctionInvocation));
/// eval BLOCK
/// eval EXPR
var NativeInvocation_BlockOrExpr = (function (_super) {
    __extends(NativeInvocation_BlockOrExpr, _super);
    function NativeInvocation_BlockOrExpr() {
        _super.apply(this, arguments);
    }
    return NativeInvocation_BlockOrExpr;
}(NativeFunctionInvocation));
//A TERM has the highest precedence in Perl. They include:
// variables,  $hello
// quote and quote-like operators,  qq<abc>
// any expression in parentheses,   (7 + 8)
//and any function whose arguments are parenthesized.   $myFunc()
//Actually, there aren't really functions in this sense, just list operators and unary operators behaving as functions because you put parentheses around the arguments. These are all documented in perlfunc.
//If any list operator (print(), etc.) or any unary operator (chdir(), etc.) is followed by a left parenthesis as the next token, the operator and arguments within parentheses are taken to be of highest precedence, just like a normal function call.
//In the absence of parentheses, the precedence of list operators such as print, sort, or chmod is either very high or very low depending on whether you are looking at the left side or the right side of the operator. For example, in
//class TERM {
//}
//class BracedExpression extends Expression {
//    toHashRefCreationExpression(): HashRefCreationExpression {
//        throw new Error();
//    }
//    toHashMemberAccessExpression(): HashMemberAccessExpression{
//        throw new Error();
//    }
//    toBlock(): Block {
//        throw new Error();
//    }
//}
