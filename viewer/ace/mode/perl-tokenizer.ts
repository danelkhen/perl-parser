import {Mode as TextMode}           from "ace/mode/text";
import {PerlHighlightRules}         from "ace/mode/perl_highlight_rules";
import {MatchingBraceOutdent}       from "ace/mode/matching_brace_outdent";
import {FoldMode as CStyleFoldMode} from "ace/mode/folding/cstyle";
import {Range} from "ace/range";
import {IEditSession} from "ace/edit_session";
import {TokenizerResult} from "ace/tokenizer";
import {TokenInfo} from "ace/token_info";
import {Completer, Completion} from "ace/ext/language_tools";
import {Position} from "ace/position";
import {Editor} from "ace/editor";
import {TokenIterator} from "ace/token_iterator";
import {
    Token, TokenType,
    AstWriter, ParserBase, ExpressionParser, Parser,
    AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
    BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
    ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
    NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
    Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
    ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, TokenReader, Logger, AstNodeFixator, TextFile, TextFilePos, TextFileRange, Cursor,
    ExpressionTester, EtReport, EtItem, RefArrayToRefUtil,
    EntityResolver, Package, Subroutine, Global
} from "perl-parser";
import * as util from "ace/autocomplete/util";
import {Mode} from "./perl";
import {P5AceHelper} from "../../p5-ace-helper";

export class PerlTokenizer {
    constructor(public mode: Mode) { }
    session: IEditSession;
    tokenizer: Tokenizer;
    lines: string[] = [];
    init() {
        if (this.mode != null) {
            this.mode.sessionChanged.add(() => this.attachToSession(this.mode.session));
            this.attachToSession(this.mode.session);
            return;
        }
        this.reset(true);
    }

    topChangePos: TextFilePos;
    attachToSession(session: IEditSession) {
        this.session = session;
        if (this.session != null) {
            this.session.on("change", e => {
                console.log(e);
                let pos = P5AceHelper.toTextFilePos(e.start);
                if (this.topChangePos == null || pos.isBefore(this.topChangePos))
                    this.topChangePos = pos;
                this.lines = this.session.getDocument().getAllLines().toArray();
                this.reset();
            });
            this.lines = this.session.getDocument().getAllLines().toArray();
        }
        this.reset(true);
    }

    reset(complete?: boolean) {
        if (this.topChangePos != null && !complete) {
            this.tokenizer.file.text = this.lines.join("\n");
            this.tokenizer.file.scanNewLines();
            let tokens = this.tokenizer.tokens;
            let tokenIndex = tokens.findIndex(t => t.range.containsPos(this.topChangePos));
            if (tokenIndex >= 0) {
                let token = tokens[tokenIndex];
                tokens.splice(tokenIndex, tokens.length - tokenIndex);
                this.tokenizer.cursor.pos = token.range.start;
                this.topChangePos = null;
            }
            return;
        }
        if (!complete)
            return;
        console.log("resetting tokenizer");
        this.tokenizer = new Tokenizer();
        this.tokenizer.file = new TextFile("unknown.pm", this.lines.join("\n"));
        this.tokenizer.init();
    }

    tokenizeUntilLineNumber(lineNumber: number) {
        let tok = this.tokenizer;
        while (!tok.isEof() && tok.cursor.pos.line <= lineNumber) {
            //console.log("MyTok", "tokenizer.next", tok.cursor.pos.line, tok.cursor.pos.column);
            tok.next();
        }
    }

    getTokensContainingLineNumber(lineNumber: number, startFromTokenIndex: number = 0): Token[] {
        let allTokens = this.tokenizer.tokens;
        let tokens: Token[] = [];
        for (let i = startFromTokenIndex; i < allTokens.length; i++) {
            let token = this.tokenizer.tokens[i];
            if (token.range.start.line > lineNumber)
                break;
            if (token.range.containsLine(lineNumber))
                tokens.push(token);
        }
        return tokens;
    }

    extractLineFromToken(token: Token, lineNumber: number): TokenEx {
        if (token.range.start.line == lineNumber && token.range.end.line == lineNumber)
            return token;
        let lines = token.value.lines();
        let line = lines[lineNumber - token.range.start.line];
        let token2 = <TokenEx>token.type.create2(line);
        token2.isPartialToken = true;
        return token2;
    }

    getLineTokens(line: string, state: any, row?: number): TokenizerResult {
        if (row == null) {
            console.log("parsing unknown line", { state, line });
            let tokenizer = new Tokenizer();
            tokenizer.file = new TextFile("unknown.pm", line);
            tokenizer.init();
            tokenizer.process();
            let tokens2 = tokenizer.tokens.map(t => this.toTokenInfo(t));
            let res = { state: state, tokens: tokens2 };
            //console.log("tokenizer result", res);
            return res;

        }
        let lineNumber = row + 1;
        if (this.lines[row] != line) {
            console.warn("this shouldn't happen?");
            console.log({ lineNumber, prev: this.lines[row], now: line });
            this.lines[row] = line;
            this.reset(); //TODO: optimize - clear only the tokens from this line forward, rewind to the proper pos, and continue from there.
        }


        let tok = this.tokenizer;
        let startFromTokenIndex = 0;
        if (tok.cursor.pos.line < lineNumber)
            startFromTokenIndex = tok.tokens.length;
        try {
            this.tokenizeUntilLineNumber(lineNumber);
        }
        catch (e) {
            if (tok.cursor.pos.line <= lineNumber)
                return { state: "error", tokens: [] };
        }
        let tokens2 = this.getTokensContainingLineNumber(lineNumber, startFromTokenIndex);
        let relevantTokens = tokens2.map(t => this.extractLineFromToken(t, lineNumber));
        //let relevantTokens: TokenEx[] = [];
        //for (let i = startFromTokenIndex; i < tok.tokens.length; i++) {
        //    let token = tok.tokens[i];
        //    let startRow = token.range.start.line - 1;
        //    let endRow = token.range.end.line - 1;
        //    if (startRow > row)
        //        break;
        //    if (endRow < row)
        //        continue;
        //    if (startRow == row && endRow == row) {
        //        relevantTokens.push(token);
        //        continue;
        //    }
        //    let lines = token.value.lines();
        //    let newValue = lines[row - startRow];
        //    if (newValue != "") {
        //        let token2: TokenEx = token.type.create2(newValue);
        //        token2.isPartialToken = true;
        //        relevantTokens.push(token2);
        //    }
        //}
        let newState = "no_tokens";
        if (relevantTokens.length > 0) {
            let lastToken = relevantTokens.last();
            newState = lastToken.type.name;
            if (relevantTokens.first(t => t.type.name == "heredoc") != null)
                newState = "heredoc";
            if (lastToken.isPartialToken)
                newState += "_partial";
        }

        let tokens: TokenInfo[] = relevantTokens.map(t => this.toTokenInfo(t));//.filter(t => t != null)
        let res: TokenizerResult = { tokens, state: newState };//
        //console.log("tokenizer result", res, res.tokens.map(t=>t.value).join(""));
        //console.log({ line_num: row + 1, line, fromState: state, toState: newState, stateChanged: state != newState });
        //console.log("getLineTokens", { line_num: row + 1, line, stateName, state, tokens });
        return res;
    }

    toTokenInfo(token: Token): TokenInfoEx {
        let type = token.type.name;
        if (token.isAnyIdentifier(TokenTypes.builtinFunctions))
            type = "keyword";
        else if (token.isAnyIdentifier(TokenTypes.pragmas))
            type = "keyword";
        else if (token.is(TokenTypes.braceOpen))
            type = "paren.lparen";
        else if (token.is(TokenTypes.braceClose))
            type = "paren.rparen";
        return { value: token.value, type: type, ppToken: token };
    }

}

export interface TokenInfoEx extends TokenInfo {
    ppToken?: Token;
}


export interface TokenEx extends Token {
    isPartialToken?: boolean;
}
