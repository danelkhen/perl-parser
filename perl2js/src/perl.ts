import {
    Parser, TextFile, Tokenizer, Logger, TokenReader, Unit, Expression, AstNodeFixator, ExpressionStatement, Token,
    AstNode, Operator, ValueExpression, HashRefCreationExpression, InvocationExpression, NamedMemberExpression, ElsifStatement,
    UnresolvedExpression, VariableDeclarationExpression, ParenthesizedList, ForEachStatement, AstWriter,
    Token as PerlToken, TokenType as PerlTokenType, TokenTypes
} from "./perl-parser/index.js"
import {parseExpression2} from "./expression.js"

export function parseUnit(code: string, filename?: string): Unit {
    let file = new TextFile(filename || "", code);
    let tok = new Tokenizer();
    tok.file = file;
    tok.process();
    let parser = new Parser();
    parser.logger = new Logger();
    parser.reader = new TokenReader();
    parser.reader.logger = parser.logger;
    parser.reader.tokens = tok.tokens;
    parser.init();
    parser.expressionParser.onResolveExpression = (mbe, parentNode) => parseExpression2(mbe);

    let tokens = tok.tokens;
    var statements = parser.parse();
    let unit = new Unit();
    unit.allTokens = tokens;
    unit.statements = statements;
    new AstNodeFixator().process(unit);

    return unit;
}
export function parseExpression(code: string): Expression {
    let unit = parseUnit(code);
    new AstNodeFixator().process(unit);
    let st = unit.statements[0];
    if (st instanceof ExpressionStatement) {
        return st.expression;
    }
    throw new Error();
}
export function tokenize(code: string, filename?: string): Token[] {
    let file = new TextFile(filename || "", code);
    let tok = new Tokenizer();
    tok.file = file;
    tok.process();
    let tokens = tok.tokens;
    return tokens;
}


export function findTopSymbols(node: AstNode): string[] {
    let symbols = new Set(_findTopSymbols(node));
    return Array.from(symbols);
}
export function* _findTopSymbols(node: AstNode): IterableIterator<string> {
    //if (node instanceof UnresolvedExpression) {
    //    for (let child of node.nodes) {
    //        let prev = child.prevNode;
    //        if (child instanceof NamedMemberExpression) {
    //            if (child.name == "json_base")
    //                console.log("FOUND!!!!!!!!!!!!!!");
    //            if (prev != null && prev instanceof Operator && prev.value == "->")
    //                continue;
    //            if (prev == null && child.parentNode != null && child.parentNode instanceof HashRefCreationExpression)
    //                continue;
    //            yield child.name;
    //        }
    //        else {
    //            yield* findTopSymbols(child);
    //        }
    //    }
    //    return;
    //}
    //else 
    if (node instanceof NamedMemberExpression) {
        let prev = node.prevNode;
        let parent = node.parentNode;
        if (prev != null && prev instanceof Operator && prev.value == "->")
            return;
        if (prev == null && parent != null && parent instanceof HashRefCreationExpression)  // $a->{aaa} - don't consider 'aaa' as a top level symbol
            return;
        if (prev == null && parent != null && parent.parentNode != null && parent.parentNode instanceof HashRefCreationExpression) // $a->{aaa} - don't consider 'aaa' as a top level symbol
            return;
        yield node.name;
    }
    for (let child of node.query().getChildren()) {
        yield* findTopSymbols(child);
    }

}


export function getAllTokens(obj: any): Token[] {
    let tc = new TokenCollector();
    tc.main();
    return tc.getTokens(obj);
}
export class TokenCollector extends AstWriter {
    write(obj: any) {
        if (obj instanceof Token) {
            this.sb.push(obj as any);
            return;
        }
        return super.write(obj);
    }
    getTokens(obj: any): Token[] {
        this.write(obj);
        return this.sb as any;
    }

}


