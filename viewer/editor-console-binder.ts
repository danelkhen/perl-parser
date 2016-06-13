"use strict";
import {
    Token, TokenType,
    AstWriter, ParserBase, ExpressionParser, Parser,
    AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
    BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
    ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
    NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
    Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
    ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
    AstQuery, PrecedenceResolver, TokenTypes, Tokenizer, TokenReader, Logger, AstNodeFixator,
} from "perl-parser";
import {PackageResolution, AsyncFunc, TreeNodeData, Expander, Helper} from "./common";
import {RefArrayToRefUtil} from "perl-parser";
import {ExpressionTester, EtReport, EtItem} from "perl-parser";
import {P5Service, P5File, CritiqueResponse, CritiqueViolation} from "./p5-service";
import {monitor, Monitor} from "./monitor";
import {Key, Rect, Size, Point} from "./common";
import {Editor, Watchable, CvLine, Collapsable, CodeHyperlink, EditorPos} from "./editor";

export class EditorConsoleBinder {
    el: HTMLElement;
    editor: Editor;
    visualColCount: number = 200;
    visualLineCount: number = 50;
    lines: ConsoleLine[];


    init() {
        this.initLines();
        this.initElements();
    }
    initLines() {
        this.lines = [];
        for (let lineNum = 1; lineNum <= this.visualLineCount; lineNum++) {
            let line = new ConsoleLine();
            line.line = lineNum;
            line.cols = [];
            this.lines.push(line);
            for (let colNum = 1; colNum < this.visualColCount; colNum++) {
                let col = new ConsoleCol();
                col.line = line;
                col.col = colNum;
                col.char = " ";
                line.cols.push(col);
            }
        }
    }
    initElements() {
        this.lines.forEach(line => {
            line.el = $.create("div").appendTo(this.el)[0];
            line.cols.forEach(col => {
                col.el = $.create("span").text(col.char).appendTo(line.el)[0];
            });
        });
    }
    setText(text: string) {
        let index = 0;
        this.lines.forEach(line => {
            let reachedEndOfLine = false;
            line.cols.forEach(col => {
                let ch = text[index];
                if (ch == null || reachedEndOfLine) {
                    col.char = null;
                    return;
                }
                col.char = ch;
                if (ch == "\n")
                    reachedEndOfLine = true;
                else
                    index++;
            });
            let nextLineIndex = text.indexOf("\n", index);
            if (nextLineIndex < 0)
                index = text.length;
            else
                index = nextLineIndex + 1;
        });
    }
    redraw() {
        this.lines.forEach(line => {
            line.cols.forEach(col => {
                let ch = col.char;
                if (ch == null || ch.length == 0)
                    ch = " ";
                else if (ch.length > 1)
                    ch = ch.substr(0, 1);
                if (col.el.textContent == col.char)
                    return;
                col.el.textContent = col.char;
            });
        });
    }

}


export class ConsoleLine {
    el: HTMLElement;
    cols: ConsoleCol[];
    line: number;
}

export class ConsoleCol {
    line: ConsoleLine;
    el: HTMLElement;
    char: string;
    col: number;
}