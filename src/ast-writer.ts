/// <reference path="extensions.ts" />
"use strict";
import {
AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
HasArrow, HasLabel,
} from "./ast";

import {Token} from "./token";
import {TokenTypes} from "./token-types";

export class AstWriter {
    sb: string[];
    /**
     * every ast node can return a mixed array with nodes/tokens/operators/strings/arrays, any array / inner array with null items will be *skipped*
     */
    main() {
        this.register(Unit, t=> t.statements);
        this.register(PackageDeclaration, t=> [t.packageToken, t.packageTokenPost, t.name, t.semicolonToken, [t.semicolonTokenPost], t.statements]);
        this.register(UseStatement, t=> [t.useToken, t.useTokenPost, t.module, [t.modulePostTokens], [t.list], t.semicolonToken, [t.semicolonTokenPost]]);
        this.register(NoStatement, t=> [t.useToken, t.useTokenPost, t.module, [t.modulePostTokens], [t.list], t.semicolonToken, [t.semicolonTokenPost]]);
        this.register(VariableDeclarationStatement, t=> [t.declaration, t.semicolonToken]);
        this.register(VariableDeclarationExpression, t=> [t.myOurToken, [t.myOurTokenPost], t.variables, [t.variablesPost], [t.assignToken, [t.assignTokenPost], t.initializer]]);
        this.register(InvocationExpression, t=> [t.target, [t.targetPost], [t.memberSeparatorToken], [t.arguments]]);
        this.register(BlockExpression, t=> [t.block]);
        this.register(ExpressionStatement, t=> [t.expression, [t.expressionPost], [t.semicolonToken]]);
        this.register(BlockStatement, t=> [t.block, [t.blockPost], [t.semicolonToken]]);
        this.register(ValueExpression, t=> [t.value]);
        this.register(BinaryExpression, t=> [t.left, t.operator, t.right]);
        this.register(BeginStatement, t=> [t.beginToken, [t.beginTokenPost], t.block, [t.semicolonToken]]);
        this.register(ParenthesizedList, t=> [[t.parenOpenToken, [t.parenOpenTokenPost]], [t.list], [t.parenCloseToken]]);
        this.register(NonParenthesizedList, t=> [this.zip(t.items, t.itemsSeparators).exceptNulls()]);
        this.register(PrefixUnaryExpression, t=> [t.operator, [t.operatorPost], t.expression]);
        this.register(PostfixUnaryExpression, t=> [t.expression, t.operator, [t.operatorPost]]);
        this.register(SubroutineExpression, t=> [t.subToken, t.subTokenPost, [t.name], [t.namePost], [t.colonToken, [t.colonTokenPost], t.attribute], t.block]);
        this.register(SubroutineDeclaration, t=> [t.declaration, [t.semicolonToken]]);
        this.register(SimpleName, t=> [t.name]);

        this.register(HashMemberAccessExpression, t=> [t.target, [t.memberSeparatorToken], t.member]);
        this.register(ArrayMemberAccessExpression, t=> [t.target, [t.memberSeparatorToken], t.member]);
        this.register(NamedMemberExpression, t=> [[t.target, t.memberSeparatorToken], t.name]);

        this.register(ReturnExpression, t=> [t.returnToken, [t.returnTokenPost], t.expression]);
        this.register(ArrayRefDeclaration, t=> [t.bracketOpenToken, [t.bracketOpenTokenPost], this.zip(t.items, t.itemsSeparators).exceptNulls(), t.bracketCloseToken]);
        this.register(IfStatement, t=> [t.keywordToken, [t.keywordTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.expression, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.else], [t.semicolonToken]]);
        this.register(UnlessStatement, t=> [t.keywordToken, [t.keywordTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.expression, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.else], [t.semicolonToken]]);
        this.register(ElsifStatement, t=> [t.keywordToken, [t.keywordTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.expression, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.else], [t.semicolonToken]]);
        this.register(ElseStatement, t=> [t.keywordToken, [t.keywordTokenPost], t.block, [t.semicolonToken]]);

        this.register(HashRefCreationExpression, t=> [t.braceOpenToken, [t.braceOpenTokenPost], [t.list], t.braceCloseToken]);
        this.register(WhileStatement, t=> [t.keywordToken, [t.keywordTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.condition, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.semicolonToken]]);
        this.register(ForEachStatement, t=> [[t.label, ":"], t.forEachToken, [t.forEachTokenPost], [t.variable, [t.variablePost]], t.list, [t.listPost], t.block]);
        this.register(ForStatement, t=> [t.forToken, [t.forTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.initializer, t.semicolon1Token, [t.semicolon1TokenPost], t.condition, t.semicolon2Token, [t.semicolon2TokenPost], t.iterator, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.semicolonToken]]);
        this.register(Block, t=> [t.braceOpenToken, [t.braceOpenTokenPost], t.statements, t.braceCloseToken]);
        this.register(RegexExpression, t=> [t.value]);
        this.register(TrinaryExpression, t=> [t.condition, t.questionOperator, t.trueExpression, [t.trueExpressionPost], t.colonOperator, t.falseExpression]);
        this.register(EndStatement, t=> [t.endToken]);
        this.register(EmptyStatement, t=> [t.semicolonToken]);

        this.register(Operator, t=> [t.token]);

        this.register(NativeInvocation_BlockAndListOrExprCommaList, t=> [t.keywordToken, t.keywordTokenPost, [t.block, t.blockPost, t.list], [t.expr, t.exprPost, t.commaToken, [t.commaTokenPost], t.list]]);
        this.register(NativeInvocation_BlockOrExpr, t=> [t.keywordToken, [t.keywordTokenPost], [t.block], [t.expr]]);

        this.register(UnresolvedExpression, t=> [t.nodes]);
        this.register(RawExpression, t=> [t.code]);
        this.register(RawStatement, t=> [t.code]);


        this.sb = [];
    }

    zip<T1, T2>(list1: T1[], list2: T2[]): Array<T1 | T2> {
        let list: Array<T1 | T2> = [];
        let max = Math.max(list1.length, list2.length);
        for (let i = 0; i < max; i++) {
            let x = list1[i];
            let y = list2[i];
            list.push(x);
            list.push(y);
        }
        //t.operators.forEach((op, i) => list.push(op, t.expressions[i + 1]));
        return list;
    }

    //getHandler(type:Function) {
    //    let func = this.map.get(node.constructor);
    //    if (func == null) 
    //        return this.getHandler(type.prototype);
    //}

    tryGetSingleBracedBareword(node: HashRefCreationExpression): string {
        if (node == null || node.list == null || node.list.items == null || node.list.items.length != 1)
            return null;
        let item = node.list.items[0];
        if (item instanceof NamedMemberExpression && item.token.isAny([TokenTypes.identifier, TokenTypes.keyword]))
            return item.name;
        if (item instanceof ValueExpression && item.token.isAny([TokenTypes.identifier, TokenTypes.keyword]))
            return item.value;
        return null;
    }
    addParentheses = false;//true;
    deparseFriendly = false;
    collapseWhitespace = false;
    ignoreComments = false;
    write(obj: any) {
        if (obj == null)
            return;
        if (obj instanceof AstNode) {
            let node = <AstNode>obj;
            let func = this.map.get(node.constructor);
            if (func == null) {
                this.sb.push("!!!ERROR!!!");
                console.warn("no writer for node", node);
                return;
            }
            let res = func(node);
            if (res instanceof Array) {
                let list = res;

                if (list.some(t=> t == null))
                    console.warn("node generated array with nulls", node, list, func.toString());
                if (this.addParentheses && node instanceof PrefixUnaryExpression) {
                    if (this.deparseFriendly && node.operator != null && node.operator.token != null && node.operator.token.is(TokenTypes.sigil)) {
                    }
                    else {
                        list.insert(1, "(");
                        list.add(")");
                    }
                }
                if (this.addParentheses && node instanceof InvocationExpression && !(node.arguments instanceof ParenthesizedList)) {
                    let target = node.target;
                    if (this.deparseFriendly && target instanceof NamedMemberExpression && target.name == "return") {
                        let t = node;
                        list = [t.target, [t.memberSeparatorToken || " "], [t.arguments]]
                    }
                    else {
                        list.insert(3, "(");
                        list.add(")");
                    }
                }
                if (this.addParentheses && node instanceof BinaryExpression) {
                    //if (this.deparseFriendly && node.operator.token.isAny([TokenTypes.regexEquals, TokenTypes.regexNotEquals])) {
                    //    let right = node.right;
                    //    if (right instanceof ValueExpression && right.token.isAny([TokenTypes.qr])) {
                    //        list = ["(", node.left, " ", node.operator, " ", node.right, ")"];
                    //    }
                    //    else {
                    //        list = ["(", node.left, " ", node.operator, " ", "/", node.right, "/", ")"];
                    //    }
                    //}
                    //else {
                        list = ["(", node.left, " ", node.operator, " ", node.right, ")"];
                    //}
                }
                if (this.deparseFriendly && node instanceof InvocationExpression && node.target != null && node.target.token.isIdentifier("eval") && node.arguments instanceof Block) {
                    let block = <Block><any>node.arguments;
                    let doBody: any = block.statements;
                    if (block.statements.length == 1) {
                        let st = block.statements[0];
                        if (st instanceof ExpressionStatement)
                            doBody = ["(", st.expression, ")"];
                        if (st instanceof EmptyStatement)
                            doBody = ["()"];
                    }
                    list = ["eval {\n    do {\n        ", doBody, "\n    }\n}"];
                }
                if (this.deparseFriendly && node instanceof HashMemberAccessExpression) {
                    let name = this.tryGetSingleBracedBareword(node.member);
                    if (name != null) {
                        let index = list.indexOf(node.member);
                        list[index] = "{'" + name + "'}";
                    }
                }
                if (this.deparseFriendly && node instanceof NamedMemberExpression && node.name == "shift") {
                    let parentNode = node.parentNode;
                    if (parentNode != null && parentNode instanceof InvocationExpression && node.parentNodeProp == "target" && parentNode.arguments != null) {
                        //skip in case shift is already an invocation with prms
                    }
                    else
                        list = ["shift(@ARGV)"];
                }
                if (this.deparseFriendly && node instanceof NamedMemberExpression && node.token.isAny([TokenTypes.identifier, TokenTypes.keyword]) && !node.arrow) {
                    let parent = node.parentNode;
                    if (parent instanceof NamedMemberExpression && parent.arrow) {
                        let node2: Expression = node;
                        let names: string[] = [];
                        while (node2 != null && node2 instanceof NamedMemberExpression && !node2.arrow && node.token.isAny([TokenTypes.identifier, TokenTypes.keyword])) {
                            let node3 = <NamedMemberExpression>node2;
                            names.push(node3.name);
                            node2 = node3.target;
                        }
                        if (node2 == null) {
                            list = ["'" + names.reversed().join("::") + "'"];
                        }
                    }
                }
                let all;
                if (this.deparseFriendly) {
                    all = list;
                    if (node instanceof Statement)
                        all.push("\n");
                }
                else
                    all = [[node.whitespaceBefore], list, [node.whitespaceAfter]];
                this.write(all);
            }
            else {
                this.write(res);
            }
        }
        else if (obj instanceof Array) {
            let list = <Array<any>>obj;
            if (list.contains(null) || list.contains(undefined))
                return;
            list.forEach(t=> this.write(t));
        }
        else if (obj instanceof Token) {
            let token = <Token>obj;
            if ((this.collapseWhitespace || this.deparseFriendly) && token.is(TokenTypes.whitespace)) {
                let s = token.value;
                if (s == "")
                    s = "";
                else
                    s = " ";
                this.sb.push(s);
            }
            else if ((this.ignoreComments || this.deparseFriendly) && token.is(TokenTypes.comment)) {
            }
            else
                this.sb.push(token.value);
        }
        //else if (obj instanceof Operator) {
        //    let op = <Operator>obj;
        //    this.sb.push(op.value);
        //}
        else {
            this.sb.push(obj.toString());
        }
    }

    map: Map<Function, (node) => Array<any>> = new Map<Function, (node) => any>();
    register<T>(type: Type<T>, func: (node: T) => any) {
        this.map.set(type, func);
    }

}


