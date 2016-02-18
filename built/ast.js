"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AstNode = (function () {
    function AstNode() {
    }
    return AstNode;
}());
var Statement = (function (_super) {
    __extends(Statement, _super);
    function Statement() {
        _super.apply(this, arguments);
    }
    return Statement;
}(AstNode));
var Expression = (function (_super) {
    __extends(Expression, _super);
    function Expression() {
        _super.apply(this, arguments);
    }
    return Expression;
}(AstNode));
var ListDeclaration = (function (_super) {
    __extends(ListDeclaration, _super);
    function ListDeclaration() {
        _super.apply(this, arguments);
    }
    return ListDeclaration;
}(Expression));
var ArrayRefDeclaration = (function (_super) {
    __extends(ArrayRefDeclaration, _super);
    function ArrayRefDeclaration() {
        _super.apply(this, arguments);
    }
    return ArrayRefDeclaration;
}(Expression));
var Unit = (function (_super) {
    __extends(Unit, _super);
    function Unit() {
        _super.apply(this, arguments);
    }
    return Unit;
}(AstNode));
var PackageDeclaration = (function (_super) {
    __extends(PackageDeclaration, _super);
    function PackageDeclaration() {
        _super.apply(this, arguments);
    }
    return PackageDeclaration;
}(Statement));
var VariableDeclarationStatement = (function (_super) {
    __extends(VariableDeclarationStatement, _super);
    function VariableDeclarationStatement() {
        _super.apply(this, arguments);
    }
    return VariableDeclarationStatement;
}(Statement));
var SimpleName = (function (_super) {
    __extends(SimpleName, _super);
    function SimpleName() {
        _super.apply(this, arguments);
    }
    return SimpleName;
}(Expression));
var VariableDeclarationExpression = (function (_super) {
    __extends(VariableDeclarationExpression, _super);
    function VariableDeclarationExpression() {
        _super.apply(this, arguments);
    }
    return VariableDeclarationExpression;
}(Expression));
var SubroutineDeclaration = (function (_super) {
    __extends(SubroutineDeclaration, _super);
    function SubroutineDeclaration() {
        _super.apply(this, arguments);
    }
    return SubroutineDeclaration;
}(Statement));
var ExpressionStatement = (function (_super) {
    __extends(ExpressionStatement, _super);
    function ExpressionStatement() {
        _super.apply(this, arguments);
    }
    return ExpressionStatement;
}(Statement));
var UseStatement = (function (_super) {
    __extends(UseStatement, _super);
    function UseStatement() {
        _super.apply(this, arguments);
    }
    return UseStatement;
}(Statement));
var PackageName = (function (_super) {
    __extends(PackageName, _super);
    function PackageName() {
        _super.apply(this, arguments);
    }
    return PackageName;
}(AstNode));
