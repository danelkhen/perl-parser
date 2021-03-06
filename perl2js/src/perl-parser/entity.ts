﻿"use strict";

import {Token} from "./token.js";
import {TokenTypes} from "./token-types.js";
import {AstWriter} from "./ast-writer.js";
import {
    AstNode, Expression, Statement, UnresolvedExpression, SimpleName, SubroutineDeclaration, SubroutineExpression, ArrayMemberAccessExpression, ArrayRefDeclaration,
    BarewordExpression, BeginStatement, BinaryExpression, Block, BlockExpression, BlockStatement, ElseStatement, ElsifStatement, EmptyStatement, EndStatement,
    ExpressionStatement, ForEachStatement, ForStatement, HashMemberAccessExpression, HashRefCreationExpression, IfStatement, InvocationExpression, MemberExpression,
    NamedMemberExpression, NativeFunctionInvocation, NativeInvocation_BlockAndListOrExprCommaList, NativeInvocation_BlockOrExpr, NonParenthesizedList, NoStatement,
    Operator, PackageDeclaration, ParenthesizedList, PostfixUnaryExpression, PrefixUnaryExpression, QwExpression, RawExpression, RawStatement, RegexExpression,
    ReturnExpression, TrinaryExpression, Unit, UnlessStatement, UseOrNoStatement, UseStatement, ValueExpression, VariableDeclarationExpression, VariableDeclarationStatement, WhileStatement,
    HasArrow, HasLabel,
} from "./ast.js";


export class Global {
    packages: Package[] = [];
    resolve(name: string, context?: Entity): Entity {
        let packageContext: Package = null;
        if (context instanceof Package)
            packageContext = context;
        else if (context instanceof Subroutine)
            packageContext = context.package;

        let allTokens = name.split(/::|->/);

        let tokens = allTokens.toArray();
        let pkg: Package;
        while (tokens.length > 0) {
            let testName = tokens.join("::");
            pkg = this.packages.first(t => t.name == testName);
            if (pkg != null)
                break;
            tokens.removeLast();
        }
        if (pkg == null)
            pkg = packageContext;
        if (pkg == null)
            return null;
        if (tokens.length < allTokens.length) {
            let memberName = allTokens.skip(tokens.length).join("::");
            let me = pkg.members.first(t => t.name == memberName);
            return me;
        }
        return pkg;
    }
}
export class Entity {
    name: string;
    documentation: string;
    node: AstNode;
}

export class Package extends Entity {    //main is default package
    members: Member[] = [];
    node: PackageDeclaration;
    uses: PackageRef[] = [];
}

export class Member extends Entity {
    package: Package;
}

export class Subroutine extends Member {
    node: SubroutineDeclaration;
}

export class PackageRef {
    name: string;
}

export class EntityResolver {
    static process(unit: Unit): Package[] {
        let resolver = new EntityResolver();
        resolver.unit = unit;
        resolver.init();
        resolver.process();
        return resolver.packages;
    }
    unit: Unit;
    init() {
        this.packages = [];
    }
    process(): Entity[] {
        if (this.packages == null)
            this.init();
        this.unit.statements.forEach(t => this.processNode(t));
        return this.packages;
    }
    packages: Package[];
    getCreatePackage(): Package {
        let pkg = this.packages.last();
        if (pkg == null) {
            pkg = new Package();
            pkg.name = "main";
            this.packages.push(pkg);
        }
        return pkg;
    }

    getTokenValue(token: Token): string {
        if (token.is(TokenTypes.comment))
            return token.value.substr(1);
        return token.value;
    }
    getDocumentation(node: AstNode): string {
        let allTokens = this.unit.allTokens;
        if (allTokens == null)
            return null;
        let index = allTokens.indexOf(node.token);
        if (index < 0)
            return null;
        let i = index - 1;
        let tokens: Token[] = [];
        while (i >= 0) {
            let token = allTokens[i];
            if (!token.isAny([TokenTypes.whitespace, TokenTypes.comment, TokenTypes.pod]))
                break;
            tokens.push(token);
            i--;
        }
        if (tokens.length > 0) {
            tokens.reverse();
            let s = tokens.map(t => this.getTokenValue(t)).join("").trim();
            if (s.length == 0)
                return null;
            return s;
        }
        return null;
    }

    processNode(node: AstNode) {
        if (node instanceof PackageDeclaration) {
            let pkg = new Package();
            pkg.node = node;
            pkg.name = node.name.toCode().trim();
            pkg.documentation = this.getDocumentation(node);
            this.packages.push(pkg);
            node.statements.forEach(t => this.processNode(t));
        }
        else if (node instanceof SubroutineDeclaration) {
            let sub = new Subroutine();
            sub.node = node;
            sub.name = node.declaration.name.toCode().trim();
            sub.documentation = this.getDocumentation(node);
            let pkg = this.getCreatePackage();
            pkg.members.push(sub);
            sub.package = pkg;
        }
        else if (node instanceof ExpressionStatement) {
            let code = node.toCode().trim();
            if (code.startsWith("use ")) {
                let pkgName = code.split(/[ ;]/)[1];
                if (pkgName != null) {
                    let pkg = this.getCreatePackage();
                    let pr = new PackageRef();
                    pr.name = pkgName;
                    pkg.uses.push(pr);
                }
            }
        }
    }
}