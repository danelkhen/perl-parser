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
        var whitespaceBefore = this.skipWhitespaceAndComments();
        var node = this._parseStatement();
        node.whitespaceBefore = whitespaceBefore;
        node.whitespaceAfter = this.skipWhitespaceAndComments();
        return node;
    };
    Parser.prototype._parseStatement = function () {
        if (this.token.isKeyword("package"))
            return this.parsePackageDeclaration();
        else if (this.token.is(TokenTypes.semicolon))
            return this.parseEmptyStatement();
        else if (this.token.isKeyword("BEGIN"))
            return this.parseBeginStatement();
        else if (this.token.isAnyKeyword(["use", "no"]))
            return this.parseUseOrNoStatement();
        else if (this.token.isAnyKeyword(["my", "our", "local"]))
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
    Parser.prototype.parseEmptyStatement = function () {
        var node = this.create(EmptyStatement);
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    };
    Parser.prototype.parseBeginStatement = function () {
        var node = this.create(BeginStatement);
        node.beginToken = this.expectKeyword("BEGIN");
        node.beginTokenPost = this.nextNonWhitespaceToken(node);
        node.block = this.parseBlock();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    };
    Parser.prototype.parseOptionalSemicolon = function () {
        if (this.token == null || !this.token.is(TokenTypes.semicolon))
            return null;
        var token = this.token;
        this.nextToken();
        return token;
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
        node.forEachToken = this.token;
        node.forEachTokenPost = this.nextNonWhitespaceToken(node);
        if (this.token.isKeyword("my")) {
            node.variable = this.createExpressionParser().parseVariableDeclarationExpression();
            node.variablePost = this.skipWhitespaceAndComments(node);
        }
        else if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variable = this.createExpressionParser().parseMemberExpression(null, false); // .parseNonBinaryExpression();
            node.variablePost = this.skipWhitespaceAndComments(node);
        }
        //TODO: parenthases ?
        node.list = this.createExpressionParser().parseParenthesizedList();
        node.listPost = this.skipWhitespaceAndComments(node);
        node.block = this.parseBlock();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    };
    Parser.prototype.parseForStatement = function () {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        var node = this.create(ForStatement);
        node.forToken = this.token;
        node.forTokenPost = this.nextNonWhitespaceToken(node);
        node.parenOpenToken = this.expect(TokenTypes.parenOpen, node);
        node.parenOpenTokenPost = this.nextNonWhitespaceToken();
        node.initializer = this.parseExpression();
        node.semicolon1Token = this.expect(TokenTypes.semicolon, node);
        node.semicolon1TokenPost = this.nextNonWhitespaceToken(node);
        node.condition = this.parseExpression();
        node.semicolon2Token = this.expect(TokenTypes.semicolon, node);
        node.semicolon2TokenPost = this.nextNonWhitespaceToken(node);
        node.iterator = this.parseExpression();
        node.parenCloseToken = this.expect(TokenTypes.parenClose);
        node.parenCloseTokenPost = this.nextNonWhitespaceToken(node);
        node.block = this.parseBlock();
        node.semicolonToken = this.parseOptionalSemicolon();
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
        var node = this.create(EndStatement);
        node.endToken = this.expectKeyword("__END__");
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
        node.keywordToken = this.token;
        node.keywordTokenPost = this.nextNonWhitespaceToken(node);
        node.parenOpenToken = this.expect(TokenTypes.parenOpen, node);
        node.parenOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.expression = this.parseExpression();
        node.parenCloseToken = this.expect(TokenTypes.parenClose, node);
        node.parenCloseTokenPost = this.nextNonWhitespaceToken(node);
        node.block = this.parseBlock();
        //node.block this.parseBracedStatements(node, true);
        node.blockPost = this.skipWhitespaceAndComments(node);
        if (this.token == null)
            return node;
        if (this.token.isKeyword("elsif") || this.token.isKeyword("else"))
            node.else = this.parseStatement();
        else
            node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    };
    Parser.prototype.parseElseStatement = function () {
        var node = this.create(ElseStatement);
        node.keywordToken = this.expectKeyword("else");
        node.keywordTokenPost = this.nextNonWhitespaceToken(node);
        node.block = this.parseBlock();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    };
    Parser.prototype.parseExpressionStatement = function () {
        console.log("parseExpressionStatement", this.token);
        var node = this.create(ExpressionStatement);
        node.expression = this.parseExpression();
        if (node.expression == null)
            throw new Error();
        node.expressionPost = this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.braceClose))
            return node;
        var semicolonIsOptional = node.expression instanceof Block;
        if (!this.token.is(TokenTypes.semicolon) && semicolonIsOptional)
            return node;
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    };
    //parseStatementEnd(node: Statement & HasSemicolonToken, semicolonIsOptional?: boolean) {
    //    node.semicolonTokenPre = this.skipWhitespaceAndComments();
    //    if (this.token.is(TokenTypes.braceClose))   //last statement doesn't have to have semicolon
    //        return;
    //    if (!this.token.is(TokenTypes.semicolon) && semicolonIsOptional)  //allow scope blocks to end with a closing brace but without semicolon
    //        return;
    //    node.semicolonToken = this.expect(TokenTypes.semicolon);
    //    this.nextToken();
    //}
    Parser.prototype.parseSubroutineDeclaration = function () {
        console.log("parseSubroutineDeclaration", this.token);
        var node = this.create(SubroutineDeclaration);
        node.declaration = this.createExpressionParser().parseSubroutineExpression();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    };
    Parser.prototype.parseVariableDeclarationStatement = function () {
        var node = this.create(VariableDeclarationStatement);
        node.declaration = this.createExpressionParser().parseVariableDeclarationExpression();
        node.semicolonToken = this.expect(TokenTypes.semicolon, node);
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
        var node = this.create(PackageDeclaration);
        node.packageToken = this.expectKeyword("package");
        node.statements = [];
        this.nextToken();
        node.packageTokenPost = this.expectAndSkipWhitespace();
        this.expect(TokenTypes.identifier);
        node.name = this.parseMemberExpression();
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        node.semicolonTokenPost = this.nextNonWhitespaceToken();
        node.statements = this.parseStatementsUntil();
        return node;
    };
    Parser.prototype.parseUseOrNoStatement = function () {
        var node;
        if (this.token.isKeyword("use"))
            node = this.create(UseStatement);
        else if (this.token.isKeyword("no"))
            node = this.create(NoStatement);
        else
            throw new Error();
        node.useToken = this.token;
        this.nextToken();
        node.useTokenPost = this.expectAndSkipWhitespace();
        //this.nextToken();
        node.module = this.createExpressionParser().parseNonBinaryExpression();
        node.modulePostTokens = this.skipWhitespaceAndComments();
        if (!this.token.is(TokenTypes.semicolon)) {
            node.list = this.createExpressionParser().parseOptionallyParenthesizedList(); //.parseExpression();
        }
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        node.semicolonTokenPost = this.nextNonWhitespaceToken();
        return node;
    };
    Parser.prototype.parseBlock = function () {
        var node = this.create(Block);
        node.whitespaceBefore = this.skipWhitespaceAndComments();
        node.braceOpenToken = this.expect(TokenTypes.braceOpen);
        node.braceOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.statements = this.parseStatementsUntil(TokenTypes.braceClose);
        node.braceCloseToken = this.expect(TokenTypes.braceClose, node);
        node.whitespaceAfter = this.nextNonWhitespaceToken(node);
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
