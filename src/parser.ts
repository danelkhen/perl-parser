class Parser extends ParserBase {

    public doParse(): Statement[] {
        this.nextToken();
        return this.parseStatementsUntil();
    }


    parseBracedStatements(): Statement[] {
        this.expect(TokenTypes.braceOpen);
        this.nextNonWhitespaceToken();
        let statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose);
        this.nextNonWhitespaceToken();
        return statements;
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
    }
    //parsePod() {
    //    let node = new Comment();
    //    node.token = this.token;
    //    return node;
    //}

    parseEndStatement() {
        this.expectKeyword("__END__");
        let node = new EndStatement();
        node.token = this.token;
        this.nextToken();
        return node;
    }
    parseIfStatement(): IfStatement {
        return this.parseIfOrElsifStatement();
    }
    parseElsifStatement(): ElsifStatement {
        return <ElsifStatement>this.parseIfOrElsifStatement();
    }

    parseIfOrElsifStatement(): IfStatement {
        let node: IfStatement;
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
    }

    parseElseStatement(): ElseStatement {
        this.expectKeyword("else");
        let node = new ElseStatement();
        node.token = this.token;
        this.nextNonWhitespaceToken();
        node.statements = this.parseBracedStatements();
        return node;
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
        if (this.token.is(TokenTypes.assignment)) {   //TODO: doesn't work, variables are evaluated to a binary expression (assignment)
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


