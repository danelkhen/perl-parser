class Parser {
    tokenizer: Tokenizer;
    tokens: Token[];
    //    node: AstNode;
    token: Token;
    unit: Unit
    tokenIndex = -1;
    nextToken() {
        this.tokenIndex++;
        this.token = this.tokens[this.tokenIndex];
    }
    nextNonWhitespaceToken() {
        this.nextToken();
        this.skipWhitespaceAndComments();
    }

    doParse(): Statement[] {
        this.nextToken();
        return this.parseStatements();
    }

    parseStatements(): Statement[] {
        this.log("parseStatements");
        let statements: Statement[] = [];
        let node = this.parseStatement();
        while (node != null) {
            statements.push(node);
            node = this.parseStatement();
        };
        return statements;
    }
    parseStatement(): AstNode {
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
    }
    parseExpressionStatement(): ExpressionStatement {
        let node = new ExpressionStatement();
        node.token = this.token;
        node.expression = this.parseExpression();
        if (node.token.is(TokenTypes.semicolon))  //semicolon is optional sometimes, TODO: is it only for last statement?
            this.nextToken();
        return node;
    }
    parseSubroutineDeclaration(): SubroutineDeclaration {
        let node = new SubroutineDeclaration();
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
    }
    parseVariableDeclarationStatement() {
        let node = new VariableDeclarationStatement();
        node.token = this.token;
        node.declaration = this.parseVariableDeclarationExpression();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    }

    parseVariableDeclarationExpression() {
        let node = new VariableDeclarationExpression();
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
    }
    skipWhitespaceAndComments() {
        while (this.token != null && (this.token.is(TokenTypes.whitespace) || this.token.is(TokenTypes.comment)))
            this.nextToken();
    }
    parseSimpleName(): SimpleName {
        let node = new SimpleName();
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    }
    parseExpression(): Expression {
        if (this.token.is(TokenTypes.bracketOpen)) {
            return this.parseArrayRefDeclaration();
        }
        if (this.token.is(TokenTypes.parenOpen)) {
            return this.parseList();
        }
        let node = new Expression();
        node.token = this.token;
        this.nextToken();
        return node;
    }
    parseArrayRefDeclaration(): ArrayRefDeclaration {
        this.expect(TokenTypes.bracketOpen);
        let node = new ArrayRefDeclaration();
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
    }
    parseList(): ListDeclaration {
        this.expect(TokenTypes.parenOpen);
        let node = new ListDeclaration();
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
    }
    parsePackage(): PackageDeclaration {
        this.log("parsePackage");
        let node = new PackageDeclaration();
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
    }
    parseUse(): UseStatement {
        let node = new UseStatement();
        node.token = this.token;
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.nextToken();
        node.packageName = this.parsePackageName();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;

    }
    parsePackageName(): PackageName {
        this.log("parsePackageName");
        let node = new PackageName();
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
    }


    onUnexpectedToken(): any {
        this.error("unexecpted token type", this.token);
        return null;
    }
    expect(type: TokenType) {
        this.log("expect", type);
        if (!this.token.is(type))
            this.onUnexpectedToken();
    }
    log(...args) {
        console.log.apply(console, args);
    }
    errors = 0;
    error(...args) {
        this.errors++;
        //if(this.errors>10)
        //    throw new Error();
        console.error.apply(console, args);
    }
}

