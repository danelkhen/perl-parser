"use strict";
class AstNode {

    parentNode: AstNode;
    parentNodeProp: string;

    token: Token;
    tokens: Token[] = [];
    whitespaceBefore: Token[];
    whitespaceAfter: Token[];
}
class Statement extends AstNode {
    isStatement = true;
}

class EmptyStatement extends Statement {
    semicolonToken: Token;
}

class Expression extends AstNode {
    isExpression = true;
}

class Block extends AstNode {
    braceOpenToken: Token;
    braceOpenTokenPost: Token[];
    statements: Statement[];
    braceCloseToken: Token;
}

class ParenthesizedExpression extends Expression {
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    expression: Expression;
    parenCloseToken: Token;
}

class ParenthesizedList extends Expression {
    public ParenthesizedList() {
        this.list = new NonParenthesizedList();
    }
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    list: NonParenthesizedList;
    get itemsSeparators(): Array<Token[]> { return this.list.itemsSeparators; }
    get items(): Expression[] { return this.list.items; }
    parenCloseToken: Token;
}

class NonParenthesizedList extends Expression {
    itemsSeparators: Array<Token[]>;
    items: Expression[];
}

class HashRefCreationExpression extends Expression {
    braceOpenToken: Token;
    braceOpenTokenPost: Token[];
    itemsSeparators: Array<Token[]>;
    items: Expression[];
    braceCloseToken: Token;
}


class ArrayRefDeclaration extends Expression {
    bracketOpenToken: Token;
    bracketOpenTokenPost: Token[];
    items: Expression[];
    itemsSeparators: Array<Token[]>;
    bracketCloseToken: Token;
}
class Unit extends AstNode {
    statements: Statement[];
}

class PackageDeclaration extends Statement {
    packageToken: Token;
    packageTokenPost: Token[];
    semicolonToken: Token;
    semicolonTokenPost: Token[];
    statements: Statement[];
    name: Expression;//TODO:MemberExpression;
}

class VariableDeclarationStatement extends Statement {
    declaration: VariableDeclarationExpression;
    semicolonToken: Token;
}

class SimpleName extends Expression {
    name: string;
}
class VariableDeclarationExpression extends Expression {
    myOurToken: Token;
    myOurTokenPost: Token[];
    variables: Expression;  //my $name, my ($name, $age)
    variablesPost: Token[];
    assignToken: Token;
    assignTokenPost: Token[];
    initializer: Expression;
}

class SubroutineDeclaration extends Statement {
    declaration: SubroutineExpression;
    semicolonToken: Token;
}

class RegexExpression extends Expression {
    value: string;
}



class ExpressionStatement extends Statement {
    expression: Expression;
    expressionPost: Token[];
    semicolonToken: Token;

}

class UseOrNoStatement extends Statement {
    useToken: Token;
    useTokenPost: Token[];
    modulePostTokens: Token[];
    semicolonToken: Token;
    semicolonTokenPost: Token[];

    module: Expression;
    list: Expression;
}

class UseStatement extends UseOrNoStatement {
}
class NoStatement extends UseOrNoStatement {
}

class MemberExpression extends Expression implements HasArrow {
    name: string;
    target: Expression;
    arrow: boolean;
    memberSeparatorToken: Token;
}

class HashMemberAccessExpression extends Expression implements HasArrow {
    member: Expression;
    target: Expression;
    arrow: boolean;
    /// '->'or '::' */
    memberSeparatorToken: Token;
    braceOpenToken: Token;
    braceOpenTokenPost: Token[];
    braceCloseToken: Token;
}

class ArrayMemberAccessExpression extends Expression implements HasArrow {
    expression: Expression;
    target: Expression;
    arrow: boolean;
    memberSeparatorToken: Token;
    bracketOpenToken: Token;
    bracketOpenTokenPost: Token[];
    bracketCloseToken: Token;
}

class InvocationExpression extends Expression implements HasArrow {
    target: Expression;
    targetPost: Token[];
    memberSeparatorToken: Token;
    arguments: Expression;
    arrow: boolean;
    //arrowToken: Token;
}

class BarewordExpression extends Expression {
    value: string;
}

//class DerefMemberExpression extends Expression {

//}

class QwExpression extends Expression {
    items: ValueExpression[];
}
class ValueExpression extends Expression {
    value: any;
}

//class ReturnStatement extends Statement {
//    value: any;
//    expression: Expression;
//}
class EndStatement extends Statement {
    endToken: Token;
}

class IfStatement extends Statement {
    keywordToken: Token;
    keywordTokenPost: Token[];
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    expression: Expression;
    parenCloseToken: Token;
    parenCloseTokenPost: Token[];
    block: Block;
    blockPost: Token[];
    else: Statement;
    semicolonToken: Token;
}
class UnlessStatement extends IfStatement {
}

class ElsifStatement extends IfStatement {
}
class ElseStatement extends Statement {
    keywordToken: Token;
    keywordTokenPost: Token[];
    block: Block;
    semicolonToken: Token;
}

class PrefixUnaryExpression extends Expression {
    operator: Operator;
    operatorPost: Token[];
    expression: Expression;
}
class PostfixUnaryExpression extends Expression {
    expression: Expression;
    operator: Operator;
    operatorPost: Token[];
}

class ReturnExpression extends Expression {
    returnToken: Token;
    returnTokenPost: Token[];
    expression: Expression;
}

class BinaryExpression extends Expression {
    left: Expression;
    operator: Operator;
    right: Expression;
}

class TrinaryExpression extends Expression {
    condition: Expression;
    questionToken: Token;
    questionTokenPost: Token[];
    colonToken: Token;
    colonTokenPost: Token[];
    trueExpression: Expression;
    trueExpressionPost: Token[];
    falseExpression: Expression;
}

class MultiBinaryExpression extends Expression {
    expressions: Expression[];
    operators: Operator[];
    endsWithAnExpression(): boolean {
        return this.expressions.length > this.operators.length;
    }

}
class FlatExpressionsAndOperators extends Expression {
    nodes: Array<Expression | Operator>;
}

class Operator {
    token: Token;
    value: string;
    toString() { return this.value + " {Operator}"; }
}

/*  LABEL foreach (EXPR; EXPR; EXPR) BLOCK
    LABEL foreach VAR (LIST) BLOCK
    LABEL foreach VAR (LIST) BLOCK continue BLOCK
*/
class ForEachStatement extends Statement {
    label: SimpleName;
    forEachToken: Token;
    forEachTokenPost: Token[];
    listPost: Token[];
    variablePost: Token[];
    variable: Expression;
    list: Expression;
    block: Block;
    semicolonToken: Token;
}
class ForStatement extends Statement {
    forToken: Token;
    forTokenPost: Token[];
    parenCloseToken: Token;
    parenCloseTokenPost: Token[];
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    semicolon1Token: Token;
    semicolon2Token: Token;
    semicolon1TokenPost: Token[];
    semicolon2TokenPost: Token[];
    initializer: Expression;
    condition: Expression;
    iterator: Expression;
    //statements: Statement[];
    block: Block;
    semicolonToken: Token;
}
class WhileStatement extends Statement {
    condition: Expression;
    statements: Statement[];
}
class BeginStatement extends Statement {
    beginToken: Token;
    beginTokenPost: Token[];
    block: Block;
    semicolonToken: Token;
}

interface HasLabel {
    label: SimpleName;
}
interface HasArrow {
    arrow: boolean;
}



class SubroutineExpression extends Expression {
    subToken: Token;
    subTokenPost: Token[];
    namePost: Token[];
    colonToken: Token;
    colonTokenPost: Token[];
    attributePost: Token[];
    prototypePost: Token[];
    prototype: Expression;

    name: SimpleName;
    attribute: SimpleName;
    
    //statements: Statement[];
    block: Block;
}

class NativeFunctionInvocation extends Expression {
}

/// map BLOCK LIST
/// map EXPR,LIST
class NativeInvocation_BlockAndListOrExprCommaList extends NativeFunctionInvocation {
    keywordToken: Token;
    keywordTokenPost: Token[];

    block: Block;
    blockPost: Token[];

    expr: Expression;
    exprPost: Token[];
    commaToken: Token;
    commaTokenPost: Token[];
    list: Expression;
}

/// eval BLOCK
/// eval EXPR
class NativeInvocation_BlockOrExpr extends NativeFunctionInvocation {
    keywordToken: Token;
    keywordTokenPost: Token[];

    block: Block;
    expr: Expression;
}


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
