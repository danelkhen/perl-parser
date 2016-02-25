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
    Parser.prototype.parseBracedStatements = function (node, skipLastOptionalSemicolon) {
        this.expect(TokenTypes.braceOpen, node);
        this.nextNonWhitespaceToken(node);
        var statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose, node);
        this.nextNonWhitespaceToken(node);
        if (skipLastOptionalSemicolon && this.token.is(TokenTypes.semicolon))
            this.nextNonWhitespaceToken(node);
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
        else if (this.token.isKeyword("BEGIN"))
            return this.parseBegin();
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
        else if (this.token.is(TokenTypes.identifier) && this.reader.getNextNonWhitespaceToken().is(TokenTypes.colon)) {
            var label = this.parseLabel();
            var st = this.parseStatement();
            var st2 = st;
            st2.label = label; //TODO:
            return st;
        }
        else if (this.token.isKeyword("foreach"))
            return this.parseForEachStatement();
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
    Parser.prototype.parseBegin = function () {
        this.expectIdentifier();
        var node = this.create(BeginBlock);
        this.nextNonWhitespaceToken();
        node.statements = this.parseBracedStatements(node, true);
        return node;
    };
    Parser.prototype.parseLabel = function () {
        //let node = this.create(SimpleName);
        //node.name = this.token.value.substr(0, this.token.value.length-1).trim();
        var node = this.parseSimpleName();
        this.expect(TokenTypes.colon, node);
        this.nextToken();
        return node;
    };
    Parser.prototype.parseForEachStatement = function () {
        this.expectKeyword("foreach");
        var node = this.create(ForEachStatement);
        this.nextNonWhitespaceToken(node);
        if (this.token.isKeyword("my"))
            this.nextNonWhitespaceToken(node);
        if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variable = this.createExpressionParser().parseMemberExpression(); // .parseNonBinaryExpression();
            this.nextNonWhitespaceToken(node);
        }
        node.list = this.createExpressionParser().parseParenthesizedList();
        this.skipWhitespaceAndComments(node);
        node.statements = this.parseBracedStatements(node);
        return node;
    };
    Parser.prototype.parseEndStatement = function () {
        this.expectKeyword("__END__");
        var node = this.create(EndStatement);
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
            node = this.create(IfStatement);
        else if (this.token.isKeyword("elsif"))
            node = this.create(ElsifStatement);
        else
            throw new Error();
        this.nextNonWhitespaceToken(node);
        this.expect(TokenTypes.parenOpen, node);
        this.nextNonWhitespaceToken(node);
        node.expression = this.parseExpression();
        this.expect(TokenTypes.parenClose, node);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseBracedStatements(node, true);
        this.skipWhitespaceAndComments(node);
        if (this.token.isKeyword("elsif") || this.token.isKeyword("else"))
            node.else = this.parseStatement();
        return node;
    };
    Parser.prototype.parseElseStatement = function () {
        this.expectKeyword("else");
        var node = this.create(ElseStatement);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseBracedStatements(node);
        return node;
    };
    Parser.prototype.parseStatementEnd = function (node, semicolonIsOptional) {
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.braceClose))
            return;
        if (!this.token.is(TokenTypes.semicolon) && semicolonIsOptional)
            return;
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return;
    };
    Parser.prototype.parseReturnStatement = function () {
        this.expectKeyword("return");
        var node = this.create(ReturnStatement);
        this.nextNonWhitespaceToken(node);
        if (!this.token.is(TokenTypes.semicolon))
            node.expression = this.parseExpression();
        this.parseStatementEnd(node);
        return node;
    };
    Parser.prototype.parseExpressionStatement = function () {
        console.log("parseExpressionStatement", this.token);
        var node = this.create(ExpressionStatement);
        node.expression = this.parseExpression();
        if (node.expression == null)
            throw new Error();
        this.parseStatementEnd(node, node.expression instanceof BlockExpression);
        return node;
    };
    Parser.prototype.parseSubroutineDeclaration = function () {
        console.log("parseSubroutineDeclaration", this.token);
        var node = this.create(SubroutineDeclaration);
        this.nextNonWhitespaceToken(node);
        if (this.token.is(TokenTypes.identifier)) {
            node.name = this.parseSimpleName();
            this.nextNonWhitespaceToken(node);
        }
        if (this.token.is(TokenTypes.colon)) {
            this.nextNonWhitespaceToken(node);
            node.attribute = this.parseSimpleName();
            this.nextNonWhitespaceToken(node);
        }
        this.expect(TokenTypes.braceOpen, node);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose, node);
        this.nextToken();
        return node;
    };
    Parser.prototype.parseVariableDeclarationStatement = function () {
        var node = this.create(VariableDeclarationStatement);
        node.declaration = this.parseVariableDeclarationExpression();
        this.expect(TokenTypes.semicolon, node);
        this.nextToken();
        return node;
    };
    Parser.prototype.parseVariableDeclarationExpression = function () {
        var node = this.create(VariableDeclarationExpression);
        if (!this.token.isKeyword("my"))
            return this.onUnexpectedToken();
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.parenOpen)) {
            node.variables = this.createExpressionParser().parseParenthesizedList();
        }
        else if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variables = this.createExpressionParser().parseMemberExpression();
        }
        else {
            this.logger.error("unexpected token in VariableDeclarationExpression", this.token);
        }
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
        var node = this.create(PackageDeclaration);
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
        var node = this.create(UseStatement);
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.nextToken();
        node.module = this.createExpressionParser().parseNonBinaryExpression(); // this.parseMemberExpression();
        if (!this.token.is(TokenTypes.semicolon))
            node.list = this.parseExpression();
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
        parser.parser = this;
        return parser;
    };
    return Parser;
}(ParserBase));
