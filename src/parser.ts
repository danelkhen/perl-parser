class Parser extends ParserBase {
    public doParse(): Statement[] {
        this.nextToken();
        let statements: Statement[] = [];
        safeTry(() => this.parseStatementsUntil(null, statements)).catch(e=> console.error("parse error", e));
        return statements;
    }


    parseBracedStatements(node: AstNode, skipLastOptionalSemicolon?: boolean): Statement[] {
        this.expect(TokenTypes.braceOpen, node);
        this.nextNonWhitespaceToken(node);
        let statements = this.parseStatementsUntil(TokenTypes.braceClose);
        this.expect(TokenTypes.braceClose, node);
        this.nextNonWhitespaceToken(node);
        if (skipLastOptionalSemicolon && (this.token == null || this.token.is(TokenTypes.semicolon)))    //auto-skip semicolon after braced statements
            this.nextNonWhitespaceToken(node);
        return statements;
    }


    parseStatementsUntil(stopAtTokenType?: TokenType, statements?: Statement[]): Statement[] {
        let i = 0;
        this.log("parseStatements");
        if (statements == null)
            statements = [];
        while (true) {
            i++;
            if (stopAtTokenType && this.token.is(stopAtTokenType))
                break;
            let node = this.parseStatement();
            if (node == null)
                break;
            statements.push(node);
        };
        return statements;
    }
    parseStatement(): Statement {
        this.log("parseStatement");
        if (this.token == null) {
            return null;
        }
        let whitespaceBefore = this.skipWhitespaceAndComments();
        let node = this._parseStatement();
        node.whitespaceBefore = whitespaceBefore;
        node.whitespaceAfter = this.skipWhitespaceAndComments();
        return node;
    }
    _parseStatement(): Statement {
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
            let label = this.parseLabel();
            let st = this.parseStatement();
            let st2: HasLabel = <any>st;
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
    }

    parseEmptyStatement(): EmptyStatement {
        let node  = this.create(EmptyStatement);
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    }
    parseBeginStatement(): BeginStatement {
        let node = this.create(BeginStatement);
        node.beginToken = this.expectKeyword("BEGIN");
        node.beginTokenPost = this.nextNonWhitespaceToken(node);
        node.block = this.parseBlock();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    }

    parseOptionalSemicolon(): Token {
        if (this.token == null || !this.token.is(TokenTypes.semicolon))
            return null;
        let token = this.token;
        this.nextToken();
        return token;
    }

    parseLabel(): SimpleName {
        //let node = this.create(SimpleName);
        //node.name = this.token.value.substr(0, this.token.value.length-1).trim();
        let node = this.parseSimpleName();
        this.expect(TokenTypes.colon, node);
        this.nextToken();
        return node;
    }


    isForStatement(): boolean {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        let tokenIndex = this.reader.tokenIndex;
        this.nextNonWhitespaceToken();
        if (this.token.isKeyword("my"))
            this.nextNonWhitespaceToken();
        if (this.token.is(TokenTypes.sigiledIdentifier)) {
            this.createExpressionParser().parseMemberExpression(null, false);
            this.skipWhitespaceAndComments();
        }
        this.expect(TokenTypes.parenOpen);
        this.nextNonWhitespaceToken();
        let exp = this.parseExpression();
        this.skipWhitespaceAndComments();
        let hasSemicolon = this.token.is(TokenTypes.semicolon);
        this.reader.goto(tokenIndex);
        return hasSemicolon;
    }

    parseForEachOrForStatement(): Statement {
        if (!this.token.isAnyKeyword(["foreach", "for"])) {
            this.error();
            return null;
        }
        if (this.isForStatement())
            return this.parseForStatement();
        return this.parseForEachStatement();
    }
    parseForEachStatement(): ForEachStatement {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        let node = this.create(ForEachStatement);
        node.forEachToken = this.token;
        node.forEachTokenPost = this.nextNonWhitespaceToken(node);
        if (this.token.isKeyword("my")) {
            node.variable = this.createExpressionParser().parseVariableDeclarationExpression();
            node.variablePost = this.skipWhitespaceAndComments(node);
        }
        else if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variable = this.createExpressionParser().parseMemberExpression(null, false);// .parseNonBinaryExpression();
            node.variablePost = this.skipWhitespaceAndComments(node);
        }
        //TODO: parenthases ?
        node.list = this.createExpressionParser().parseParenthesizedList();
        node.listPost = this.skipWhitespaceAndComments(node);
        node.block = this.parseBlock();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    }

    parseForStatement(): ForStatement {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        let node = this.create(ForStatement);
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
    }
    parseWhileStatement(): WhileStatement {
        this.expectKeyword("while");
        let node = this.create(WhileStatement);
        this.nextNonWhitespaceToken(node);

        this.expect(TokenTypes.parenOpen, node);
        this.nextNonWhitespaceToken(node);

        node.condition = this.parseExpression();
        this.skipWhitespaceAndComments(node);

        this.expect(TokenTypes.parenClose);
        this.nextNonWhitespaceToken(node);

        node.statements = this.parseBracedStatements(node);
        return node;
    }

    parseEndStatement() {
        let node = this.create(EndStatement);
        node.endToken = this.expectKeyword("__END__");
        this.nextToken();
        return node;
    }
    parseIfStatement(): IfStatement {
        return this.parseIfOrElsifOrUnlessStatement();
    }
    parseElsifStatement(): ElsifStatement {
        return <ElsifStatement>this.parseIfOrElsifOrUnlessStatement();
    }

    parseIfOrElsifOrUnlessStatement(): IfStatement {
        let node: IfStatement;
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
    }

    parseElseStatement(): ElseStatement {
        let node = this.create(ElseStatement);
        node.keywordToken = this.expectKeyword("else");
        node.keywordTokenPost = this.nextNonWhitespaceToken(node);
        node.block = this.parseBlock();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    }

    parseExpressionStatement(): ExpressionStatement {
        console.log("parseExpressionStatement", this.token);
        let node = this.create(ExpressionStatement);
        node.expression = this.parseExpression();
        if (node.expression == null)
            throw new Error();
        node.expressionPost = this.skipWhitespaceAndComments();

        if (this.token.is(TokenTypes.braceClose))   //last statement doesn't have to have semicolon
            return node;

        let semicolonIsOptional = node.expression instanceof Block;
        if (!this.token.is(TokenTypes.semicolon) && semicolonIsOptional)  //allow scope blocks to end with a closing brace but without semicolon
            return node;
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        this.nextToken();
        return node;
    }

    //parseStatementEnd(node: Statement & HasSemicolonToken, semicolonIsOptional?: boolean) {
    //    node.semicolonTokenPre = this.skipWhitespaceAndComments();
    //    if (this.token.is(TokenTypes.braceClose))   //last statement doesn't have to have semicolon
    //        return;
    //    if (!this.token.is(TokenTypes.semicolon) && semicolonIsOptional)  //allow scope blocks to end with a closing brace but without semicolon
    //        return;
    //    node.semicolonToken = this.expect(TokenTypes.semicolon);
    //    this.nextToken();
    //}

    parseSubroutineDeclaration(): SubroutineDeclaration {
        console.log("parseSubroutineDeclaration", this.token);
        let node = this.create(SubroutineDeclaration);
        node.declaration = this.createExpressionParser().parseSubroutineExpression();
        node.semicolonToken = this.parseOptionalSemicolon();
        return node;
    }
    parseVariableDeclarationStatement() {
        let node = this.create(VariableDeclarationStatement);
        node.declaration = this.createExpressionParser().parseVariableDeclarationExpression();
        node.semicolonToken = this.expect(TokenTypes.semicolon, node);
        this.nextToken();
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
        let node = this.create(PackageDeclaration);
        node.packageToken = this.expectKeyword("package");
        node.statements = [];
        this.nextToken();
        node.packageTokenPost = this.expectAndSkipWhitespace();
        this.expect(TokenTypes.identifier);
        node.name = this.createExpressionParser().parseExpression();//.parseMemberExpression();
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        node.semicolonTokenPost = this.nextNonWhitespaceToken();
        node.statements = this.parseStatementsUntil();
        return node;
    }
    parseUseOrNoStatement(): UseOrNoStatement {
        let node: UseOrNoStatement;
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
        node.module = <Expression>this.createExpressionParser().parseExpressionOrOperator();
        node.modulePostTokens = this.skipWhitespaceAndComments();
        if (!this.token.is(TokenTypes.semicolon)) {
            node.list = this.createExpressionParser().parseOptionallyParenthesizedList();//.parseExpression();
        }
        node.semicolonToken = this.expect(TokenTypes.semicolon);
        node.semicolonTokenPost = this.nextNonWhitespaceToken();
        return node;
    }

    parseBlock(): Block {
        let node = this.create(Block);
        node.whitespaceBefore = this.skipWhitespaceAndComments();
        node.braceOpenToken = this.expect(TokenTypes.braceOpen);
        node.braceOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.statements = this.parseStatementsUntil(TokenTypes.braceClose);
        node.braceCloseToken = this.expect(TokenTypes.braceClose, node);
        node.whitespaceAfter = this.nextNonWhitespaceToken(node);
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
        parser.parser = this;
        return parser;
    }





}


