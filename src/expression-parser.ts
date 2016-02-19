class ExpressionParser extends ParserBase {

    parseExpression(): Expression {
        console.log("parseExpression", this.token);
        let node = this._parseExpression();
        console.log("parseExpression Finished", this.token, node);
        return node;
    }

    toListDeclaration(exp: Expression): ListDeclaration {
        let list: ListDeclaration;
        if (exp instanceof ListDeclaration)
            return exp;
        list = new ListDeclaration();
        list.token = exp.token;
        list.items = [exp];
        return list;
    }
    _parseExpression(lastExpression?: Expression): Expression {
        let i = 0;
        while (true) {
            i++;
            console.log("parseExpression", i, this.token, lastExpression);
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.bracketOpen))
                return this.parseArrayRefDeclaration();
            else if (this.token.isIdentifier("qw"))
                return this.parseQw();
            else if (this.token.is(TokenTypes.braceOpen)) {
                if (lastExpression == null)
                    return this.parseHashRefCreation();
                return this.parseHashMemberAccess(); //TODO: hash member access
            }
            else if (this.token.is(TokenTypes.parenOpen)) {
                if (lastExpression == null)
                    return this.parseParenthesizedList();
                let node = this.parseInvocationExpression();
                node.target = lastExpression;
                lastExpression = node;
            }
            else if (this.token.is(TokenTypes.comma)) {
                if (lastExpression == null)
                    throw new Error();
                let list = this.toListDeclaration(lastExpression);
                let items = this.parseItems2();
                list.items.addRange(items);
                return list;
            }
            else if (this.token.isIdentifier()) {
                let node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.is(TokenTypes.sigiledIdentifier)) {
                let node = this.parseMemberExpression();
                node.prev = lastExpression;
                lastExpression = node;
            }
            else if (this.token.isAny([TokenTypes.integer, TokenTypes.interpolatedString])) {
                let node = new ValueExpression();
                node.token = this.token;
                node.value = this.token.value;//TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.isAny([TokenTypes.regex, TokenTypes.regexSubstitute])) {
                let node = new RegexExpression();
                node.token = this.token;
                node.value = this.token.value;//TODO:
                lastExpression = node;
                this.nextToken();
            }
            else if (this.token.is(TokenTypes.arrow) || this.token.is(TokenTypes.packageSeparator)) {
                let arrow = this.token.is(TokenTypes.arrow);
                if (arrow) {
                    if (!(lastExpression instanceof MemberExpression))
                        throw new Error("unexpected node " + lastExpression);
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
            else if (this.token.isAny([TokenTypes.equals, TokenTypes.dot, TokenTypes.divDiv, TokenTypes.regExpEquals])) {
                if (lastExpression == null)
                    throw new Error();
                let exp = new BinaryExpression();
                exp.token = this.token;
                exp.left = lastExpression;
                exp.operator = new Operator();
                exp.operator.value = this.token.value;
                this.nextNonWhitespaceToken();
                exp.right = this.parseExpression();
                lastExpression = exp;
            }
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
    parseHashMemberAccess(): HashMemberAccessExpression {
        let exp = new HashMemberAccessExpression();
        exp.token = this.token;
        let exp2 = this.parseHashRefCreation();
        exp.name = exp2.items[0].token.value; //TODO:
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
        let exp = new HashRefCreationExpression();
        exp.token = this.token;
        exp.items = this.parseItems(TokenTypes.braceOpen, TokenTypes.braceClose);
        return exp;
    }
    parseMemberExpression(): MemberExpression {
        console.log("parseMemberExpression", this.token);
        let node = new MemberExpression();
        node.token = this.token;
        node.name = this.token.value;
        this.nextToken();
        return node;
    }


    parseInvocationExpression(): InvocationExpression {
        console.log("parseInvocationExpression", this.token);
        let node = new InvocationExpression();
        node.token = this.token;
        node.arguments = this.parseParenthesizedList().items;
        return node;
    }
    parseArrayRefDeclaration(): ArrayRefDeclaration {
        console.log("parseArrayRefDeclaration", this.token);
        this.expect(TokenTypes.bracketOpen);
        let node = new ArrayRefDeclaration();
        node.token = this.token;
        node.items = this.parseItems(TokenTypes.bracketOpen, TokenTypes.bracketClose);
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
        let node = new ListDeclaration();
        node.token = this.token;
        node.items = this.parseItems(TokenTypes.parenOpen, TokenTypes.parenClose);
        return node;
    }
    parseItems(opener: TokenType, closer: TokenType): Expression[] {
        console.log("parseItems", this.token);
        this.expect(opener);
        let items: Expression[] = [];
        this.nextNonWhitespaceToken();
        while (this.token != null) {
            if (this.token.is(TokenTypes.parenClose))
                break;
            items.push(this.parseExpression());
            this.skipWhitespaceAndComments();
            if (this.token.is(closer))
                break;
            this.expectAny([TokenTypes.comma, TokenTypes.fatArrow]);
            this.nextNonWhitespaceToken();
        }
        this.expect(closer);
        this.nextToken();
        return items;
    }
    parseItems2(): Expression[] {
        console.log("parseItems", this.token);
        let items: Expression[] = [];
        this.nextNonWhitespaceToken();
        while (this.token != null) {
            let exp = this.parseExpression();
            if (exp == null)  //this should not happen i think, e.g.: callSub a,b,c, (trailing comma without paranthasis)
                break;
            items.push(exp);
            this.skipWhitespaceAndComments();
            if (!this.token.isAny([TokenTypes.comma, TokenTypes.fatArrow]))
                break;
            this.nextNonWhitespaceToken();
        }
        return items;
    }

    parseQw(): QwExpression {
        console.log("parseQw", this.token);
        this.expect(TokenTypes.identifier, "qw");
        let node = new QwExpression();
        node.token = this.token;
        node.items = [];
        this.nextToken();
        this.expect(TokenTypes.smallerThan);
        this.nextToken();
        while (true) {
            this.expect(TokenTypes.identifier);
            let item = new ValueExpression();
            item.token = this.token;
            item.value = this.token.value;
            node.items.push(item);
            this.nextToken();
            if (this.token.is(TokenTypes.greaterThan))
                break;
            this.expect(TokenTypes.whitespace);
            this.nextNonWhitespaceToken();
        }
        this.nextToken();
        return node;
    }



}