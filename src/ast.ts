"use strict";

class AstNode {
    token: Token;
    tokens: Token[] = [];
    getChildNodes(): AstNode[] {
        let list: AstNode[] = [];
        Object.keys(this).forEach(key=> {
            let value = this[key];
            if(value==null)
                return;
            if(value instanceof AstNode)
                list.add(value);
            else if(value instanceof Array)
                list.addRange(value.where(t=> t instanceof AstNode));
        });
        return list;
    }
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

class RegexExpression extends Expression {
    value: string;
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
    arrow: boolean;
}

class HashMemberAccessExpression extends Expression {
    name: string;
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

class ReturnStatement extends Statement {
    value: any;
    expression: Expression;
}
class EndStatement extends Statement {
}
class IfStatement extends Statement {
    value: any;
    expression: Expression;
    statements: Statement[];
    else: Statement;
}

class ElsifStatement extends IfStatement {
}
class ElseStatement extends Statement {
    statements: Statement[];
}



class BinaryExpression extends Expression {
    left: Expression;
    operator: Operator;
    right: Expression;
}

class Operator {
    value: string;

}

class HashRefCreationExpression extends Expression {
    items: Expression[];
}