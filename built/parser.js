var Parser = (function () {
    function Parser() {
        this.tokenIndex = -1;
        this.errors = 0;
    }
    Parser.prototype.nextToken = function () {
        this.tokenIndex++;
        this.token = this.tokens[this.tokenIndex];
    };
    Parser.prototype.nextNonWhitespaceToken = function () {
        this.nextToken();
        this.skipWhitespaceAndComments();
    };
    Parser.prototype.doParse = function () {
        this.nextToken();
        return this.parseStatements();
    };
    Parser.prototype.parseStatements = function () {
        this.log("parseStatements");
        var statements = [];
        var node = this.parseStatement();
        while (node != null) {
            statements.push(node);
            node = this.parseStatement();
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
        if (this.token.isKeyword("package")) {
            return this.parsePackage();
        }
        else if (this.token.isKeyword("use")) {
            return this.parseUse();
        }
        else if (this.token.isKeyword("my")) {
            return this.parseVariableDeclarationStatement();
        }
        //else if (this.token.isKeyword("sub")) {
        //    return this.parseSubroutineDeclaration();
        //}
        return this.parseExpressionStatement();
        this.error("not implemented - parseStatement", this.token);
        return null;
    };
    Parser.prototype.parseExpressionStatement = function () {
        var node = new ExpressionStatement();
        node.token = this.token;
        node.expression = this.parseExpression();
        if (node.token.is(TokenTypes.semicolon))
            this.nextToken();
        return node;
    };
    Parser.prototype.parseSubroutineDeclaration = function () {
        var node = new SubroutineDeclaration();
        node.token = this.token;
        this.nextNonWhitespaceToken();
        if (this.token.is(TokenTypes.identifier)) {
            node.name = this.parseSimpleName();
            this.nextNonWhitespaceToken();
        }
        this.expect(TokenTypes.braceOpen);
        this.nextNonWhitespaceToken();
        node.statements = this.parseStatements();
        this.expect(TokenTypes.bracketClose);
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
        if (!this.token.is(TokenTypes.sigiledIdentifier)) {
            return this.onUnexpectedToken();
        }
        this.skipWhitespaceAndComments();
        node.name = this.parseSimpleName();
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.equals)) {
            this.nextToken();
            this.skipWhitespaceAndComments();
            node.initializer = this.parseExpression();
        }
        return node;
    };
    Parser.prototype.skipWhitespaceAndComments = function () {
        while (this.token != null && (this.token.is(TokenTypes.whitespace) || this.token.is(TokenTypes.comment)))
            this.nextToken();
    };
    Parser.prototype.parseSimpleName = function () {
        var node = new SimpleName();
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    };
    Parser.prototype.parseExpression = function () {
        if (this.token.is(TokenTypes.bracketOpen)) {
            return this.parseArrayRefDeclaration();
        }
        if (this.token.is(TokenTypes.parenOpen)) {
            return this.parseList();
        }
        var node = new Expression();
        node.token = this.token;
        this.nextToken();
        return node;
    };
    Parser.prototype.parseArrayRefDeclaration = function () {
        this.expect(TokenTypes.bracketOpen);
        var node = new ArrayRefDeclaration();
        node.token = this.token;
        node.items = [];
        this.nextNonWhitespaceToken();
        while (this.token != null) {
            node.items.push(this.parseExpression());
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.bracketClose))
                break;
            this.expect(TokenTypes.comma);
            this.nextNonWhitespaceToken();
            if (this.token.is(TokenTypes.bracketClose))
                break;
        }
        this.nextToken();
        return node;
    };
    Parser.prototype.parseList = function () {
        this.expect(TokenTypes.parenOpen);
        var node = new ListDeclaration();
        node.token = this.token;
        node.items = [];
        this.nextNonWhitespaceToken();
        while (this.token != null) {
            node.items.push(this.parseExpression());
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.parenClose))
                break;
            this.expect(TokenTypes.comma);
            this.nextNonWhitespaceToken();
            if (this.token.is(TokenTypes.parenClose))
                break;
        }
        this.nextToken();
        return node;
    };
    Parser.prototype.parsePackage = function () {
        this.log("parsePackage");
        var node = new PackageDeclaration();
        node.token = this.token;
        node.statements = [];
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.nextToken();
        this.expect(TokenTypes.identifier);
        node.name = this.parsePackageName();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        node.statements = this.parseStatements();
        return node;
    };
    Parser.prototype.parseUse = function () {
        var node = new UseStatement();
        node.token = this.token;
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.nextToken();
        node.packageName = this.parsePackageName();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    };
    Parser.prototype.parsePackageName = function () {
        this.log("parsePackageName");
        var node = new PackageName();
        node.token = this.token;
        node.name = "";
        while (true) {
            if (this.token.is(TokenTypes.identifier)) {
                node.name += this.token.value;
                this.nextToken();
            }
            else if (this.token.is(TokenTypes.packageSeparator)) {
                node.name += this.token.value;
                this.nextToken();
            }
            else {
                break;
            }
        }
        return node;
    };
    Parser.prototype.onUnexpectedToken = function () {
        this.error("unexecpted token type", this.token);
        return null;
    };
    Parser.prototype.expect = function (type) {
        this.log("expect", type);
        if (!this.token.is(type))
            this.onUnexpectedToken();
    };
    Parser.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        console.log.apply(console, args);
    };
    Parser.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.errors++;
        //if(this.errors>10)
        //    throw new Error();
        console.error.apply(console, args);
    };
    return Parser;
}());
