"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AstNode = (function () {
    function AstNode() {
        this.tokens = [];
    }
    AstNode.prototype.getChildNodes = function () {
        var _this = this;
        var list = [];
        Object.keys(this).forEach(function (key) {
            var value = _this[key];
            if (value == null)
                return;
            if (value instanceof AstNode)
                list.add(value);
            else if (value instanceof Array)
                list.addRange(value.where(function (t) { return t instanceof AstNode; }));
        });
        return list;
    };
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
var RegexExpression = (function (_super) {
    __extends(RegexExpression, _super);
    function RegexExpression() {
        _super.apply(this, arguments);
    }
    return RegexExpression;
}(Expression));
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
var MemberExpression = (function (_super) {
    __extends(MemberExpression, _super);
    function MemberExpression() {
        _super.apply(this, arguments);
    }
    return MemberExpression;
}(Expression));
var HashMemberAccessExpression = (function (_super) {
    __extends(HashMemberAccessExpression, _super);
    function HashMemberAccessExpression() {
        _super.apply(this, arguments);
    }
    return HashMemberAccessExpression;
}(Expression));
var ArrayMemberAccessExpression = (function (_super) {
    __extends(ArrayMemberAccessExpression, _super);
    function ArrayMemberAccessExpression() {
        _super.apply(this, arguments);
    }
    return ArrayMemberAccessExpression;
}(Expression));
var InvocationExpression = (function (_super) {
    __extends(InvocationExpression, _super);
    function InvocationExpression() {
        _super.apply(this, arguments);
    }
    return InvocationExpression;
}(Expression));
var BarewordExpression = (function (_super) {
    __extends(BarewordExpression, _super);
    function BarewordExpression() {
        _super.apply(this, arguments);
    }
    return BarewordExpression;
}(Expression));
var QwExpression = (function (_super) {
    __extends(QwExpression, _super);
    function QwExpression() {
        _super.apply(this, arguments);
    }
    return QwExpression;
}(Expression));
var ValueExpression = (function (_super) {
    __extends(ValueExpression, _super);
    function ValueExpression() {
        _super.apply(this, arguments);
    }
    return ValueExpression;
}(Expression));
var ReturnStatement = (function (_super) {
    __extends(ReturnStatement, _super);
    function ReturnStatement() {
        _super.apply(this, arguments);
    }
    return ReturnStatement;
}(Statement));
var EndStatement = (function (_super) {
    __extends(EndStatement, _super);
    function EndStatement() {
        _super.apply(this, arguments);
    }
    return EndStatement;
}(Statement));
var IfStatement = (function (_super) {
    __extends(IfStatement, _super);
    function IfStatement() {
        _super.apply(this, arguments);
    }
    return IfStatement;
}(Statement));
var ElsifStatement = (function (_super) {
    __extends(ElsifStatement, _super);
    function ElsifStatement() {
        _super.apply(this, arguments);
    }
    return ElsifStatement;
}(IfStatement));
var ElseStatement = (function (_super) {
    __extends(ElseStatement, _super);
    function ElseStatement() {
        _super.apply(this, arguments);
    }
    return ElseStatement;
}(Statement));
var PrefixUnaryExpression = (function (_super) {
    __extends(PrefixUnaryExpression, _super);
    function PrefixUnaryExpression() {
        _super.apply(this, arguments);
    }
    return PrefixUnaryExpression;
}(Expression));
var BinaryExpression = (function (_super) {
    __extends(BinaryExpression, _super);
    function BinaryExpression() {
        _super.apply(this, arguments);
    }
    return BinaryExpression;
}(Expression));
var Operator = (function () {
    function Operator() {
    }
    return Operator;
}());
var HashRefCreationExpression = (function (_super) {
    __extends(HashRefCreationExpression, _super);
    function HashRefCreationExpression() {
        _super.apply(this, arguments);
    }
    return HashRefCreationExpression;
}(Expression));
