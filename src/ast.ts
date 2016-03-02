"use strict";
class AstNode {
    token: Token;
    tokens: Token[] = [];
    whitespaceBefore: Token[];
    whitespaceAfter: Token[];
}
class Statement extends AstNode {
}


class Expression extends AstNode {

}

class BlockExpression extends Expression {
    braceOpenToken: Token;
    braceOpenTokenPost: Token[];
    statements: Statement[];
    braceCloseToken: Token;
}

class ListDeclaration extends Expression {
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    itemsSeparators: Array<Token[]>;
    items: Expression[];
    parenCloseToken: Token;
}

class HashRefCreationExpression extends Expression {
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    itemsSeparators: Array<Token[]>;
    items: Expression[];
    parenCloseToken: Token;
}


class ArrayRefDeclaration extends Expression {
    items: Expression[];
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
    name: MemberExpression;
}

class VariableDeclarationStatement extends Statement {
    declaration: VariableDeclarationExpression;
    semicolonToken: Token;
}

class SimpleName extends Expression {
    name: string;
}
class VariableDeclarationExpression extends Expression {
    myOurToken:Token;
    myOurTokenPost:Token[];
    variables: Expression;  //my $name, my ($name, $age)
    variablesPost:Token[];
    assignToken:Token;
    assignTokenPost:Token[];
    initializer: Expression;
}

class SubroutineDeclaration extends Statement {
    declaration: SubroutineExpression;
}

class RegexExpression extends Expression {
    value: string;
}



class ExpressionStatement extends Statement {
    expression: Expression;
    expressionPost: Token[];
    semicolonToken: Token;

}
class UseStatement extends Statement {
    useToken: Token;
    useTokenPost: Token[];
    modulePostTokens: Token[];
    semicolonToken: Token;
    semicolonTokenPost: Token[];

    module: Expression;
    list: Expression;
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
    memberSeparatorToken: Token;
}

class ArrayMemberAccessExpression extends Expression implements HasArrow {
    expression: Expression;
    target: Expression;
    arrow: boolean;
    memberSeparatorToken: Token;
}

class InvocationExpression extends Expression implements HasArrow {
    target: Expression;
    targetPost:Token[];
    arguments: ListDeclaration;
    arrow: boolean;
    arrowToken:Token;
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
}
class IfStatement extends Statement {
    value: any;
    expression: Expression;
    statements: Statement[];
    else: Statement;
}
class UnlessStatement extends IfStatement {
}

class ElsifStatement extends IfStatement {
}
class ElseStatement extends Statement {
    statements: Statement[];
}

class PrefixUnaryExpression extends Expression {
    operator: Operator;
    expression: Expression;
}
class PostfixUnaryExpression extends Expression {
    expression: Expression;
    operator: Operator;
}

class ReturnExpression extends Expression {
    expression: Expression;
}

class BinaryExpression extends Expression {
    left: Expression;
    operator: Operator;
    right: Expression;
}

class TrinaryExpression extends Expression {
    condition: Expression;
    trueExpression: Expression;
    falseExpression: Expression;
}

class MultiBinaryExpression extends Expression {
    expressions: Expression[];
    operators: Operator[];
}

class Operator {
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
    block: BlockExpression;
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
    block: BlockExpression;
    semicolonToken: Token;
}
class WhileStatement extends Statement {
    condition: Expression;
    statements: Statement[];
}
class BeginStatement extends Statement {
    beginToken: Token;
    beginTokenPost: Token[];
    block: BlockExpression;
    semicolonToken: Token;
}

interface HasLabel {
    label: SimpleName;
}
interface HasArrow {
    arrow: boolean;
}


interface HasSemicolonToken {
    semicolonTokenPre: Token[];
    semicolonToken: Token;
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
    block: BlockExpression;
}


