class ExpressionParser extends ParserBase {
    parser: Parser;

    parseExpression(): Expression {
        this.log("parseExpression", this.token);
        let node = this._parseExpression();
        this.log("parseExpression Finished", this.token, node);
        return node;
    }

    toListDeclaration(exp: Expression): ListDeclaration {
        if (exp instanceof ListDeclaration)
            return exp;
        let node = this.create(ListDeclaration);
        node.items = [exp];
        return node;
    }
    _parseExpression(): Expression {
        let i = 0;
        let mbe = this.create(MultiBinaryExpression);
        mbe.expressions = [];
        mbe.operators = [];
        while (true) {
            i++;
            mbe.expressions.push(this.parseNonBinaryExpression());
            if (this.token.isAny([
                TokenTypes.assignment, TokenTypes.concat, TokenTypes.divDiv, TokenTypes.regExpEquals, TokenTypes.regExpNotEquals,
                TokenTypes.equals, TokenTypes.and, TokenTypes.or, TokenTypes.greaterOrEqualsThan,
                TokenTypes.greaterThan, TokenTypes.smallerOrEqualsThan, TokenTypes.smallerThan,
                TokenTypes.concatAssign, TokenTypes.divideAssign, TokenTypes.subtractAssign,
                TokenTypes.addAssign, TokenTypes.multiplyAssign, TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply, TokenTypes.multiplyString
            ]) || this.token.isAnyKeyword(["if","unless"])) {
                let operator = new Operator();
                operator.value = this.token.value;
                mbe.operators.push(operator);
                this.nextNonWhitespaceToken(mbe);
            }
            else
                break;
        }
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

    parseNonBinaryExpression(lastExpression?: Expression): Expression {
        let i = 0;
        while (true) {
            i++;
            this.log("parseExpression", i, this.token, lastExpression);
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.bracketOpen)) {
                if (lastExpression == null)
                    lastExpression = this.parseArrayRefDeclaration();
                else
                    lastExpression = this.parseArrayMemberAccess(lastExpression);
            }
            else if (this.token.is(TokenTypes.braceOpen)) {
                if (lastExpression == null)
                    return this.parseHashRefOrBlockExpression();
                lastExpression = this.parseHashMemberAccess(lastExpression);
            }
            else if (this.token.is(TokenTypes.parenOpen)) {
                if (lastExpression == null) {
                    lastExpression = this.parseParenthesizedList();
                }
                else {
                    let node = this.parseInvocationExpression();
                    node.target = lastExpression;
                    lastExpression = node;
                }
            }
            else if (this.token.isAny([TokenTypes.comma, TokenTypes.semicolon])) {
                if (lastExpression == null)
                    throw new Error();
                return lastExpression;
            }
            else if (this.token.isAny([TokenTypes.not, TokenTypes.sigil, TokenTypes.deref])) {
                let node = this.create(PrefixUnaryExpression);
                node.operator = new Operator();
                node.operator.value = this.token.value;
                this.nextNonWhitespaceToken(node);
                node.expression = this.parseExpression();
                lastExpression = node;
            }
            else if (this.token.isAny([TokenTypes.inc, TokenTypes.dec])) {
                let node = this.create(PostfixUnaryExpression);
                node.expression = lastExpression;
                node.operator = new Operator();
                node.operator.value = this.token.value;
                this.nextNonWhitespaceToken(node);
                lastExpression = node;
            }
            else if (this.token.isIdentifier() || this.token.isKeyword()) { //defined exists ref etc...
                let node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
                if (this.token.is(TokenTypes.whitespace)) {   //detect invocation without parantheses
                    this.skipWhitespaceAndComments();
                    if (!this.token.isAny([TokenTypes.parenOpen, TokenTypes.comma, TokenTypes.arrow])) {
                        let invocation = this.parseInvocationExpression();
                        invocation.target = node;
                        lastExpression = invocation;
                    }
                }
            }
            else if (this.token.isAny([TokenTypes.sigiledIdentifier, TokenTypes.evalErrorVar])) {
                let node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.is(TokenTypes.question)) {
                let exp = this.create(TrinaryExpression);
                exp.condition = lastExpression;
                this.nextNonWhitespaceToken(exp);
                exp.trueExpression = this.parseExpression();
                this.expect(TokenTypes.colon);
                this.nextNonWhitespaceToken();
                exp.falseExpression = this.parseExpression();
                lastExpression = exp;
            }
            else if (this.token.isAny([TokenTypes.integer, TokenTypes.interpolatedString, TokenTypes.qq, TokenTypes.string, TokenTypes.qw])) {
                let node = this.create(ValueExpression);
                node.value = this.token.value;//TODO:
                lastExpression = node;
                this.nextToken();
            }
            //else if (this.token.isIdentifier("qw"))
            //    return this.parseQw();
            else if (this.token.isAny([TokenTypes.regex, TokenTypes.regexSubstitute])) {
                let node = this.create(RegexExpression);
                node.value = this.token.value;//TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.is(TokenTypes.arrow) || this.token.is(TokenTypes.packageSeparator)) {
                let arrow = this.token.is(TokenTypes.arrow);
                //if (arrow) {
                //    if (!(lastExpression instanceof MemberExpression)) {
                //        console.warn("can't set arrow");
                //    }
                //    let me = <MemberExpression>lastExpression;
                //    me.arrow = arrow;
                //}
                this.nextToken();
                let node = this.parseNonBinaryExpression(lastExpression);
                let node2:HasArrow = <any>node;
                node2.arrow = arrow;
                return node;
            }
            //else if (this.token.is(TokenTypes.keyword) && ["defined", "exists", "ref"].contains(this.token.value)) {
            //    this.parseInvocationExpression();

            //}
            //else if (this.token.isAny([
            //    TokenTypes.assignment, TokenTypes.concat, TokenTypes.divDiv, TokenTypes.regExpEquals,
            //    TokenTypes.equals, TokenTypes.and, TokenTypes.or, TokenTypes.greaterOrEqualsThan,
            //    TokenTypes.greaterThan, TokenTypes.smallerOrEqualsThan, TokenTypes.smallerThan,
            //    TokenTypes.concatAssign, TokenTypes.divideAssign, TokenTypes.subtractAssign,
            //    TokenTypes.addAssign, TokenTypes.multiplyAssign, TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply, TokenTypes.multiplyString
            //])) {
            //    if (lastExpression == null)
            //        throw new Error();
            //    let exp = this.create(BinaryExpression);
            //    exp.token = this.token;
            //    exp.left = lastExpression;
            //    exp.operator = new Operator();
            //    exp.operator.value = this.token.value;
            //    this.nextNonWhitespaceToken(exp);
            //    exp.right = this.parseExpression();
            //    lastExpression = exp;
            //}
            else if (lastExpression != null)
                return lastExpression;
            else
                return null;
            //else
            //    throw new Error();
            //let node = new Expression();
            //node.token = this.token;
            //this.nextToken();
            //return node;
        }
    }


    parseArrayMemberAccess(target: Expression): ArrayMemberAccessExpression {
        this.expect(TokenTypes.bracketOpen);
        let node = this.create(ArrayMemberAccessExpression);
        this.nextNonWhitespaceToken(node);
        node.expression = this.parseExpression();
        node.target = target;
        this.expect(TokenTypes.bracketClose, node);
        this.nextToken();
        return node;
    }
    parseHashMemberAccess(target: Expression): HashMemberAccessExpression {
        let exp = this.create(HashMemberAccessExpression);
        exp.member = this.parseExpression();
        exp.target = target;
        return exp;
    }
    //parseBareword(): BarewordExpression {
    //    this.expectIdentifier();
    //    let exp = new BarewordExpression();
    //    exp.token = this.token;
    //    exp.value = this.token.value;
    //    return exp;
    //}
    parseHashRefOrBlockExpression(): Expression {
        this.expect(TokenTypes.braceOpen);
        let index = this.reader.clone().findClosingBraceIndex(TokenTypes.braceOpen, TokenTypes.braceClose);
        if (index < 0)
            throw new Error("can't find brace close");
        let tokens = this.reader.getRange(this.reader.tokenIndex, index);
        if (tokens.first(t=> t.is(TokenTypes.semicolon)) != null) {
            return this.parseBlockExpression();
        }
        return this.parseHashRefCreation();

    }
    parseHashRefCreation(): HashRefCreationExpression {
        this.expect(TokenTypes.braceOpen);
        let exp = this.create(HashRefCreationExpression);
        exp.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.braceOpen, TokenTypes.braceClose, exp);
        return exp;
    }
    parseBlockExpression(): BlockExpression {
        this.expect(TokenTypes.braceOpen);
        let node = this.create(BlockExpression);
        node.statements = this.parser.parseBracedStatements(node);
        return node;
    }

    parseMemberExpression(): MemberExpression {
        this.log("parseMemberExpression", this.token);
        let node = this.create(MemberExpression);
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    }


    parseInvocationExpression(): InvocationExpression {
        this.log("parseInvocationExpression", this.token);
        let node = this.create(InvocationExpression);
        if (this.token.is(TokenTypes.parenOpen))
            node.arguments = this.parseParenthesizedList().items;
        else
            node.arguments = this.parseCommaSeparatedExpressions();
        return node;
    }
    parseArrayRefDeclaration(): ArrayRefDeclaration {
        this.log("parseArrayRefDeclaration", this.token);
        this.expect(TokenTypes.bracketOpen);
        let node = this.create(ArrayRefDeclaration);
        node.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.bracketOpen, TokenTypes.bracketClose, node);
        //this.nextNonWhitespaceToken();
        //while (this.token != null) {
        //    node.items.push(this.parseExpression());
        //    this.skipWhitespaceAndComments();
        //    if (this.token.is(TokenTypes.bracketClose))
        //        break;
        //    this.expect(TokenTypes.comma);
        //    this.nextNonWhitespaceToken();
        //    if (this.token.is(TokenTypes.bracketClose))
        //        break;
        //}
        //this.nextToken();
        return node;
    }
    parseParenthesizedList(): ListDeclaration {
        let node = this.create(ListDeclaration);
        node.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.parenOpen, TokenTypes.parenClose, node);
        return node;
    }
    parseBracedCommaSeparatedExpressions(opener: TokenType, closer: TokenType, node: AstNode): Expression[] {
        this.log("parseBracedCommaSeparatedExpressions", this.token);
        this.expect(opener, node);
        let items: Expression[] = [];
        this.nextNonWhitespaceToken(node);
        while (this.token != null) {
            if (this.token.is(TokenTypes.parenClose))
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
        this.nextToken();
        return items;
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