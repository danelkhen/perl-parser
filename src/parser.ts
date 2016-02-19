class Parser extends ParserBase {

    public doParse(): Statement[] {
        this.nextToken();
        return this.parseStatementsUntil();
    }



    parseStatementsUntil(stopAtTokenType?: TokenType): Statement[] {
        let i = 0;
        this.log("parseStatements");
        let statements: Statement[] = [];
        while (true) {
            i++;
            this.skipWhitespaceAndComments();
            if (stopAtTokenType && this.token.is(stopAtTokenType))
                break;
            let node = this.parseStatement();
            if (node == null)
                break;
            statements.push(node);
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
            return this.parsePackageDeclaration();
        }
        else if (this.token.isKeyword("use")) {
            return this.parseUse();
        }
        else if (this.token.isKeyword("my")) {
            return this.parseVariableDeclarationStatement();
        }
        else if (this.token.isKeyword("sub")) {
            return this.parseSubroutineDeclaration();
        }
        else if (this.token.isKeyword("return")) {
            return this.parseReturnStatement();
        }
        else if (this.token.isKeyword("if")) {
            throw new Error("implement");
        }
        return this.parseExpressionStatement();
        this.error("not implemented - parseStatement", this.token);
        return null;
    }
    parseStatementEnd() {
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.braceClose))   //last statement doesn't have to have semicolon
            return;
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return;
    }
    parseReturnStatement(): ReturnStatement {
        this.expect(TokenTypes.keyword, "return");
        let node = new ReturnStatement();
        node.token = this.token;
        this.nextNonWhitespaceToken();
        node.expression = this.parseExpression();
        this.parseStatementEnd();
        return node;
    }
    parseExpressionStatement(): ExpressionStatement {
        console.log("parseExpressionStatement", this.token);
        let node = new ExpressionStatement();
        node.token = this.token;
        node.expression = this.parseExpression();
        this.parseStatementEnd();
        return node;
    }
    parseSubroutineDeclaration(): SubroutineDeclaration {
        console.log("parseSubroutineDeclaration", this.token);
        let node = new SubroutineDeclaration();
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
        node.variables = this.parseExpression();
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.equals)) {   //TODO: doesn't work, variables are evaluated to a binary expression (assignment)
            this.nextToken();
            this.skipWhitespaceAndComments();
            node.initializer = this.parseExpression();
        }
        return node;
    }
    parseSimpleName(): SimpleName {
        let node = new SimpleName();
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    }
    parsePackageDeclaration(): PackageDeclaration {
        this.log("parsePackage");
        let node = new PackageDeclaration();
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
    }
    parseUse(): UseStatement {
        let node = new UseStatement();
        node.token = this.token;
        this.nextToken();
        this.expect(TokenTypes.whitespace);
        this.nextToken();
        node.packageName = this.parseMemberExpression();
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    }
    parseExpression(): Expression { return this.createExpressionParser().parseExpression(); }
    parseMemberExpression(): MemberExpression {
        let node = this.parseExpression();
        if (node instanceof MemberExpression)
            return node;
        throw new Error();
    }

    createExpressionParser(): ExpressionParser {
        let parser = new ExpressionParser();
        parser.logger = this.logger;
        parser.reader = this.reader;
        return parser;
    }





}


