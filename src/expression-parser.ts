class ExpressionParser extends ParserBase {

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
    _parseExpression(lastExpression?: Expression): Expression {
        let i = 0;
        let mbe = this.create(MultiBinaryExpression);
        while (true) {
            i++;
            let left = this.parseNonBinaryExpression();
            if (this.token.isAny([
                TokenTypes.assignment, TokenTypes.concat, TokenTypes.divDiv, TokenTypes.regExpEquals,
                TokenTypes.equals, TokenTypes.and, TokenTypes.or, TokenTypes.greaterOrEqualsThan,
                TokenTypes.greaterThan, TokenTypes.smallerOrEqualsThan, TokenTypes.smallerThan,
                TokenTypes.concatAssign, TokenTypes.divideAssign, TokenTypes.subtractAssign,
                TokenTypes.addAssign, TokenTypes.multiplyAssign, TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply, TokenTypes.multiplyString
            ])) {
                if (left == null)
                    throw new Error();
                let operator = new Operator();
                operator.value = this.token.value;
                mbe.operators.push(operator);
                
                let exp = this.create(BinaryExpression);
                exp.token = this.token;
                exp.left = lastExpression;
                

                this.nextNonWhitespaceToken(exp);
                exp.right = this.parseExpression();
                lastExpression = exp;
            }
            else if (lastExpression != null)
                return lastExpression;
            else
                return null;
        }
    }
    
    parseNonBinaryExpression(lastExpression?: Expression): Expression {
        let i = 0;
        while (true) {
            i++;
            this.log("parseExpression", i, this.token, lastExpression);
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.bracketOpen)) {
                if (lastExpression == null)
                    return this.parseArrayRefDeclaration();
                lastExpression = this.parseArrayMemberAccess(lastExpression);
            }
            else if (this.token.isIdentifier("qw"))
                return this.parseQw();
            else if (this.token.is(TokenTypes.braceOpen)) {
                if (lastExpression == null)
                    return this.parseHashRefCreation();
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
            else if (this.token.is(TokenTypes.not)) {
                let node = this.create(PrefixUnaryExpression);
                node.operator = new Operator();
                node.operator.value = this.token.value;
                this.nextNonWhitespaceToken(node);
                node.expression = this.parseExpression();
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
            else if (this.token.is(TokenTypes.sigiledIdentifier)) {
                let node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.isAny([TokenTypes.integer, TokenTypes.interpolatedString, TokenTypes.qq, TokenTypes.string])) {
                let node = this.create(ValueExpression);
                node.value = this.token.value;//TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.isAny([TokenTypes.regex, TokenTypes.regexSubstitute])) {
                let node = this.create(RegexExpression);
                node.value = this.token.value;//TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.is(TokenTypes.arrow) || this.token.is(TokenTypes.packageSeparator)) {
                let arrow = this.token.is(TokenTypes.arrow);
                if (arrow) {
                    if (!(lastExpression instanceof MemberExpression)) {
                        console.warn("can't set arrow");
                    }
                    let me = <MemberExpression>lastExpression;
                    me.arrow = arrow;
                }
                this.nextToken();
                let node = this._parseExpression(lastExpression);
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
        let exp2 = this.parseHashRefCreation();
        exp.name = exp2.items[0].token.value; //TODO:
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
    parseHashRefCreation(): HashRefCreationExpression {
        this.expect(TokenTypes.braceOpen);
        let exp = this.create(HashRefCreationExpression);
        exp.items = this.parseBracedCommaSeparatedExpressions(TokenTypes.braceOpen, TokenTypes.braceClose, exp);
        return exp;
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
    parseBracedCommaSeparatedExpressions(opener: TokenType, closer: TokenType, node:AstNode): Expression[] {
        this.log("parseBracedCommaSeparatedExpressions", this.token);
        this.expect(opener, node);
        let items: Expression[] = [];
        this.nextNonWhitespaceToken(node);
        while (this.token != null) {
            if (this.token.is(TokenTypes.parenClose))
                break;
            let exp  = this.parseExpression();
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

    parseQw(): QwExpression {
        this.log("parseQw", this.token);
        this.expectValue(TokenTypes.identifier, "qw");
        let node = this.create(QwExpression);
        node.items = [];
        this.nextToken();
        this.expect(TokenTypes.smallerThan, node);
        this.nextToken();
        while (true) {
            this.expect(TokenTypes.identifier, node);
            let item = this.create(ValueExpression);
            item.value = this.token.value;
            node.items.push(item);
            this.nextToken();
            if (this.token.is(TokenTypes.greaterThan))
                break;
            this.expect(TokenTypes.whitespace, node);
            this.nextNonWhitespaceToken(node);
        }
        this.nextToken();
        return node;
    }



}