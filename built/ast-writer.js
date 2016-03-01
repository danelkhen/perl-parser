"use strict";
var AstWriter = (function () {
    function AstWriter() {
        this.map = new Map();
    }
    AstWriter.prototype.main = function () {
        this.register(Unit, function (t) { return t.statements; });
        this.register(PackageDeclaration, function (t) { return ["package ", t.name, ";", "\n", t.statements]; });
        this.register(UseStatement, function (t) { return ["use ", t.module, [" ", t.list], ";", "\n"]; });
        this.register(VariableDeclarationStatement, function (t) { return [t.declaration, ";", "\n"]; });
        this.register(VariableDeclarationExpression, function (t) { return ["my", " ", t.variables, [" ", "=", " ", t.initializer]]; });
        this.register(MemberExpression, function (t) { return [[t.target, (t.arrow ? "->" : "::")], t.name]; });
        this.register(InvocationExpression, function (t) { return [t.target, [(t.arrow ? "->" : null)], "(", [t.arguments], ")"]; });
        this.register(ExpressionStatement, function (t) { return [t.expression, ";", "\n"]; });
        this.register(ValueExpression, function (t) { return [t.value]; });
        this.register(BinaryExpression, function (t) { return [t.left, " ", t.operator, " ", t.right]; });
        this.register(MultiBinaryExpression, function (t) { var list = [t.expressions[0]]; t.operators.forEach(function (op, i) { return list.push(op, list[i + 1]); }); return list.withItemBetweenEach(" "); });
        this.register(BeginBlock, function (t) { return ["BEGIN", "\n", "{", "\n", t.statements, "}", "\n"]; });
        this.register(ListDeclaration, function (t) { return ["(", t.items.withItemBetweenEach(", "), ")"]; });
        this.register(PrefixUnaryExpression, function (t) { return [t.operator, t.expression]; });
        this.register(SubroutineExpression, function (t) { return ["sub", " ", t.name, [":", t.attribute], "{", "\n", ["(", t.prototype, ")"], t.statements, "}", "\n"]; });
        this.register(SubroutineDeclaration, function (t) { return [t.declaration, ";", "\n"]; });
        this.register(SimpleName, function (t) { return [t.name]; });
        this.register(HashMemberAccessExpression, function (t) { return [t.target, [(t.arrow ? "->" : null)], "{", t.member, "}"]; });
        this.register(ReturnExpression, function (t) { return ["return ", t.expression]; });
        this.register(ArrayRefDeclaration, function (t) { return ["[", t.items.withItemBetweenEach(","), "]"]; });
        this.register(IfStatement, function (t) { return ["if", "(", t.expression, ")", "{", "\n", t.statements, "}", [t.else]]; });
        this.register(ElsifStatement, function (t) { return ["elsif", "(", t.expression, ")", "{", "\n", t.statements, "}", [t.else]]; });
        this.register(ElseStatement, function (t) { return ["else", "{", "\n", t.statements, "}"]; });
        this.register(HashRefCreationExpression, function (t) { return ["{", t.items.withItemBetweenEach(","), "}"]; });
        this.register(ForEachStatement, function (t) { return [[t.label, ":"], "for", [t.variable], "(", t.list, ")", "{", "\n", t.statements, "}", "\n"]; });
        this.register(ArrayMemberAccessExpression, function (t) { return [[t.target, (t.arrow ? "->" : "::")], "[", t.expression, "]"]; });
        this.sb = [];
    };
    AstWriter.prototype.write = function (obj) {
        var _this = this;
        if (obj == null)
            return;
        if (obj instanceof AstNode) {
            var node = obj;
            var func = this.map.get(node.constructor);
            if (func == null) {
                console.warn("no writer for node", node);
                return;
            }
            var list = func(node);
            this.write(list);
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
