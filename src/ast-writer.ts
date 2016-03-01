"use strict";
class AstWriter {
    sb: string[];
    /**
     * every ast node can return a mixed array with nodes/tokens/operators/strings/arrays, any array / inner array with null items will be *skipped*
     */
    main() {
        this.register(Unit, t=> t.statements);
        this.register(PackageDeclaration, t=> { let x = [t.packageToken, t.packageTokenPost, t.name, t.semicolonToken, [t.semicolonTokenPost], t.statements]; console.log(x); return x; });
        this.register(UseStatement, t=> [t.useToken, t.useTokenPost, t.module, [t.modulePostTokens], [t.list], t.semicolonToken, [t.semicolonTokenPost]]);
        this.register(VariableDeclarationStatement, t=> [t.declaration, ";", "\n"]);
        this.register(VariableDeclarationExpression, t=> ["my", " ", t.variables, [" ", "=", " ", t.initializer]]);
        this.register(MemberExpression, t=> [[t.target, (t.arrow ? "->" : "::")], t.name]);
        this.register(InvocationExpression, t=> [t.target, [(t.arrow ? "->" : null)], "(", [t.arguments], ")"]);
        this.register(ExpressionStatement, t=> [t.expression, ";", "\n"]);
        this.register(ValueExpression, t=> [t.value]);
        this.register(BinaryExpression, t=> [t.left, " ", t.operator, " ", t.right]);
        this.register(BeginBlock, t=> ["BEGIN", " ", "{", "\n", t.statements, "}", "\n"]);
        this.register(ListDeclaration, t=> ["(", t.items.withItemBetweenEach(", "), ")"]);
        this.register(PrefixUnaryExpression, t=> [t.operator, t.expression]);
        this.register(SubroutineExpression, t=> ["sub", " ", t.name, [":", t.attribute], "{", "\n", ["(", t.prototype, ")"], t.statements, "}", "\n"]);
        this.register(SubroutineDeclaration, t=> [t.declaration, ";", "\n"]);
        this.register(SimpleName, t=> [t.name]);
        this.register(HashMemberAccessExpression, t=> [t.target, [(t.arrow ? "->" : null)], "{", t.member, "}"]);
        this.register(ReturnExpression, t=> ["return ", t.expression]);
        this.register(ArrayRefDeclaration, t=> ["[", t.items.withItemBetweenEach(","), "]"]);
        this.register(IfStatement, t=> ["if", "(", t.expression, ")", "{", "\n", t.statements, "}", [t.else]]);
        this.register(ElsifStatement, t=> ["elsif", "(", t.expression, ")", "{", "\n", t.statements, "}", [t.else]]);
        this.register(ElseStatement, t=> ["else", "{", "\n", t.statements, "}"]);
        this.register(HashRefCreationExpression, t=> ["{", t.items.withItemBetweenEach(","), "}"]);
        this.register(ForEachStatement, t=> [[t.label, ":"], "for", [t.variable], "(", t.list, ")", "{", "\n", t.statements, "}", "\n"]);
        this.register(ArrayMemberAccessExpression, t=> [[t.target, (t.arrow ? "->" : "::")], "[", t.expression, "]"]);
        this.register(BlockExpression, t=> ["{", "\n", t.statements, "}", "\n"]);

        this.register(RegexExpression, t=> [t.value]);

        this.register(TrinaryExpression, t=> [t.condition, " ", "?", " ", t.trueExpression, " ", ":", " ", t.falseExpression]);
        this.register(EndStatement, t=> ["__END__"]);



        this.register(MultiBinaryExpression, t=> {
            if (t.expressions.length != t.operators.length + 1)
                throw new Error("invalid multiexpression");
            let list: Array<any> = [t.expressions[0]];
            t.operators.forEach((op, i) => list.push(op, t.expressions[i + 1]));
            let res = list.withItemBetweenEach(" ");
            console.log("Multi", res);
            return res;
        });
        this.sb = [];
    }
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
            this.write(list);
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
        else if (obj instanceof Operator) {
            let op = <Operator>obj;
            this.sb.push(op.value);
        }
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
