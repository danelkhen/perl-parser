var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ExpressionParser = (function (_super) {
    __extends(ExpressionParser, _super);
    function ExpressionParser() {
        _super.apply(this, arguments);
    }
    ExpressionParser.prototype.parseExpression = function () {
        this.log("parseExpression", this.token);
        var mbe = this.create(MultiBinaryExpression);
        mbe.expressions = [];
        mbe.operators = [];
        this.continueParseExpression(mbe);
        if (mbe.operators.length == 0)
            return mbe.expressions[0];
        if (mbe.operators.length == 1) {
            var be = new BinaryExpression();
            be.left = mbe.expressions[0];
            be.tokens = mbe.tokens;
            be.token = mbe.token;
            be.right = mbe.expressions[1];
            be.operator = mbe.operators[0];
            return be;
        }
        return mbe;
    };
    ExpressionParser.prototype.toListDeclaration = function (exp) {
        if (exp instanceof ListDeclaration)
            return exp;
        var node = this.create(ListDeclaration);
        node.items = [exp];
        return node;
    };
    ExpressionParser.prototype.continueParseExpression = function (mbe) {
        var tempParser;
        var exp;
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
            TokenTypes.equals, TokenTypes.notEquals, TokenTypes.and, TokenTypes.or, TokenTypes.greaterOrEqualsThan,
            TokenTypes.greaterThan, TokenTypes.smallerOrEqualsThan, TokenTypes.smallerThan,
            TokenTypes.numericCompare,
            TokenTypes.concatAssign, TokenTypes.divideAssign, TokenTypes.subtractAssign,
            TokenTypes.addAssign, TokenTypes.multiplyAssign, TokenTypes.plus, TokenTypes.minus, TokenTypes.multiply, TokenTypes.multiplyString, TokenTypes.div, TokenTypes.range,
        ]) || this.token.isAnyKeyword(["if", "unless", "while", "until", "for", "foreach", "when", "and", "eq", "or"])) {
            if (this.token.isAnyKeyword(["for", "foreach"])) {
                tempParser = this.parseSingleOrCommaSeparatedExpressions;
            }
            var operator = new Operator();
            operator.value = this.token.value;
            mbe.operators.push(operator);
            this.nextToken();
        }
        else
            return;
        this.continueParseExpression(mbe);
    };
    ExpressionParser.prototype.parseNonBinaryExpression = function (lastExpression) {
        if (this.token == null && lastExpression != null)
            return lastExpression;
        var pos = this.reader.tokenIndex;
        var whitespaceBeforeExp = this.skipWhitespaceAndComments();
        if (this.token == null) {
            return lastExpression;
        }
        var exp = this._parseNonBinaryExpression(lastExpression);
        if (exp == lastExpression) {
            this.reader.goto(pos);
            return exp;
        }
        exp.whitespaceBefore = whitespaceBeforeExp;
        if (exp.whitespaceAfter == null)
            exp.whitespaceAfter = this.skipWhitespaceAndComments();
        return exp;
    };
    ExpressionParser.prototype._parseNonBinaryExpression = function (lastExpression) {
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
                return this.parseHashRefCreation(); // this.parseHashRefOrBlockExpression();
            lastExpression = this.parseHashMemberAccess(lastExpression, false);
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.is(TokenTypes.parenOpen)) {
            if (lastExpression == null)
                lastExpression = this.parseParenthesizedList();
            else
                lastExpression = this.parseInvocationExpression(lastExpression, false);
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAnyIdentifier(["map", "grep"])) {
            var node = this.parseNativeInvocation_BlockAndListOrExprCommaList(this.token.value);
            return node;
        }
        else if (this.token.isAnyIdentifier(["eval"])) {
            var node = this.parseNativeInvocation_BlockOrExpr(this.token.value);
            return node;
        }
        else if (this.token.isAnyKeyword(["my", "our", "local"])) {
            var node = this.parseVariableDeclarationExpression();
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
        else if (this.token.is(TokenTypes.sigil) || this.token.is(TokenTypes.multiply)) {
            var node = this.create(PrefixUnaryExpression);
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
        else if (this.token.isAny([TokenTypes.not, TokenTypes.makeRef, TokenTypes.multiply, TokenTypes.codeRef, TokenTypes.lastIndexVar]) || this.token.isAnyKeyword(["not"])) {
            var node = this.create(PrefixUnaryExpression);
            node.operator = new Operator();
            node.operator.value = this.token.value;
            node.operatorPost = this.nextNonWhitespaceToken(node);
            node.expression = this.parseExpression();
            lastExpression = node;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.inc, TokenTypes.dec])) {
            var node = this.create(PostfixUnaryExpression);
            node.expression = lastExpression;
            node.operator = new Operator();
            node.operator.value = this.token.value;
            node.operatorPost = this.nextNonWhitespaceToken(node);
            lastExpression = node;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isIdentifier()) {
            if (lastExpression != null)
                return lastExpression;
            var node = this.parseMemberExpression(lastExpression, false);
            //node.prev = lastExpression;
            lastExpression = node;
            if (this.token.is(TokenTypes.whitespace)) {
                var reader2 = this.reader.clone();
                reader2.nextNonWhitespaceToken();
                if (!reader2.token.isAny([TokenTypes.parenOpen, TokenTypes.arrow, TokenTypes.comma, TokenTypes.fatComma, TokenTypes.keyword, TokenTypes.assignment])) {
                    lastExpression = this.parseInvocationExpression(node, false);
                }
            }
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.sigiledIdentifier, TokenTypes.evalErrorVar, TokenTypes.listSeparatorVar])) {
            var node = this.parseMemberExpression(null, false);
            node.target = lastExpression;
            lastExpression = node;
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.is(TokenTypes.question)) {
            var exp = this.create(TrinaryExpression);
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
            var node = this.create(ValueExpression);
            node.value = this.token.value; //TODO:
            lastExpression = node;
            this.nextToken();
            return this.parseNonBinaryExpression(lastExpression);
        }
        else if (this.token.isAny([TokenTypes.regex, TokenTypes.regexSubstitute, TokenTypes.regexMatch, TokenTypes.qr, TokenTypes.tr])) {
            var node = this.create(RegexExpression);
            node.value = this.token.value; //TODO:
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
    };
    ExpressionParser.prototype.parseSubroutineExpression = function () {
        var node = this.create(SubroutineExpression);
        node.subToken = this.expectKeyword("sub");
        node.subTokenPost = this.nextNonWhitespaceToken(node);
        if (this.token.is(TokenTypes.identifier)) {
            node.name = this.parser.parseSimpleName();
            node.namePost = this.skipWhitespaceAndComments();
        }
        if (this.token.is(TokenTypes.colon)) {
            node.colonToken = this.token;
            node.colonTokenPost = this.nextNonWhitespaceToken(node);
            node.attribute = this.parser.parseSimpleName();
            node.attributePost = this.skipWhitespaceAndComments(node);
        }
        if (this.token.is(TokenTypes.parenOpen)) {
            node.prototype = this.parseParenthesizedList();
            node.prototypePost = this.skipWhitespaceAndComments(node);
        }
        node.block = this.parser.parseBlock(); //this.parser.parseBracedStatements(node);
        return node;
    };
    ExpressionParser.prototype.parseReturnExpression = function () {
        var node = this.create(ReturnExpression);
        node.returnToken = this.expectKeyword("return");
        node.returnTokenPost = this.nextNonWhitespaceToken(node);
        if (!this.token.is(TokenTypes.semicolon)) {
            node.expression = this.parseSingleOrCommaSeparatedExpressions();
        }
        return node;
    };
    ExpressionParser.prototype.parseSingleOrCommaSeparatedExpressions = function () {
        var list = this.parseNonParenthesizedList();
        if (list.items.length == 1)
            return list.items[0]; //TODO: handle tokens, whitespace
        return list;
        //let returnItems = this.parseCommaSeparatedExpressions();
        //if (returnItems.length == 1)
        //    return returnItems[0];
        //let list = new ListDeclaration();
        //list.items = returnItems;
        //list.tokens = [returnItems[0].token];
        //list.token = returnItems[0].token;
        //return list;
    };
    ExpressionParser.prototype.parseAnyMemberAccess = function (target) {
        var arrow = this.token.is(TokenTypes.arrow);
        this.expectAny([TokenTypes.arrow, TokenTypes.packageSeparator]);
        var memberSeparatorToken = this.token;
        this.nextToken();
        var node;
        if (this.token.is(TokenTypes.braceOpen))
            node = this.parseHashMemberAccess(target, arrow);
        else if (this.token.is(TokenTypes.bracketOpen))
            node = this.parseArrayMemberAccess(target, arrow);
        else if (this.token.is(TokenTypes.parenOpen))
            node = this.parseInvocationExpression(target, arrow);
        else
            node = this.parseMemberExpression(target, arrow);
        node.memberSeparatorToken = memberSeparatorToken;
        node.arrow = arrow;
        return node;
    };
    ExpressionParser.prototype.parseArrayMemberAccess = function (target, arrow) {
        var node = this.create(ArrayMemberAccessExpression);
        node.bracketOpenToken = this.expect(TokenTypes.bracketOpen);
        node.bracketOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.expression = this.parseExpression();
        node.target = target;
        node.arrow = arrow;
        node.bracketCloseToken = this.expect(TokenTypes.bracketClose, node);
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseHashMemberAccess = function (target, arrow) {
        var node = this.create(HashMemberAccessExpression);
        node.braceOpenToken = this.expect(TokenTypes.braceOpen);
        node.braceOpenTokenPost = this.nextNonWhitespaceToken(node);
        node.member = this.parseExpression();
        node.arrow = arrow;
        node.braceCloseToken = this.expect(TokenTypes.braceClose, node);
        this.nextToken();
        node.target = target;
        return node;
    };
    ExpressionParser.prototype.parseMemberExpression = function (target, arrow) {
        this.log("parseMemberExpression", this.token);
        var node = this.create(MemberExpression);
        node.token = this.token;
        node.name = this.token.value;
        node.target = target;
        node.arrow = arrow;
        this.nextToken();
        return node;
    };
    //parseBareword(): BarewordExpression {
    //    this.expectIdentifier();
    //    let exp = new BarewordExpression();
    //    exp.token = this.token;
    //    exp.value = this.token.value;
    //    return exp;
    //}
    ExpressionParser.prototype.isBlockExpression = function () {
        var reader2 = this.reader.clone();
        var depth = 0;
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
        this.skipWhitespaceAndComments();
        //if(this.token.is(TokenTypes.comma))
        //    return true;
        return false;
    };
    ExpressionParser.prototype.parseHashRefOrBlockExpression = function () {
        var isBlock = this.isBlockExpression();
        if (isBlock)
            return this.parser.parseBlock();
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
    };
    ExpressionParser.prototype.parseHashRefCreation = function () {
        this.expect(TokenTypes.braceOpen);
        var node2 = this.parseParenthesizedList(TokenTypes.braceOpen, TokenTypes.braceClose);
        var node = this.create(HashRefCreationExpression);
        node.token = node2.token;
        node.tokens = node2.tokens;
        node.items = node2.items;
        node.itemsSeparators = node2.itemsSeparators;
        node.braceOpenToken = node2.parenOpenToken;
        node.braceOpenTokenPost = node2.parenOpenTokenPost;
        node.braceCloseToken = node2.parenCloseToken;
        return node;
    };
    ExpressionParser.prototype.parseInvocationExpression = function (target, arrow) {
        this.log("parseInvocationExpression", this.token);
        var node = this.create(InvocationExpression);
        node.arrow = arrow;
        node.target = target;
        node.targetPost = this.skipWhitespaceAndComments();
        node.arguments = this.parseOptionallyParenthesizedList();
        ////temp hack:  map { $self->bla(), } qw(a b c);
        //if (node.arguments.items.length == 1 && node.arguments.itemsSeparators.length == 0 && (node.arguments.items[0] instanceof BlockExpression || node.arguments.items[0] instanceof HashRefCreationExpression)) {
        //    let next = this.parseExpression();
        //    node.arguments.items.add(next);
        //}
        console.log("INVOCATION", node);
        return node;
    };
    ExpressionParser.prototype.parseArrayRefDeclaration = function () {
        this.log("parseArrayRefDeclaration", this.token);
        var node = this.create(ArrayRefDeclaration);
        node.bracketOpenToken = this.expect(TokenTypes.bracketOpen);
        node.bracketOpenTokenPost = this.nextNonWhitespaceToken();
        if (this.token.is(TokenTypes.bracketClose)) {
            node.items = [];
            node.itemsSeparators = [];
        }
        else {
            var node2 = this.parseNonParenthesizedList();
            node.items = node2.items;
            node.itemsSeparators = node2.itemsSeparators;
        }
        node.bracketCloseToken = this.expect(TokenTypes.bracketClose);
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseBracedCommaSeparatedExpressions = function (opener, closer, node, stayOnCloser) {
        this.log("parseBracedCommaSeparatedExpressions", this.token);
        this.expect(opener, node);
        var items = [];
        this.nextNonWhitespaceToken(node);
        while (this.token != null) {
            if (this.token.is(closer))
                break;
            var exp = this.parseExpression();
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
    };
    ExpressionParser.prototype.parseOptionallyParenthesizedList = function (opener, closer) {
        if (opener == null)
            opener = TokenTypes.parenOpen;
        if (closer == null)
            closer = TokenTypes.parenClose;
        if (this.token.is(opener))
            return this.parseParenthesizedList();
        return this.parseNonParenthesizedList();
    };
    ExpressionParser.prototype.parseParenthesizedList = function (opener, closer) {
        if (opener == null)
            opener = TokenTypes.parenOpen;
        if (closer == null)
            closer = TokenTypes.parenClose;
        var node = this.create(ListDeclaration);
        node.parenOpenToken = this.expect(opener);
        node.parenOpenTokenPost = this.nextNonWhitespaceToken();
        node.items = [];
        node.itemsSeparators = [];
        while (this.token != null) {
            if (this.token.is(closer))
                break;
            var exp = this.parseExpression();
            node.items.push(exp);
            var sep = this.skipWhitespaceAndComments(exp);
            if (this.token.is(closer))
                break;
            sep.add(this.expectAny([TokenTypes.comma, TokenTypes.fatComma]));
            sep.addRange(this.nextNonWhitespaceToken(node));
            node.itemsSeparators.push(sep);
        }
        node.parenCloseToken = this.expect(closer);
        this.nextToken();
        return node;
    };
    ExpressionParser.prototype.parseNonParenthesizedList = function () {
        var node = this.create(ListDeclaration);
        node.items = [];
        node.itemsSeparators = [];
        while (this.token != null) {
            var exp = this.parseExpression();
            node.items.push(exp);
            var sep = this.skipWhitespaceAndComments(exp);
            if (!this.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                break;
            sep.add(this.token);
            sep.addRange(this.nextNonWhitespaceToken(node));
            node.itemsSeparators.push(sep);
        }
        return node;
    };
    ExpressionParser.prototype.parseCommaSeparatedExpressions = function () {
        this.log("parseCommaSeparatedExpressions", this.token);
        var items = [];
        this.skipWhitespaceAndComments();
        //this.nextNonWhitespaceToken();
        while (this.token != null) {
            var exp = this.parseExpression();
            if (exp == null)
                break;
            items.push(exp);
            this.skipWhitespaceAndComments();
            if (!this.token.isAny([TokenTypes.comma, TokenTypes.fatComma]))
                break;
            this.nextNonWhitespaceToken();
        }
        return items;
    };
    ExpressionParser.prototype.parseVariableDeclarationExpression = function () {
        var node = this.create(VariableDeclarationExpression);
        if (!this.token.isAnyKeyword(["my", "our", "local"]))
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
            node.variables = this.parseNonBinaryExpression(); //local ${"a::b::c} = sub { ... }
        }
        node.variablesPost = this.skipWhitespaceAndComments();
        if (this.token.is(TokenTypes.assignment)) {
            node.assignToken = this.token;
            this.nextToken();
            node.assignTokenPost = this.skipWhitespaceAndComments();
            node.initializer = this.parseExpression();
        }
        return node;
    };
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
    ExpressionParser.prototype.tryBlockToHashRefCreation = function (block) {
        if (block.statements.length != 1)
            return null;
        throw new Error();
        var node = new HashRefCreationExpression();
        node.token = block.token;
        node.tokens = block.tokens;
        //node.items = (<ExpressionStatement>block.statements[0]).expression;
        return node;
    };
    ExpressionParser.prototype.tryHashRefCreationToBlock = function (node) {
        var node2 = new Block();
        node2.braceOpenToken = node.braceOpenToken;
        node2.braceOpenTokenPost = node.braceOpenTokenPost;
        node2.braceCloseToken = node.braceCloseToken;
        var st = new ExpressionStatement(); //TODO: validate length, transfer tokens
        st.expression = node.items[0];
        node2.statements = [st];
        return node2;
    };
    ExpressionParser.prototype.parseBlockOrExpr = function () {
        if (this.token.is(TokenTypes.braceOpen))
            return this.parseHashRefOrBlockExpression();
        return this.parseExpression();
    };
    ExpressionParser.prototype.parseNativeInvocation_BlockAndListOrExprCommaList = function (keyword) {
        var node = this.create(NativeInvocation_BlockAndListOrExprCommaList);
        node.keywordToken = this.expectIdentifier(keyword);
        node.keywordTokenPost = this.nextNonWhitespaceToken();
        var blockOrExpr = this.parseBlockOrExpr();
        var post = this.skipWhitespaceAndComments();
        if (!this.token.is(TokenTypes.comma) && blockOrExpr instanceof HashRefCreationExpression) {
            blockOrExpr = this.tryHashRefCreationToBlock(blockOrExpr);
        }
        if (blockOrExpr instanceof Block) {
            node.block = blockOrExpr;
            node.blockPost = post;
            node.list = this.parseExpression();
        }
        else if (blockOrExpr instanceof Expression) {
            node.expr = blockOrExpr;
            node.exprPost = post;
            node.commaToken = this.expect(TokenTypes.comma);
            node.commaTokenPost = this.nextNonWhitespaceToken();
            node.list = this.parseExpression();
        }
        else
            throw new Error();
        return node;
    };
    ExpressionParser.prototype.parseNativeInvocation_BlockOrExpr = function (keyword) {
        var node = this.create(NativeInvocation_BlockOrExpr);
        node.keywordToken = this.expectIdentifier(keyword);
        node.keywordTokenPost = this.nextNonWhitespaceToken();
        var blockOrExpr = this.parseBlockOrExpr();
        var post = this.skipWhitespaceAndComments();
        if (blockOrExpr instanceof Block)
            node.block = blockOrExpr;
        else if (blockOrExpr instanceof Expression)
            node.expr = blockOrExpr;
        else
            throw new Error();
        return node;
    };
    return ExpressionParser;
}(ParserBase));
