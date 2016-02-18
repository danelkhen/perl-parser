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
    name: PackageName;
}

class VariableDeclarationStatement extends Statement {
    declaration: VariableDeclarationExpression;
}

class SimpleName extends Expression {
    name: string;
}
class VariableDeclarationExpression extends Expression {
    name: SimpleName;
    initializer: Expression;
}

class SubroutineDeclaration extends Statement {
    name:SimpleName;
    statements: Statement[];
}





class ExpressionStatement extends Statement {
    expression:Expression;
}
class UseStatement extends Statement {
    packageName: PackageName;
}

class PackageName extends AstNode {
    name: string;
}

