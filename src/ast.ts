"use strict";

class AstNode {
    token: Token;
}
class Statement extends AstNode {

}

class Expression extends AstNode {

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
    name: SimpleName;
    statements: Statement[];
}





class ExpressionStatement extends Statement {
    expression: Expression;
}
class UseStatement extends Statement {
    packageName: MemberExpression;
}

class MemberExpression extends Expression {
    name: string;
    prev: Expression;
    arrow:boolean;
}

class InvocationExpression extends Expression {
    target: Expression;
    arguments: Expression[];
}

class QwExpression extends Expression {
    items: ValueExpression[];
}
class ValueExpression extends Expression {
    value: any;
}

class ReturnStatement extends Statement {
    value: any;
    expression: Expression;
}
