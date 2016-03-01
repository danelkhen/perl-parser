"use strict";

class AstNode {
    token: Token;
    tokens: Token[] = [];
}
class Statement extends AstNode {

}


class Expression extends AstNode {

}

class BlockExpression extends Expression {
    statements: Statement[];
}

class ListDeclaration extends Expression {
    items: Expression[];
}
class ArrayRefDeclaration extends Expression {
    items: Expression[];
}
class Unit extends AstNode {
    statements: Statement[];
}

class PackageDeclaration extends Statement {
    statements: Statement[];
    name: MemberExpression;
}

class VariableDeclarationStatement extends Statement {
    declaration: VariableDeclarationExpression;
}

class SimpleName extends Expression {
    name: string;
}
class VariableDeclarationExpression extends Expression {
    variables: Expression;  //my $name, my ($name, $age)
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
}
class UseStatement extends Statement {
    module: Expression;
    list: Expression;
}

class MemberExpression extends Expression {
    name: string;
    prev: Expression;
    arrow: boolean;
}

class HashMemberAccessExpression extends Expression {
    member: Expression;
    target: Expression;
    arrow: boolean;
}

class ArrayMemberAccessExpression extends Expression {
    expression: Expression;
    target: Expression;
    arrow: boolean;
}

class InvocationExpression extends Expression {
    target: Expression;
    arguments: Expression[];
}

class BarewordExpression extends Expression {
    value: string;
}

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
    toString() { return this.value +" {Operator}"; }
}

class HashRefCreationExpression extends Expression {
    items: Expression[];
}
/*  LABEL foreach (EXPR; EXPR; EXPR) BLOCK
    LABEL foreach VAR (LIST) BLOCK
    LABEL foreach VAR (LIST) BLOCK continue BLOCK
*/
class ForEachStatement extends Statement {
    label: SimpleName;
    
    variable: Expression;
    list: Expression;
    statements: Statement[];
}
class ForStatement extends Statement {
    initializer: Expression;
    condition: Expression;
    iterator: Expression;
    statements: Statement[];
}
class WhileStatement extends Statement {
    condition: Expression;
    statements: Statement[];
}
class BeginBlock extends Statement {
    statements: Statement[];
}

interface HasLabel {
    label: SimpleName;
}
interface HasArrow {
    arrow: boolean;
}

class SubroutineExpression extends Expression {
    statements: Statement[];
    prototype:Expression;
    
    name: SimpleName;
    attribute: SimpleName;
}


