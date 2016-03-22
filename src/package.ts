import {Token, TokenType} from "./token";
import {AstWriter} from "./ast-writer";
import {ParserBase} from "./parser-base";
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

//declare var exports: any;
//if (typeof exports != 'undefined') {
//    Object.keys(PerlParser).forEach(key => exports[key] = PerlParser[key]);
//}