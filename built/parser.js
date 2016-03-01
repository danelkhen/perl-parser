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
        var _this = this;
        this.nextToken();
        var statements = [];
        safeTry(function () { return _this.parseStatementsUntil(null, statements); }).catch(function (e) { return console.error("parse error", e); });
        return statements;
    };
    Parser.prototype.parseBracedStatements = function (node, skipLastOptionalSemicolon) {
        this.expect(TokenTypes.braceOpen, node);
        this.nextNonWhitespaceToken(node);
        var statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose, node);
        this.nextNonWhitespaceToken(node);
        if (skipLastOptionalSemicolon && (this.token == null || this.token.is(TokenTypes.semicolon)))
            this.nextNonWhitespaceToken(node);
        return statements;
    };
    Parser.prototype.parseStatementsUntil = function (stopAtTokenType, statements) {
        var i = 0;
        this.log("parseStatements");
        if (statements == null)
            statements = [];
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
        else if (this.token.isAnyKeyword(["if", "unless"]))
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
        else if (this.token.isAnyKeyword(["foreach", "for"]))
            return this.parseForEachOrForStatement();
        else if (this.token.isKeyword("while"))
            return this.parseWhileStatement();
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
        this.expectKeyword("BEGIN");
        var node = this.create(BeginBlock);
        this.nextNonWhitespaceToken(node);
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
    Parser.prototype.isForStatement = function () {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        var tokenIndex = this.reader.tokenIndex;
        this.nextNonWhitespaceToken();
        if (this.token.isKeyword("my"))
            this.nextNonWhitespaceToken();
        if (this.token.is(TokenTypes.sigiledIdentifier)) {
            this.createExpressionParser().parseMemberExpression(null, false);
            this.skipWhitespaceAndComments();
        }
        this.expect(TokenTypes.parenOpen);
        this.nextNonWhitespaceToken();
        var exp = this.parseExpression();
        this.skipWhitespaceAndComments();
        var hasSemicolon = this.token.is(TokenTypes.semicolon);
        this.reader.goto(tokenIndex);
        return hasSemicolon;
    };
    Parser.prototype.parseForEachOrForStatement = function () {
        if (!this.token.isAnyKeyword(["foreach", "for"])) {
            this.error();
            return null;
        }
        if (this.isForStatement())
            return this.parseForStatement();
        return this.parseForEachStatement();
    };
    Parser.prototype.parseForEachStatement = function () {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        var node = this.create(ForEachStatement);
        this.nextNonWhitespaceToken(node);
        if (this.token.isKeyword("my")) {
            node.variable = this.createExpressionParser().parseVariableDeclarationExpression();
        }
        else if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variable = this.createExpressionParser().parseMemberExpression(null, false); // .parseNonBinaryExpression();
        }
        this.skipWhitespaceAndComments(node);
        this.expect(TokenTypes.parenOpen, node);
        node.list = this.createExpressionParser().parseParenthesizedList();
        this.skipWhitespaceAndComments(node);
        node.statements = this.parseBracedStatements(node, true);
        return node;
    };
    Parser.prototype.parseForStatement = function () {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        var node = this.create(ForStatement);
        this.nextNonWhitespaceToken(node);
        this.expect(TokenTypes.parenOpen, node);
        this.nextNonWhitespaceToken();
        node.initializer = this.parseExpression();
        this.expect(TokenTypes.semicolon, node);
        this.nextNonWhitespaceToken(node);
        node.condition = this.parseExpression();
        this.expect(TokenTypes.semicolon, node);
        this.nextNonWhitespaceToken(node);
        node.iterator = this.parseExpression();
        this.expect(TokenTypes.parenClose);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseBracedStatements(node);
        return node;
    };
    Parser.prototype.parseWhileStatement = function () {
        this.expectKeyword("while");
        var node = this.create(WhileStatement);
        this.nextNonWhitespaceToken(node);
        this.expect(TokenTypes.parenOpen, node);
        this.nextNonWhitespaceToken(node);
        node.condition = this.parseExpression();
        this.skipWhitespaceAndComments(node);
        this.expect(TokenTypes.parenClose);
        this.nextNonWhitespaceToken(node);
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
        return this.parseIfOrElsifOrUnlessStatement();
    };
    Parser.prototype.parseElsifStatement = function () {
        return this.parseIfOrElsifOrUnlessStatement();
    };
    Parser.prototype.parseIfOrElsifOrUnlessStatement = function () {
        var node;
        if (this.token.isKeyword("if"))
            node = this.create(IfStatement);
        else if (this.token.isKeyword("elsif"))
            node = this.create(ElsifStatement);
        else if (this.token.isKeyword("unless"))
            node = this.create(UnlessStatement);
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
        if (this.token == null)
            return node;
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
        node.declaration = this.createExpressionParser().parseSubroutineExpression();
        return node;
    };
    Parser.prototype.parseVariableDeclarationStatement = function () {
        var node = this.create(VariableDeclarationStatement);
        node.declaration = this.createExpressionParser().parseVariableDeclarationExpression();
        this.expect(TokenTypes.semicolon, node);
        this.nextToken();
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
        this.expectKeyword("package");
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
