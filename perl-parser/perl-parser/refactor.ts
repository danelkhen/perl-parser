"use strict";
import {Token, TokenType} from "./token";
import {AstWriter} from "./ast-writer";
import {ExpressionParser} from "./expression-parser";
import {Parser} from "./parser";
import {PrecedenceResolver} from "./precedence-resolver";
import {TokenTypes} from "./token-types";
import {Tokenizer} from "./tokenizer";
import {TokenReader} from "./utils";
import {
AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
HasArrow, HasLabel,
} from "./ast";



export class Refactor {
    getTokens(node: AstNode): Token[] {
        return node.query().getTokens();
    }
    getChildren(node: AstNode): AstNode[] {
        return node.query().getChildren();
    }
    getDescendants(root: AstNode): AstNode[] {
        return root.query().getDescendants();
    }
    first(node: AstNode, predicate: (node: AstNode) => boolean): AstNode {
        return node.query().first(predicate);
    }
    selectFirstNonNull<R>(node: AstNode, predicate: (node: AstNode) => R): R {
        return node.query().selectFirstNonNull(predicate);
    }
    replaceNode(oldNode: AstNode, newNode: AstNode) {
        oldNode.query().replaceNode(newNode);
    }

}

export class FindEvalsWithout1AtTheEnd extends Refactor {
    process(root: AstNode) {
        let node = <NativeInvocation_BlockOrExpr>this.first(root, t=> t instanceof NativeInvocation_BlockOrExpr && t.keywordToken.value == "eval");
        let lastStatement = node.block.statements.last();
        let valueExp = <ValueExpression>(<ExpressionStatement>lastStatement).expression;
        let endsWithOne = valueExp.token.value == "1";
        console.log("this eval ends with 1; ?", endsWithOne);
        if (endsWithOne)
            return;
        node.block.statements.add(CodeBuilder.value("1").statement());// new ExpressionStatement());
        //this.replaceNode(node, node.block || node.expr);

    }

}




export class RefArrayToRefUtil extends Refactor {
    constructor(public root: AstNode) {
        super();
    }

    addUse(name: string) {
        let node = <PackageDeclaration>this.first(this.root, t=> t instanceof PackageDeclaration);
        if (node == null) {
            console.warn("can't find package declaration");
            return;
        }
        node.statements.insert(0, CodeBuilder.rawStatement("use " + name + ";\n").node);
    }

    identifyRefArray(node: AstNode): { node: Expression, target: Expression, notEq: boolean } {
        if (node instanceof BinaryExpression) {
            if (node.operator.token.isAnyKeyword(["eq", "ne"])) {
                let right = node.right;
                if (right instanceof ValueExpression && ["'ARRAY'", '"ARRAY"'].contains(right.value)) {
                    let left = node.left;
                    if (left instanceof InvocationExpression) {
                        let target = left.target;
                        if (target instanceof NamedMemberExpression) {
                            if (target.name == "ref") {
                                let args = left.arguments;
                                return { node: node, target: args, notEq: node.operator.token.isKeyword("ne") };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    process() {
        var i = 0;
        let count = 0;
        while (i < 1000) {
            let res = this.selectFirstNonNull(this.root, t=> this.identifyRefArray(t));
            //if (res == null) {
            //    res = this.selectFirstNonNull(this.root, t=> this.identifyRefArray2(t));
            //    if (res != null)
            //        console.warn("FOUND A BAD THING");
            //}
            //console.log(res);
            if (res == null)
                break;
            let node = res.node;
            let arg = res.target;
            let newNode = CodeBuilder.member((res.notEq ? "!" : "") + "is_arrayref").invokeSingleArgOrList(arg).node;
            console.log("REPLACING FROM:\n" + res.node.toCode() + "\nTO:\n", newNode.toCode());
            this.replaceNode(res.node, newNode);
            count++;
        }
        if (count > 0)
            this.addUse("Ref::Util");
    }


    //identifyRefArray2(node: AstNode): { node: Expression, target: Expression } {
    //    if (node instanceof InvocationExpression) {
    //        let target = node.target;
    //        if (target instanceof NamedMemberExpression) {
    //            if (target.name == "ref") {
    //                let args = node.arguments;
    //                if (args instanceof BinaryExpression) {
    //                    if (args.operator.token.isKeyword("eq")) {
    //                        let right = args.right;
    //                        let left = args.left;
    //                        if (right instanceof ValueExpression && ["'ARRAY'", '"ARRAY"'].contains(right.value))
    //                            return { node: node, target: left };
    //                    }
    //                }
    //            }
    //        }
    //    }
    //    return null;
    //}
}



export class CodeBuilder<T extends AstNode> {
    constructor(public node?: T) {
    }
    static rawStatement(code: string): CodeBuilder<RawStatement> {
        let node = new RawStatement();
        node.code = code;
        return new CodeBuilder(node);
    }
    static rawExpression(code: string): CodeBuilder<RawExpression> {
        let node = new RawExpression();
        node.code = code;
        return new CodeBuilder(node);
    }
    static member(name: string): CodeBuilder<NamedMemberExpression> {
        let node = new NamedMemberExpression();
        node.name = name;
        return new CodeBuilder(node);
    }
    static value(value: any): CodeBuilder<ValueExpression> {
        let node = new ValueExpression();
        node.token = TokenTypes.string.create2(JSON.stringify(value));
        node.value = value;
        return new CodeBuilder(node);
    }
    static parenthesizedList(items: Expression[]): CodeBuilder<ParenthesizedList> {
        let node = new ParenthesizedList();
        node.parenOpenToken = TokenTypes.parenOpen.create2("(");
        node.list = this.nonParenthesizedList(items).node;
        node.parenCloseToken = TokenTypes.parenOpen.create2(")");
        return new CodeBuilder(node);
    }
    static op(tt: TokenType, value: string): Operator {
        let op = new Operator();
        op.token = tt.create2(value);
        op.value = value;
        return op;
    }
    static nonParenthesizedList(items: Expression[]): CodeBuilder<NonParenthesizedList> {
        let node = new NonParenthesizedList();
        node.items = items;
        node.itemsSeparators = items.skip(1).select(t=> this.op(TokenTypes.comma, ", "));
        return new CodeBuilder(node);
    }
    invoke(args: Expression[]): CodeBuilder<InvocationExpression> {
        return this.invokeList(CodeBuilder.parenthesizedList(args).node);
    }
    invokeSingleArgOrList(arg: Expression): CodeBuilder<InvocationExpression> {
        if (arg instanceof ParenthesizedList)
            return this.invokeList(arg);
        return this.invoke([arg]);
    }
    invokeList(args: ParenthesizedList): CodeBuilder<InvocationExpression> {
        let node = new InvocationExpression();
        node.arguments = args;
        let target = this.node;
        if (target instanceof Expression) {
            node.target = <Expression><any>target;
            return new CodeBuilder(node);
        }
        throw new Error();
    }
    statement(): Statement {
        let node = new ExpressionStatement();
        node.expression = <Expression><any>this.node;
        node.semicolonToken = TokenTypes.semicolon.create2(";");
        //node.whitespaceBefore = [TokenTypes.whitespace.create2("    ")];
        //node.whitespaceAfter = [TokenTypes.whitespace.create2("\n    ")];
        return node;
    }

}
