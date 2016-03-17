"use strict";
class AstWriter {
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

    addParentheses = false;//true;
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
            let list = func(node);
            if (list.some(t=> t == null))
                console.warn("node generated array with nulls", node, list, func.toString());
            if (this.addParentheses && node instanceof PrefixUnaryExpression) {
                list.insert(1, "(");
                list.add(")");
            }
            if (this.addParentheses && node instanceof InvocationExpression) {
                list.insert(3, "(");
                list.add(")");
            }
            if (this.addParentheses && node instanceof BinaryExpression) {
                list = ["(", list, ")"];
            }
            let all = [[node.whitespaceBefore], list, [node.whitespaceAfter]];
            this.write(all);
        }
        else if (obj instanceof Array) {
            let list = <Array<any>>obj;
            if (list.contains(null) || list.contains(undefined))
                return;
            list.forEach(t=> this.write(t));
        }
        else if (obj instanceof Token) {
            let token = <Token>obj;
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

    map: Map<Function, (node) => Array<any>> = new Map<Function, (node) => Array<any>>();
    register<T>(type: Type<T>, func: (node: T) => Array<any>) {
        this.map.set(type, func);
    }

}


interface Type<T> {
    new (): T;
}
