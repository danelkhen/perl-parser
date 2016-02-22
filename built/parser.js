var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Parser = (function (_super) {
    __extends(Parser, _super);
    function Parser() {
        _super.apply(this, arguments);
    }
    Parser.prototype.doParse = function () {
        this.nextToken();
        return this.parseStatementsUntil();
    };
    Parser.prototype.parseBracedStatements = function () {
        this.expect(TokenTypes.braceOpen);
        this.nextNonWhitespaceToken();
        var statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose);
        this.nextNonWhitespaceToken();
        return statements;
    };
    Parser.prototype.parseStatementsUntil = function (stopAtTokenType) {
        var i = 0;
        this.log("parseStatements");
        var statements = [];
        while (true) {
            i++;
            this.skipWhitespaceAndComments();
            if (stopAtTokenType && this.token.is(stopAtTokenType))
                break;
            var node = this.parseStatement();
            if (node == null)
                break;
            statements.push(node);
        }
        ;
        return statements;
    };
    Parser.prototype.parseStatement = function () {
        this.log("parseStatement");
        if (this.token == null) {
            return null;
        }
        this.skipWhitespaceAndComments();
        if (this.token.isKeyword("package"))
            return this.parsePackageDeclaration();
        else if (this.token.isKeyword("use"))
            return this.parseUse();
        else if (this.token.isKeyword("my"))
            return this.parseVariableDeclarationStatement();
        else if (this.token.isKeyword("sub"))
            return this.parseSubroutineDeclaration();
        else if (this.token.isKeyword("return"))
            return this.parseReturnStatement();
        else if (this.token.isKeyword("if"))
            return this.parseIfStatement();
        else if (this.token.isKeyword("elsif"))
            return this.parseElsifStatement();
        else if (this.token.isKeyword("else"))
            return this.parseElseStatement();
        else if (this.token.isKeyword("__END__"))
            return this.parseEndStatement();
        else if (this.token.is(TokenTypes.pod))
            return null;
        return this.parseExpressionStatement();
    };
    //parsePod() {
    //    let node = new Comment();
    //    node.token = this.token;
    //    return node;
    //}
    Parser.prototype.parseEndStatement = function () {
        this.expectKeyword("__END__");
        var node = new EndStatement();
        node.token = this.token;
        this.nextToken();
        return node;
    };
    Parser.prototype.parseIfStatement = function () {
        return this.parseIfOrElsifStatement();
    };
    Parser.prototype.parseElsifStatement = function () {
        return this.parseIfOrElsifStatement();
    };
    Parser.prototype.parseIfOrElsifStatement = function () {
        var node;
        if (this.token.isKeyword("if"))
            node = new IfStatement();
        else if (this.token.isKeyword("elsif"))
            node = new IfStatement();
        else
            throw new Error();
        node.token = this.token;
        this.nextNonWhitespaceToken();
        this.expect(TokenTypes.parenOpen);
        this.nextNonWhitespaceToken();
        node.expression = this.parseExpression();
        this.expect(TokenTypes.parenClose);
        this.nextNonWhitespaceToken();
        node.statements = this.parseBracedStatements();
        this.skipWhitespaceAndComments();
        if (this.token.isKeyword("elsif") || this.token.isKeyword("else"))
            node.else = this.parseStatement();
        return node;
    };
    Parser.prototype.parseElseStatement = function () {
        this.expectKeyword("else");
        var node = new ElseStatement();
        node.token = this.token;
        this.nextNonWhitespaceToken();
        node.statements = this.parseBracedStatements();
        return node;
    };
    Parser.prototype.parseStatementEnd = function () {
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.braceClose))
            return;
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return;
    };
    Parser.prototype.parseReturnStatement = function () {
        this.expect(TokenTypes.keyword, "return");
        var node = new ReturnStatement();
        node.token = this.token;
        this.nextNonWhitespaceToken();
        node.expression = this.parseExpression();
        this.parseStatementEnd();
        return node;
    };
    Parser.prototype.parseExpressionStatement = function () {
        console.log("parseExpressionStatement", this.token);
        var node = new ExpressionStatement();
        node.token = this.token;
        node.expression = this.parseExpression();
        this.parseStatementEnd();
        return node;
    };
    Parser.prototype.parseSubroutineDeclaration = function () {
        console.log("parseSubroutineDeclaration", this.token);
        var node = new SubroutineDeclaration();
        node.token = this.token;
        this.nextNonWhitespaceToken();
        if (this.token.is(TokenTypes.identifier)) {
            node.name = this.parseSimpleName();
            this.nextNonWhitespaceToken();
        }
        this.expect(TokenTypes.braceOpen);
        this.nextNonWhitespaceToken();
        node.statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose);
        this.nextToken();
        return node;
    };
    Parser.prototype.parseVariableDeclarationStatement = function () {
        var node = new VariableDeclarationStatement();
        node.token = this.token;
        node.declaration = this.parseVariableDeclarationExpression();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    };
    Parser.prototype.parseVariableDeclarationExpression = function () {
        var node = new VariableDeclarationExpression();
        node.token = this.token;
        if (!this.token.isKeyword("my"))
            return this.onUnexpectedToken();
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.skipWhitespaceAndComments();
        node.variables = this.parseExpression();
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.assignment)) {
            this.nextToken();
            this.skipWhitespaceAndComments();
            node.initializer = this.parseExpression();
        }
        return node;
    };
    Parser.prototype.parseSimpleName = function () {
        var node = new SimpleName();
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    };
    Parser.prototype.parsePackageDeclaration = function () {
        this.log("parsePackage");
        var node = new PackageDeclaration();
        node.token = this.token;
        node.statements = [];
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.nextToken();
        this.expect(TokenTypes.identifier);
        node.name = this.parseMemberExpression();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        node.statements = this.parseStatementsUntil();
        return node;
    };
    Parser.prototype.parseUse = function () {
        var node = new UseStatement();
        node.token = this.token;
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.nextToken();
        node.packageName = this.parseMemberExpression();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    };
    Parser.prototype.parseExpression = function () { return this.createExpressionParser().parseExpression(); };
    Parser.prototype.parseMemberExpression = function () {
        var node = this.parseExpression();
        if (node instanceof MemberExpression)
            return node;
        throw new Error();
    };
    Parser.prototype.createExpressionParser = function () {
        var parser = new ExpressionParser();
        parser.logger = this.logger;
        parser.reader = this.reader;
        return parser;
    };
    return Parser;
}(ParserBase));
