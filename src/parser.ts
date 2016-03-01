﻿class Parser extends ParserBase {

    public doParse(): Statement[] {
        this.nextToken();
        let statements: Statement[] = [];
        safeTry(()=>this.parseStatementsUntil(null, statements)).catch(e=>console.error("parse error", e));
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
    //parsePod() {
    //    let node = new Comment();
    //    node.token = this.token;
    //    return node;
    //}

    parseBegin(): BeginBlock {
        this.expectKeyword("BEGIN");
        let node = this.create(BeginBlock);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseBracedStatements(node, true);
        return node;
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
        this.nextNonWhitespaceToken(node);
        if (this.token.isKeyword("my")) {
            node.variable = this.createExpressionParser().parseVariableDeclarationExpression();
        }
        else if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variable = this.createExpressionParser().parseMemberExpression(null, false);// .parseNonBinaryExpression();
        }
        this.skipWhitespaceAndComments(node);
        this.expect(TokenTypes.parenOpen, node);
        node.list = this.createExpressionParser().parseParenthesizedList();
        this.skipWhitespaceAndComments(node);
        node.statements = this.parseBracedStatements(node, true);
        return node;
    }

    parseForStatement(): ForStatement {
        if (!this.token.isAnyKeyword(["foreach", "for"]))
            throw new Error();
        let node = this.create(ForStatement);
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
        this.expectKeyword("__END__");
        let node = this.create(EndStatement);
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
    }

    parseElseStatement(): ElseStatement {
        this.expectKeyword("else");
        let node = this.create(ElseStatement);
        this.nextNonWhitespaceToken(node);
        node.statements = this.parseBracedStatements(node);
        return node;
    }
    parseStatementEnd(node: Statement, semicolonIsOptional?: boolean) {
        this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.braceClose))   //last statement doesn't have to have semicolon
            return;
        if (!this.token.is(TokenTypes.semicolon) && semicolonIsOptional)  //allow scope blocks to end with a closing brace but without semicolon
            return;
        this.expect(TokenTypes.semicolon);
        this.nextToken();
        return;
    }
    parseExpressionStatement(): ExpressionStatement {
        console.log("parseExpressionStatement", this.token);
        let node = this.create(ExpressionStatement);
        node.expression = this.parseExpression();
        if (node.expression == null)
            throw new Error();
        this.parseStatementEnd(node, node.expression instanceof BlockExpression);
        return node;
    }
    parseSubroutineDeclaration(): SubroutineDeclaration {
        console.log("parseSubroutineDeclaration", this.token);
        let node = this.create(SubroutineDeclaration);
        node.declaration = this.createExpressionParser().parseSubroutineExpression();
        return node;
    }
    parseVariableDeclarationStatement() {
        let node = this.create(VariableDeclarationStatement);
        node.declaration = this.createExpressionParser().parseVariableDeclarationExpression();
        this.expect(TokenTypes.semicolon, node);
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
        this.log("parsePackage");
        this.expectKeyword("package");
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
        node.module = this.createExpressionParser().parseNonBinaryExpression();// this.parseMemberExpression();
        if (!this.token.is(TokenTypes.semicolon))
            node.list = this.parseExpression();
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
        parser.parser = this;
        return parser;
    }





}


