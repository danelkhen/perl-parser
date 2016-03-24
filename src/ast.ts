"use strict";

import {Token} from "./token";
import {AstWriter} from "./ast-writer";


export class AstNode {

    parentNode: AstNode;
    parentNodeProp: string;

    token: Token;
    tokens: Token[] = [];
    whitespaceBefore: Token[];
    whitespaceAfter: Token[];

    toCode(opts?: { addParentheses?: boolean }) {
        let writer = new AstWriter();
        writer.addParentheses = opts != null && opts.addParentheses;
        writer.main();
        writer.write(this);
        return writer.sb.join("");
    }
}
export class Statement extends AstNode {
    isStatement = true;
}

export class EmptyStatement extends Statement {
    semicolonToken: Token;
}

export class Expression extends AstNode {
    isExpression = true;
    resolvedFrom: UnresolvedExpression;
}

export class Block extends AstNode {
    braceOpenToken: Token;
    braceOpenTokenPost: Token[];
    statements: Statement[];
    braceCloseToken: Token;
}

//export class ParenthesizedExpression extends Expression {
//    parenOpenToken: Token;
//    parenOpenTokenPost: Token[];
//    expression: Expression;
//    parenCloseToken: Token;
//}


export class ParenthesizedList extends Expression {
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    list: NonParenthesizedList;
    parenCloseToken: Token;
}

export class NonParenthesizedList extends Expression {
    itemsSeparators: Operator[];
    items: Expression[];
}

export class HashRefCreationExpression extends Expression {
    braceOpenToken: Token;
    braceOpenTokenPost: Token[];
    list: NonParenthesizedList;
    braceCloseToken: Token;
}


export class ArrayRefDeclaration extends Expression {
    bracketOpenToken: Token;
    bracketOpenTokenPost: Token[];
    items: Expression[];
    itemsSeparators: Operator[];
    bracketCloseToken: Token;
}
export class Unit extends AstNode {
    statements: Statement[];
}

export class PackageDeclaration extends Statement {
    packageToken: Token;
    packageTokenPost: Token[];
    semicolonToken: Token;
    semicolonTokenPost: Token[];
    statements: Statement[];
    name: Expression;//TODO:MemberExpression;
}

export class VariableDeclarationStatement extends Statement {
    declaration: VariableDeclarationExpression;
    semicolonToken: Token;
}

export class SimpleName extends Expression {
    name: string;
}
export class VariableDeclarationExpression extends Expression {
    myOurToken: Token;
    myOurTokenPost: Token[];
    variables: Expression;  //my $name, my ($name, $age)
    variablesPost: Token[];
    assignToken: Token;
    assignTokenPost: Token[];
    initializer: Expression;
}

export class SubroutineDeclaration extends Statement {
    declaration: SubroutineExpression;
    semicolonToken: Token;
}

export class RegexExpression extends Expression {
    value: string;
}

export class BlockStatement extends Statement {
    block: Block;
    blockPost: Token[];
    semicolonToken: Token;
}


export class ExpressionStatement extends Statement {
    expression: Expression;
    expressionPost: Token[];
    semicolonToken: Token;

}

export class UseOrNoStatement extends Statement {
    useToken: Token;
    useTokenPost: Token[];
    modulePostTokens: Token[];
    semicolonToken: Token;
    semicolonTokenPost: Token[];

    module: Expression;
    list: Expression;
}

export class UseStatement extends UseOrNoStatement {
}
export class NoStatement extends UseOrNoStatement {
}

export class MemberExpression extends Expression {
    target: Expression;
    arrow: boolean;
    //TODO: arrowOperator:Operator;
    memberSeparatorToken: Token;
}
export class NamedMemberExpression extends MemberExpression implements HasArrow {
    name: string;
}

export class HashMemberAccessExpression extends MemberExpression implements HasArrow {
    member: HashRefCreationExpression;
}

export class ArrayMemberAccessExpression extends MemberExpression implements HasArrow {
    member: ArrayRefDeclaration;
}

export class InvocationExpression extends MemberExpression implements HasArrow {
    target: Expression;
    targetPost: Token[];
    memberSeparatorToken: Token;
    //firstParamBlock: Block;
    arguments: Expression;
    arrow: boolean;
    //arrowToken: Token;
}

export class BlockExpression extends Expression {
    block: Block;
}
export class BarewordExpression extends Expression {
    value: string;
}

//export class DerefMemberExpression extends Expression {

//}

export class QwExpression extends Expression {
    items: ValueExpression[];
}
export class ValueExpression extends Expression {
    value: any;
}

//export class ReturnStatement extends Statement {
//    value: any;
//    expression: Expression;
//}
export class EndStatement extends Statement {
    endToken: Token;
}

export class IfStatement extends Statement {
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
export class UnlessStatement extends IfStatement {
}

export class ElsifStatement extends IfStatement {
}
export class ElseStatement extends Statement {
    keywordToken: Token;
    keywordTokenPost: Token[];
    block: Block;
    semicolonToken: Token;
}

export class PrefixUnaryExpression extends Expression {
    operator: Operator;
    operatorPost: Token[];
    expression: Expression;
}
export class PostfixUnaryExpression extends Expression {
    expression: Expression;
    operator: Operator;
    operatorPost: Token[];
}

export class ReturnExpression extends Expression {
    returnToken: Token;
    returnTokenPost: Token[];
    expression: Expression;
}

export class BinaryExpression extends Expression {
    left: Expression;
    operator: Operator;
    right: Expression;
}

export class TrinaryExpression extends Expression {
    condition: Expression;
    questionOperator: Operator;
    trueExpression: Expression;
    trueExpressionPost: Token[];
    colonOperator: Operator;
    falseExpression: Expression;
}

export class UnresolvedExpression extends Expression {
    nodes: AstNode[];//Expression | Operator | Block
}

export class Operator extends AstNode {
    token: Token;
    value: string;
    toString() { return this.value + " {Operator}"; }
}

/*  LABEL foreach (EXPR; EXPR; EXPR) BLOCK
    LABEL foreach VAR (LIST) BLOCK
    LABEL foreach VAR (LIST) BLOCK continue BLOCK
*/
export class ForEachStatement extends Statement {
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
export class ForStatement extends Statement {
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
export class WhileStatement extends Statement {
    keywordToken: Token;
    keywordTokenPost: Token[];
    parenCloseToken: Token;
    parenCloseTokenPost: Token[];
    parenOpenToken: Token;
    parenOpenTokenPost: Token[];
    condition: Expression;
    //statements: Statement[];
    block: Block
    semicolonToken: Token;
}
export class BeginStatement extends Statement {
    beginToken: Token;
    beginTokenPost: Token[];
    block: Block;
    semicolonToken: Token;
}

export interface HasLabel {
    label: SimpleName;
}
export interface HasArrow {
    arrow: boolean;
}

export class RawStatement extends Statement {
    code: string;
}

export class RawExpression extends Expression {
    code: string;
}
export class SubroutineExpression extends Expression {
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

export class NativeFunctionInvocation extends Expression {
}

/// map BLOCK LIST
/// map EXPR,LIST
export class NativeInvocation_BlockAndListOrExprCommaList extends NativeFunctionInvocation {
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
export class NativeInvocation_BlockOrExpr extends NativeFunctionInvocation {
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
    //export class TERM {
    //}

    //export class BracedExpression extends Expression {

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
