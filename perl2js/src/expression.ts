import {
    Parser, TextFile, Tokenizer, Logger, TokenReader, Unit, Expression, AstNodeFixator, ExpressionStatement, Token,
    AstNode, Operator, ValueExpression, HashRefCreationExpression, InvocationExpression, NamedMemberExpression, ElsifStatement,
    UnresolvedExpression, VariableDeclarationExpression, ParenthesizedList, ForEachStatement, AstWriter, TokenType, TokenTypes,
    MemberExpression, BinaryExpression, ReturnExpression, PrefixUnaryExpression, PostfixUnaryExpression, TrinaryExpression, HashMemberAccessExpression
} from "./perl-parser/index.js"
import * as perl from "./perl.js"

export const EXPR: Pred<AstNode> = node => node instanceof Expression;
export const AT: Pred<AstNode> = node => node instanceof Operator && node.token.is(TokenTypes.sigil, "@");
export const HASHREF: Pred<AstNode> = node => node instanceof HashRefCreationExpression;
export const ARROW: Pred<AstNode> = node => node instanceof Operator && node.token.is(TokenTypes.arrow);
export const COLCOL: Pred<AstNode> = node => node instanceof Operator && node.token.is(TokenTypes.packageSeparator);
export const PARENLIST: Pred<AstNode> = node => node instanceof ParenthesizedList;
export const BINOP: Pred<AstNode> = node => node instanceof Operator && (node.token.isAny(TokenTypes.binaryOperators) || node.token.isAnyKeyword(["and", "or", "ne", "cmp", "ge", "le", "eq", "lt", "gt",]));
export const UNOP: Pred<AstNode> = node => node instanceof Operator && (node.token.isAny(TokenTypes.unaryOperators) || node.token.isAnyKeyword(["not"]));
export const QUESTION: Pred<AstNode> = node => node instanceof Operator && node.token.is(TokenTypes.question);
export const COLON: Pred<AstNode> = node => node instanceof Operator && node.token.is(TokenTypes.colon);
export const RETURN: Pred<AstNode> = node => node instanceof NamedMemberExpression && node.name == "return";
export const IF: Pred<AstNode> = node => node instanceof Operator && node.token.is(TokenTypes.keyword, "if");
export const SCALAR: Pred<AstNode> = node => node instanceof NamedMemberExpression && node.token.is(TokenTypes.keyword, "scalar");


let rules: Rule[] = [];

export function addRule(pattern: Pred<AstNode>[], merge: (a?: any, b?: any, c?: any, d?: any, e?: any) => AstNode) {
    rules.push({ pattern, merge });
}
export function main() {
    addRule([AT, EXPR], (a, b) => { let x = new PrefixUnaryExpression(); x.operator = a; x.expression = b; return x; });
    addRule([EXPR, HASHREF], (a, b, c) => { let x = new HashMemberAccessExpression(); x.target = a; x.member = b; return x; });
    addRule([EXPR, ARROW, EXPR], (a, b, c) => { let x = new BinaryExpression(); x.left = a; x.operator = b; x.right = c; return x; });
    addRule([EXPR, COLCOL, EXPR], (a, b, c) => { let x = new BinaryExpression(); x.left = a; x.operator = b; x.right = c; return x; });
    addRule([EXPR, PARENLIST], (a, b) => { let x = new InvocationExpression(); x.target = a; x.arguments = b; return x; });
    addRule([UNOP, EXPR], (a, b) => { let x = new PrefixUnaryExpression(); x.operator = a; x.expression = b; return x; });
    addRule([EXPR, BINOP, EXPR], (a, b, c) => { let x = new BinaryExpression(); x.left = a; x.operator = b; x.right = c; return x; });
    addRule([EXPR, QUESTION, EXPR, COLON, EXPR], (condition, questionOp, trueExp, colonOp, falseExp) => { let x = new TrinaryExpression(); x.condition = condition; x.questionOperator = questionOp; x.trueExpression = trueExp; x.colonOperator = colonOp; x.falseExpression = falseExp; return x; });
    addRule([RETURN, EXPR], (a: NamedMemberExpression, b, c) => { let x = new ReturnExpression(); x.returnToken = a.token; x.expression = b; return x; }); //TODO: set 'return' namedmember
    addRule([EXPR, IF, EXPR], (a, b, c) => { let x = new BinaryExpression(); x.left = a; x.operator = b; x.right = c; return x; });
    addRule([SCALAR, EXPR], (a, b, c) => { let x = new InvocationExpression(); x.target = a; x.arguments = b; return x; });

    //let code = "$a->b->c(7,8,9) && print(777)";
    //console.log(parseExpression2(code));


}
export function parseExpression2(exp2: UnresolvedExpression | string): Expression {
    let exp: UnresolvedExpression = exp2 as any;
    if (typeof (exp2) == "string") {
        exp = perl.parseExpression(exp2) as UnresolvedExpression;
    }
    if (!(exp instanceof UnresolvedExpression))
        return exp;
    //console.log(exp.toCode(), exp);
    let nodes = exp.nodes.map(t => parseExpression2(t as any));
    let i = 0;
    while (true) {
        i++;
        if (i > 100)
            throw new Error();
        nodes = nodes.toArray();
        //console.log(nodes);
        let res = tryRules(nodes);
        //if (res != null)
        //    console.log(res.rule);
        if (res == null) {
            if (nodes.length != 1) {
                console.warn("can't parse expression", exp.toCode(), exp);
                return exp;
            }
            return nodes[0] as Expression;
        }
        else if (nodes.length == 1)
            return nodes[0] as Expression;
    }
}

export function tryRules(nodes: AstNode[]): { rule: Rule, index: number } {
    for (let rule of rules) {
        let index = findPattern(nodes, rule.pattern);
        if (index >= 0) {
            let group = nodes.splice(index, rule.pattern.length);
            let group2 = rule.merge(...group);
            nodes.splice(index, 0, group2);
            return { rule, index };
        }
    }
    return null;
}

export type Pred<T> = (item: T) => boolean;
export function findPattern<T>(list: T[], pattern: Pred<T>[]): number {
    let size = pattern.length;
    for (let i = 0; i < list.length; i++) {
        let res = testPattern(list, pattern, i);
        if (res)
            return i;
    }
    return -1;
}

export function testPattern<T>(list: T[], pattern: Pred<T>[], index: number) {
    let size = pattern.length;
    let list2 = list.slice(index, index + size);
    if (list2.length != size)
        return;
    //let all = pattern.every((pred, i) => pred(list2[i]))
    //return all;
    for (let j = 0; j < size; j++) {
        let pred = pattern[j];
        let item = list2[j];
        if (!pred(item))
            return false;
    }
    return true;
}

export interface Rule {
    pattern: Pred<AstNode>[];
    merge: (a?: AstNode, b?: AstNode, c?: AstNode) => AstNode;
}

main();
