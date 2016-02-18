class ExpressionParser extends ParserBase {

    parseExpression(): Expression {
        console.log("parseExpression", this.token);
        let node = this._parseExpression();
        console.log("parseExpression Finished", this.token, node);
        return node;
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
            else if (this.token.is(TokenTypes.parenOpen) && lastExpression == null) {
                return this.parseList();
            }
            else if (this.token.is(TokenTypes.parenOpen) && lastExpression != null) {
                let node = this.parseInvocationExpression();
                node.target = lastExpression;
                lastExpression = node;
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
            else if (this.token.is(TokenTypes.integer)) {
                let node = new ValueExpression();
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
            else if (lastExpression != null)
                return lastExpression;
            else
                throw new Error();
            //let node = new Expression();
            //node.token = this.token;
            //this.nextToken();
            //return node;
        }
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
        node.arguments = this.parseList().items;
        return node;
    }
    parseArrayRefDeclaration(): ArrayRefDeclaration {
        console.log("parseArrayRefDeclaration", this.token);
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
        console.log("parseList", this.token);
        this.expect(TokenTypes.parenOpen);
        let node = new ListDeclaration();
        node.token = this.token;
        node.items = [];
        this.nextNonWhitespaceToken();
        while (this.token != null) {
            if (this.token.is(TokenTypes.parenClose))
                break;
            node.items.push(this.parseExpression());
            this.skipWhitespaceAndComments();
            if (this.token.is(TokenTypes.parenClose))
                break;
            this.expect(TokenTypes.comma);
            this.nextNonWhitespaceToken();
        }
        this.nextToken();
        return node;
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