class ExpressionParser extends ParserBase {
    parser: Parser;

    parseExpression(): Expression {
        this.log("parseExpression", this.token);
        let mbe = this.create(MultiBinaryExpression);
        mbe.expressions = [];
        mbe.operators = [];
        this.continueParseExpression(mbe);
        if (mbe.operators.length == 0)
            return mbe.expressions[0];
        if (mbe.operators.length == 1) {
            let be = new BinaryExpression();
            be.left = mbe.expressions[0];
            be.tokens = mbe.tokens;
            be.token = mbe.token;
            be.right = mbe.expressions[1];
            be.operator = mbe.operators[0];
            return be;
        }
        return mbe;
    }

    toListDeclaration(exp: Expression): ListDeclaration {
        if (exp instanceof ListDeclaration)
            return exp;
        let node = this.create(ListDeclaration);
        node.items = [exp];
        return node;
    }
    continueParseExpression(mbe: MultiBinaryExpression): void {
        let tempParser;
        let exp: Expression;
        if (tempParser != null) {
            exp = tempParser.call(this);
            tempParser = null;
        }
        else {
            exp = this.parseNonBinaryExpression();
        }
        mbe.expressions.push(exp);
        if (this.token == null)
            return;
        if (this.token.isAny([
            TokenTypes.assignment, TokenTypes.concat, TokenTypes.divDiv, TokenTypes.regExpEquals, TokenTypes.regExpNotEquals,
            TokenTypes.equals, TokenTypes.and, TokenTypes.or, TokenTypes.greaterOrEqualsThan,
            TokenTypes.greaterThan, TokenTypes.smallerOrEqualsThan, TokenTypes.smallerThan,
            TokenTypes.numericCompare,
            TokenTypes.concatAssign, TokenTypes.divideAssign, TokenTypes.subtractAssign,
            TokenTypes.addAssign, TokenTypes.multiplyAssign, TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply, TokenTypes.multiplyString, TokenTypes.div, TokenTypes.range,
        ]) || this.token.isAnyKeyword(["if", "unless", "while", "until", "for", "foreach", "when", "and", "eq", "or"])) { //statement modifiers
            if (this.token.isAnyKeyword(["for", "foreach"])) {           //for,foreach postfix have list after them without parantheses
                tempParser = this.parseSingleOrCommaSeparatedExpressions;
            }
            let operator = new Operator();
            operator.value = this.token.value;
            mbe.operators.push(operator);
            this.nextToken();
            //this.nextNonWhitespaceToken(mbe);
        }
        else
            return;
        this.continueParseExpression(mbe);
    }


    parseNonBinaryExpression(lastExpression?: Expression): Expression {
        if (this.token == null && lastExpression != null)
            return lastExpression;
        let pos = this.reader.tokenIndex;
        let whitespaceBeforeExp = this.skipWhitespaceAndComments();
        if (this.token == null) {
            return lastExpression;
        }
        let exp = this._parseNonBinaryExpression(lastExpression);
        if (exp == lastExpression) {
            this.reader.goto(pos);
            return exp;
        }
        exp.whitespaceBefore = whitespaceBeforeExp;
        if (exp.whitespaceAfter == null)
            exp.whitespaceAfter = this.skipWhitespaceAndComments();
        return exp;
    }
    _parseNonBinaryExpression(lastExpression?: Expression): Expression {
        this.log("parseExpression", this.token, lastExpression);
        //this.skipWhitespaceAndComments();
        //if (this.token == null)
        //    return lastExpression;
        //if (this.token.isAny([TokenTypes.whitespace, TokenTypes.comment])) {
        //    console.warn("_parseNonBinaryExpression: whitespace must be handled before parseNonBinaryExpression");
        //    if (lastExpression != null)
        //        lastExpression.whitespaceAfter = this.skipWhitespaceAndComments();
        //    else
        //        this.skipWhitespaceAndComments();
        //}

        if (this.token.is(TokenTypes.bracketOpen)) {
            if (lastExpression == null)
                lastExpression = this.parseArrayRefDeclaration();
            else
                lastExpression = this.parseArrayMemberAccess(lastExpression, false);
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.is(TokenTypes.braceOpen)) {
            if (lastExpression == null)
                return this.parseHashRefOrBlockExpression();
            lastExpression = this.parseHashMemberAccess(lastExpression, false);
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.is(TokenTypes.parenOpen)) {
            if (lastExpression == null)
                lastExpression = this.parseParenthesizedList();
            else
                lastExpression = this.parseInvocationExpression(lastExpression);
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAnyKeyword(["my", "our"])) {
            let node = this.parseVariableDeclarationExpression();
            return node;
        }
        else if (this.token.isKeyword("sub")) {
            if (lastExpression != null)
                throw new Error();
            return this.parseSubroutineExpression();
        }
        else if (this.token.isKeyword("return")) {
            return this.parseReturnExpression();
        }
        else if (this.token.isAny([TokenTypes.comma, TokenTypes.semicolon])) {
            if (lastExpression == null)
                throw new Error();
            return lastExpression;
        }
        else if (this.token.is(TokenTypes.sigil) || this.token.is(TokenTypes.multiply)) { //multiply: *{"a::b"}{CODE}
            let node = this.create(PrefixUnaryExpression);
            node.operator = new Operator();
            node.operator.value = this.token.value;
            this.nextNonWhitespaceToken(node);
            if (this.token.is(TokenTypes.braceOpen)) {
                this.nextNonWhitespaceToken();
                node.expression = this.parseExpression();
                this.skipWhitespaceAndComments();
                this.expect(TokenTypes.braceClose);
                this.nextToken();
            }
            else {
                node.expression = this.parseNonBinaryExpression();
            }
            lastExpression = node;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.not, TokenTypes.makeRef, TokenTypes.multiply, TokenTypes.codeRef, TokenTypes.lastIndexVar]) || this.token.isAnyKeyword(["not"])) { //multiply: *{"a::b"}{CODE}
            let node = this.create(PrefixUnaryExpression);
            node.operator = new Operator();
            node.operator.value = this.token.value;
            this.nextNonWhitespaceToken(node);
            node.expression = this.parseExpression();
            lastExpression = node;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.inc, TokenTypes.dec])) {
            let node = this.create(PostfixUnaryExpression);
            node.expression = lastExpression;
            node.operator = new Operator();
            node.operator.value = this.token.value;
            this.nextNonWhitespaceToken(node);
            lastExpression = node;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isIdentifier()) { //defined exists ref etc... // || this.token.isKeyword()
            if (lastExpression != null)
                return lastExpression;
            let node = this.parseMemberExpression(lastExpression, false);
            //node.prev = lastExpression;
            lastExpression = node;
            if (this.token.is(TokenTypes.whitespace)) {   //detect invocation without parantheses
                let reader2 = this.reader.clone();
                reader2.nextNonWhitespaceToken();
                if (!reader2.token.isAny([TokenTypes.parenOpen, TokenTypes.arrow, TokenTypes.comma, TokenTypes.fatComma, TokenTypes.keyword, TokenTypes.assignment])) {
                    lastExpression = this.parseInvocationExpression(node);
                }
            }
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.sigiledIdentifier, TokenTypes.evalErrorVar])) {
            let node = this.parseMemberExpression(null, false);
            node.target = lastExpression;
            lastExpression = node;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.is(TokenTypes.question)) {
            let exp = this.create(TrinaryExpression);
            exp.condition = lastExpression;
            exp.questionToken = this.token;
            exp.questionTokenPost = this.nextNonWhitespaceToken(exp);
            exp.trueExpression = this.parseExpression();
            exp.trueExpressionPost = this.skipWhitespaceAndComments();
            exp.colonToken = this.expect(TokenTypes.colon);
            exp.colonTokenPost = this.nextNonWhitespaceToken();
            exp.falseExpression = this.parseExpression();
            lastExpression = exp;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.integer, TokenTypes.interpolatedString, TokenTypes.qq, TokenTypes.string, TokenTypes.qw, TokenTypes.qx])) {
            if (lastExpression != null)
                return lastExpression; //shouldn't continue parsing
            let node = this.create(ValueExpression);
            node.value = this.token.value;//TODO:
            lastExpression = node;
            this.nextToken();
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.regex, TokenTypes.regexSubstitute, TokenTypes.regexMatch, TokenTypes.qr, TokenTypes.tr])) {
            let node = this.create(RegexExpression);
            node.value = this.token.value;//TODO:
            lastExpression = node;
            this.nextToken();
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.is(TokenTypes.arrow) || this.token.is(TokenTypes.packageSeparator)) {
            lastExpression = this.parseAnyMemberAccess(lastExpression);
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (lastExpression != null)
            return lastExpression;
        else
            return null;
    }

    parseSubroutineExpression(): SubroutineExpression {
        let node = this.create(SubroutineExpression);
        node.subToken = this.expectKeyword("sub");
        node.subTokenPost = this.nextNonWhitespaceToken(node);
        if (this.token.is(TokenTypes.identifier)) {
            node.name = this.parser.parseSimpleName();
            node.namePost = this.skipWhitespaceAndComments();
        }
        if (this.token.is(TokenTypes.colon)) { //subroutine attributes: sub foo : method { ... }
            node.colonToken = this.token;
            node.colonTokenPost = this.nextNonWhitespaceToken(node);
            node.attribute = this.parser.parseSimpleName();
            node.attributePost = this.skipWhitespaceAndComments(node);
        }
        if (this.token.is(TokenTypes.parenOpen)) {
            node.prototype = this.parseParenthesizedList();
            node.prototypePost = this.skipWhitespaceAndComments(node);
        }
        node.block = this.parseBlockExpression();//this.parser.parseBracedStatements(node);
        return node;
    }
    parseReturnExpression(): ReturnExpression {
        let node = this.create(ReturnExpression);
        node.returnToken = this.expectKeyword("return");
        node.returnTokenPost = this.nextNonWhitespaceToken(node);
        if (!this.token.is(TokenTypes.semicolon)) {
            node.expression = this.parseSingleOrCommaSeparatedExpressions();
        }
        return node;
    }
    parseSingleOrCommaSeparatedExpressions(): Expression {
        let returnItems = this.parseCommaSeparatedExpressions();
        if (returnItems.length == 1)
            return returnItems[0];

        let list = new ListDeclaration();
        list.items = returnItems;
        list.tokens = [returnItems[0].token];
        list.token = returnItems[0].token;
        return list;
    }


    parseAnyMemberAccess(target: Expression): Expression {
        let arrow = this.token.is(TokenTypes.arrow);
        this.expectAny([TokenTypes.arrow, TokenTypes.packageSeparator]);
        let memberSeparatorToken = this.token;
        this.nextToken();
        let node: HashMemberAccessExpression | ArrayMemberAccessExpression | MemberExpression;
        if (this.token.is(TokenTypes.braceOpen))
            node = this.parseHashMemberAccess(target, arrow);
        else if (this.token.is(TokenTypes.bracketOpen))
            node = this.parseArrayMemberAccess(target, arrow);
        else
            node = this.parseMemberExpression(target, arrow);

        node.memberSeparatorToken = memberSeparatorToken;
        node.arrow = arrow;
        return node;
    }
    parseArrayMemberAccess(target: Expression, arrow: boolean): ArrayMemberAccessExpression {
        let node = this.create(ArrayMemberAccessExpression);
        node.bracketOpenToken = this.expect(TokenTypes.bracketOpen);
        node.bracketOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.expression = this.parseExpression();
        node.target = target;
        node.arrow = arrow;
        node.bracketCloseToken = this.expect(TokenTypes.bracketClose, node);
        this.nextToken();
        return node;
    }
    parseHashMemberAccess(target: Expression, arrow: boolean): HashMemberAccessExpression {
        let node = this.create(HashMemberAccessExpression);
        node.braceOpenToken = this.expect(TokenTypes.braceOpen);
        node.braceOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.member = this.parseExpression();
        node.arrow = arrow;
        node.braceCloseToken = this.expect(TokenTypes.braceClose, node);
        this.nextToken();
        node.target = target;
        return node;
    }

    parseMemberExpression(target: Expression, arrow: boolean): MemberExpression {
        this.log("parseMemberExpression", this.token);
        let node = this.create(MemberExpression);
        node.token = this.token;
        node.name = this.token.value;
        node.target = target;
        node.arrow = arrow;
        this.nextToken();
        return node;
    }

    //parseBareword(): BarewordExpression {
    //    this.expectIdentifier();
    //    let exp = new BarewordExpression();
    //    exp.token = this.token;
    //    exp.value = this.token.value;
    //    return exp;
    //}

    isBlockExpression(): boolean {
        let reader2 = this.reader.clone();
        let depth = 0;
        while (reader2.token != null) {
            if (reader2.token.is(TokenTypes.braceOpen))
                depth++;
            else if (reader2.token.is(TokenTypes.braceClose))
                depth--;
            else if (depth == 1 && (reader2.token.is(TokenTypes.semicolon) || reader2.token.isAnyKeyword(["if", "while", "for", "foreach"])))
                return true;
            if (depth == 0)
                break;
            reader2.nextNonWhitespaceToken();
        }
        return false;
    }

    parseHashRefOrBlockExpression(): Expression {
        let isBlock = this.isBlockExpression();
        if (isBlock)
            return this.parseBlockExpression();
        return this.parseHashRefCreation();

        //let index = this.reader.clone().findClosingBraceIndex(TokenTypes.braceOpen, TokenTypes.braceClose);
        //if (index < 0)
        //    throw new Error("can't find brace close");
        //let tokens = this.reader.getRange(this.reader.tokenIndex, index);
        //for (let token of tokens) {
        //    if (token.is(TokenTypes.braceOpen))
        //}
        //if (tokens.first(t=> t.is(TokenTypes.semicolon)) != null) {
        //    return this.parseBlockExpression();
        //}
        //return this.parseHashRefCreation();

    }
    parseHashRefCreation(): HashRefCreationExpression {
        this.expect(TokenTypes.braceOpen);
        let node2 = this.parseParenthesizedList(TokenTypes.braceOpen, TokenTypes.braceClose);
        let node = this.create(HashRefCreationExpression);
        node.token = node2.token;
        node.tokens = node2.tokens;
        node.items = node2.items;
        node.itemsSeparators = node2.itemsSeparators;
        node.parenOpenToken = node2.parenOpenToken;
        node.parenOpenTokenPost = node2.parenOpenTokenPost;
        node.parenCloseToken = node2.parenCloseToken;
        return node;
    }
    parseBlockExpression(): BlockExpression {
        let node = this.create(BlockExpression);
        node.whitespaceBefore = this.skipWhitespaceAndComments();
        node.braceOpenToken = this.expect(TokenTypes.braceOpen);
        node.braceOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.statements = this.parser.parseStatementsUntil(TokenTypes.braceClose);
        node.braceCloseToken = this.expect(TokenTypes.braceClose, node);
        node.whitespaceAfter = this.nextNonWhitespaceToken(node);
        return node;
    }



    parseInvocationExpression(target: Expression): InvocationExpression {
        this.log("parseInvocationExpression", this.token);
        let node = this.create(InvocationExpression);
        node.targetPost = this.skipWhitespaceAndComments();
        node.arguments = this.parseOptionallyParanthasizedList();
        node.target = target;
        console.log("INVOCATION", node);
        return node;
    }

    parseArrayRefDeclaration(): ArrayRefDeclaration {
        this.log("parseArrayRefDeclaration", this.token);
        let node = this.create(ArrayRefDeclaration);
        node.bracketOpenToken = this.expect(TokenTypes.bracketOpen);
        let node2 = this.parseNonParenthesizedList();
        node.items = node2.items;
        node.itemsSeparators = node2.itemsSeparators;
        node.bracketCloseToken = this.expect(TokenTypes.bracketClose);
        return node;
    }

    parseBracedCommaSeparatedExpressions(opener: TokenType, closer: TokenType, node: AstNode, stayOnCloser?: boolean): Expression[] {
        this.log("parseBracedCommaSeparatedExpressions", this.token);
        this.expect(opener, node);
        let items: Expression[] = [];
        this.nextNonWhitespaceToken(node);
        while (this.token != null) {
            if (this.token.is(closer))
                break;
            let exp = this.parseExpression();
            items.push(exp);
            this.skipWhitespaceAndComments(exp);
            if (this.token.is(closer))
                break;
            this.expectAny([TokenTypes.comma, TokenTypes.fatComma]);
            this.nextNonWhitespaceToken(node);
        }
        this.expect(closer, node);
        if (!stayOnCloser)
            this.nextToken();
        return items;
    }


    parseOptionallyParanthasizedList(opener?: TokenType, closer?: TokenType): ListDeclaration {
        if (opener == null)
            opener = TokenTypes.parenOpen;
        if (closer == null)
            closer = TokenTypes.parenClose;
        if (this.token.is(opener))
            return this.parseParenthesizedList();
        return this.parseNonParenthesizedList();
    }
    parseParenthesizedList(opener?: TokenType, closer?: TokenType): ListDeclaration {
        if (opener == null)
            opener = TokenTypes.parenOpen;
        if (closer == null)
            closer = TokenTypes.parenClose;
        let node = this.create(ListDeclaration);
        node.parenOpenToken = this.expect(opener);
        node.parenOpenTokenPost = this.nextNonWhitespaceToken();
        node.items = [];
        node.itemsSeparators = [];
        while (this.token != null) {
            if (this.token.is(closer))
                break;
            let exp = this.parseExpression();
            node.items.push(exp);
            let sep = this.skipWhitespaceAndComments(exp);
            if (this.token.is(closer))
                break;
            sep.add(this.expectAny([TokenTypes.comma, TokenTypes.fatComma]));
            sep.addRange(this.nextNonWhitespaceToken(node));
            node.itemsSeparators.push(sep);
        }
        node.parenCloseToken = this.expect(closer);
        this.nextToken();
        return node;
    }
    parseNonParenthesizedList(): ListDeclaration {
        let node = this.create(ListDeclaration);
        node.items = [];
        node.itemsSeparators = [];
        while (this.token != null) {
            let exp = this.parseExpression();
            node.items.push(exp);
            let sep = this.skipWhitespaceAndComments(exp);
            if (!this.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                break;
            sep.add(this.token);
            sep.addRange(this.nextNonWhitespaceToken(node));
            node.itemsSeparators.push(sep);
        }
        return node;
    }
    parseCommaSeparatedExpressions(): Expression[] {
        this.log("parseCommaSeparatedExpressions", this.token);
        let items: Expression[] = [];
        this.skipWhitespaceAndComments();
        //this.nextNonWhitespaceToken();
        while (this.token != null) {
            let exp = this.parseExpression();
            if (exp == null)  //this should not happen i think, e.g.: callSub a,b,c, (trailing comma without paranthasis)
                break;
            items.push(exp);
            this.skipWhitespaceAndComments();
            if (!this.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                break;
            this.nextNonWhitespaceToken();
        }
        return items;
    }

    parseVariableDeclarationExpression(): VariableDeclarationExpression {
        let node = this.create(VariableDeclarationExpression);
        if (!this.token.isAnyKeyword(["my", "our"]))
            return this.onUnexpectedToken();
        node.myOurToken = this.token;
        this.nextToken();
        node.myOurTokenPost = this.skipWhitespaceAndComments(node);
        if (this.token.is(TokenTypes.parenOpen)) {
            node.variables = this.parseParenthesizedList();
        }
        else if (this.token.is(TokenTypes.sigiledIdentifier)) {
            node.variables = this.parseMemberExpression(null, false);
        }
        else {
            this.logger.error("unexpected token in VariableDeclarationExpression", this.token);
        }
        node.variablesPost = this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.assignment)) {   //TODO: doesn't work, variables are evaluated to a binary expression (assignment)
            node.assignToken = this.token;
            this.nextToken();
            node.assignTokenPost = this.skipWhitespaceAndComments();
            node.initializer = this.parseExpression();
        }
        return node;
    }

    //parseQw(): QwExpression {
    //    this.log("parseQw", this.token);
    //    this.expectValue(TokenTypes.identifier, "qw");
    //    let node = this.create(QwExpression);
    //    node.items = [];
    //    this.nextToken();
    //    this.expectAny([TokenTypes.smallerThan, TokenTypes.parenOpen, TokenTypes.forwardSlash], node);
    //    this.nextToken();
    //    while (true) {
    //        this.expect(TokenTypes.identifier, node);
    //        let item = this.create(ValueExpression);
    //        item.value = this.token.value;
    //        node.items.push(item);
    //        this.nextToken();
    //        if (this.token.is(TokenTypes.greaterThan))
    //            break;
    //        this.expect(TokenTypes.whitespace, node);
    //        this.nextNonWhitespaceToken(node);
    //    }
    //    this.nextToken();
    //    return node;
    //}



}