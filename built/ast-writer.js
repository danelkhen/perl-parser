"use strict";
var AstWriter = (function () {
    function AstWriter() {
        this.map = new Map();
    }
    /**
     * every ast node can return a mixed array with nodes/tokens/operators/strings/arrays, any array / inner array with null items will be *skipped*
     */
    AstWriter.prototype.main = function () {
        var _this = this;
        this.register(Unit, function (t) { return t.statements; });
        this.register(PackageDeclaration, function (t) { return [t.packageToken, t.packageTokenPost, t.name, t.semicolonToken, [t.semicolonTokenPost], t.statements]; });
        this.register(UseStatement, function (t) { return [t.useToken, t.useTokenPost, t.module, [t.modulePostTokens], [t.list], t.semicolonToken, [t.semicolonTokenPost]]; });
        this.register(NoStatement, function (t) { return [t.useToken, t.useTokenPost, t.module, [t.modulePostTokens], [t.list], t.semicolonToken, [t.semicolonTokenPost]]; });
        this.register(VariableDeclarationStatement, function (t) { return [t.declaration, t.semicolonToken]; });
        this.register(VariableDeclarationExpression, function (t) { return [t.myOurToken, [t.myOurTokenPost], t.variables, [t.variablesPost], [t.assignToken, [t.assignTokenPost], t.initializer]]; });
        this.register(InvocationExpression, function (t) { return [t.target, [t.targetPost], [t.arrowToken], [t.arguments]]; });
        this.register(ExpressionStatement, function (t) { return [t.expression, [t.expressionPost], [t.semicolonToken]]; });
        this.register(ValueExpression, function (t) { return [t.value]; });
        this.register(BinaryExpression, function (t) { return [t.left, t.operator, t.right]; });
        this.register(BeginStatement, function (t) { return [t.beginToken, [t.beginTokenPost], t.block, [t.semicolonToken]]; });
        this.register(ListDeclaration, function (t) { return [[t.parenOpenToken, t.parenOpenTokenPost], _this.zip(t.items, t.itemsSeparators).exceptNulls(), [t.parenCloseToken]]; });
        this.register(PrefixUnaryExpression, function (t) { return [t.operator, t.expression]; });
        this.register(SubroutineExpression, function (t) { return [t.subToken, t.subTokenPost, t.name, [t.namePost], [t.colonToken, [t.colonTokenPost], t.attribute], t.block]; });
        this.register(SubroutineDeclaration, function (t) { return [t.declaration, [t.semicolonToken]]; });
        this.register(SimpleName, function (t) { return [t.name]; });
        this.register(HashMemberAccessExpression, function (t) { return [t.target, [t.memberSeparatorToken], t.braceOpenToken, [t.braceOpenTokenPost], t.member, t.braceCloseToken]; });
        this.register(ArrayMemberAccessExpression, function (t) { return [t.target, [t.memberSeparatorToken], t.bracketOpenToken, [t.bracketOpenTokenPost], t.expression, t.bracketCloseToken]; });
        this.register(MemberExpression, function (t) { return [[t.target, t.memberSeparatorToken], t.name]; });
        this.register(ReturnExpression, function (t) { return [t.returnToken, [t.returnTokenPost], t.expression]; });
        this.register(ArrayRefDeclaration, function (t) { return [t.bracketOpenToken, [t.bracketOpenTokenPost], _this.zip(t.items, t.itemsSeparators).exceptNulls(), t.bracketCloseToken]; });
        this.register(IfStatement, function (t) { return [t.keywordToken, [t.keywordTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.expression, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.else], [t.semicolonToken]]; });
        this.register(ElsifStatement, function (t) { return [t.keywordToken, [t.keywordTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.expression, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.else], [t.semicolonToken]]; });
        this.register(ElseStatement, function (t) { return [t.keywordToken, [t.keywordTokenPost], t.block, [t.semicolonToken]]; });
        this.register(HashRefCreationExpression, function (t) { return [t.parenOpenToken, [t.parenOpenTokenPost], _this.zip(t.items, t.itemsSeparators).exceptNulls(), t.parenCloseToken]; });
        this.register(ForEachStatement, function (t) { return [[t.label, ":"], t.forEachToken, [t.forEachTokenPost], [t.variable, [t.variablePost]], t.list, [t.listPost], t.block]; });
        this.register(ForStatement, function (t) { return [t.forToken, [t.forTokenPost], t.parenOpenToken, [t.parenOpenTokenPost], t.initializer, t.semicolon1Token, [t.semicolon1TokenPost], t.condition, t.semicolon2Token, [t.semicolon2TokenPost], t.iterator, t.parenCloseToken, [t.parenCloseTokenPost], t.block, [t.semicolonToken]]; });
        this.register(BlockExpression, function (t) { return [t.braceOpenToken, [t.braceOpenTokenPost], t.statements, t.braceCloseToken]; });
        this.register(RegexExpression, function (t) { return [t.value]; });
        this.register(TrinaryExpression, function (t) { return [t.condition, t.questionToken, [t.questionTokenPost], t.trueExpression, [t.trueExpressionPost], t.colonToken, [t.colonTokenPost], t.falseExpression]; });
        this.register(EndStatement, function (t) { return [t.endToken]; });
        this.register(MultiBinaryExpression, function (t) {
            if (t.expressions.length != t.operators.length + 1)
                throw new Error("invalid multiexpression");
            var list = _this.zip(t.expressions, t.operators).exceptNulls();
            //let list: Array<any> = [t.expressions[0]];
            //t.operators.forEach((op, i) => list.push(op, t.expressions[i + 1]));
            //let res = list.withItemBetweenEach(" ");
            //console.log("Multi", res);
            return list;
        });
        this.sb = [];
    };
    AstWriter.prototype.zip = function (list1, list2) {
        var list = [];
        var max = Math.max(list1.length, list2.length);
        for (var i = 0; i < max; i++) {
            var x = list1[i];
            var y = list2[i];
            list.push(x);
            list.push(y);
        }
        //t.operators.forEach((op, i) => list.push(op, t.expressions[i + 1]));
        return list;
    };
    //getHandler(type:Function) {
    //    let func = this.map.get(node.constructor);
    //    if (func == null) 
    //        return this.getHandler(type.prototype);
    //}
    AstWriter.prototype.write = function (obj) {
        var _this = this;
        if (obj == null)
            return;
        if (obj instanceof AstNode) {
            var node = obj;
            var func = this.map.get(node.constructor);
            if (func == null) {
                this.sb.push("!!!ERROR!!!");
                console.warn("no writer for node", node);
                return;
            }
            var list = func(node);
            if (list.some(function (t) { return t == null; }))
                console.warn("node generated array with nulls", node, list);
            var all = [[node.whitespaceBefore], list, [node.whitespaceAfter]];
            this.write(all);
        }
        else if (obj instanceof Array) {
            var list = obj;
            if (list.contains(null) || list.contains(undefined))
                return;
            list.forEach(function (t) { return _this.write(t); });
        }
        else if (obj instanceof Token) {
            var token = obj;
            this.sb.push(token.value);
        }
        else if (obj instanceof Operator) {
            var op = obj;
            this.sb.push(op.value);
        }
        else {
            this.sb.push(obj.toString());
        }
    };
    AstWriter.prototype.register = function (type, func) {
        this.map.set(type, func);
    };
    return AstWriter;
}());
