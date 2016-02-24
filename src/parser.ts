class Parser extends ParserBase {

    public doParse(): Statement[] {
        this.nextToken();
        return this.parseStatementsUntil();
    }


    parseBracedStatements(node:AstNode): Statement[] {
        this.expect(TokenTypes.braceOpen, node);
        this.nextNonWhitespaceToken(node);
        let statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose, node);
        this.nextNonWhitespaceToken(node);
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
        let node = this.create(EndStatement);
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
        node.statements = this.parseBracedStatements(node);
        this.skipWhitespaceAndComments(node);
        if (this.token.isKeyword("elsif") || this.token.isKeyword("else"))
            node.else = this.parseStatement();
        return node;
    }

    parseElseStatement(): ElseStatement {
        this.expectKeyword("else");
        let node = this.create(ElseStatement);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseBracedStatements(node);
        return node;
    }
    parseStatementEnd(node:Statement) {
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.braceClose))   //last statement doesn't have to have semicolon
            return;
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return;
    }
    parseReturnStatement(): ReturnStatement {
        this.expectKeyword("return");
        let node = this.create(ReturnStatement);
        this.nextNonWhitespaceToken(node);
        node.expression = this.parseExpression();
        this.parseStatementEnd(node);
        return node;
    }
    parseExpressionStatement(): ExpressionStatement {
        console.log("parseExpressionStatement", this.token);
        let node = this.create(ExpressionStatement);
        node.expression = this.parseExpression();
        this.parseStatementEnd(node);
        return node;
    }
    parseSubroutineDeclaration(): SubroutineDeclaration {
        console.log("parseSubroutineDeclaration", this.token);
        let node = this.create(SubroutineDeclaration);
        this.nextNonWhitespaceToken(node);
        if (this.token.is(TokenTypes.identifier)) {
            node.name = this.parseSimpleName();
            this.nextNonWhitespaceToken(node);
        }
        this.expect(TokenTypes.braceOpen, node);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose, node);
        this.nextToken();
        return node;
    }
    parseVariableDeclarationStatement() {
        let node = this.create(VariableDeclarationStatement);
        node.declaration = this.parseVariableDeclarationExpression();
        this.expect(TokenTypes.semicolon, node);
        this.nextToken();
        return node;
    }

    parseVariableDeclarationExpression() {
        let node = this.create(VariableDeclarationExpression);
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
        let node = this.create(PackageDeclaration);
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
        let node = this.create(UseStatement);
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


