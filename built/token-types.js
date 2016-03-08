"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var HereDocTokenType = (function (_super) {
    __extends(HereDocTokenType, _super);
    function HereDocTokenType() {
        _super.apply(this, arguments);
    }
    HereDocTokenType.prototype.tryTokenize = function (tokenizer) {
        if (!tokenizer.cursor.startsWith("<<"))
            return 0;
        var ender;
        var range = tokenizer.cursor.next(/^<<"[a-zA-Z0-9_]+"/);
        if (range == null)
            range = tokenizer.cursor.next(/^<<'[a-zA-Z0-9_]+'/);
        if (range != null) {
            ender = range.text.substring(3, range.text.length - 1);
        }
        else {
            range = tokenizer.cursor.next(/^<<[a-zA-Z0-9_]+/);
            if (range == null)
                return 0;
            else
                ender = range.text.substring(2);
        }
        var newTokenType = TokenTypes._r(new RegExp("\\n[\\S\\s]*" + ender + "\\n", "m"));
        newTokenType.name = "heredocValue";
        tokenizer.tempTokenTypes.push(newTokenType);
        var token = this.create(range);
        tokenizer.tokens.push(token);
        tokenizer.cursor.pos = range.end;
        //let line = tokenizer.cursor.pos.line;
        //while (line == tokenizer.cursor.pos.line)
        //    tokenizer.next();
        //let valueToken = newTokenType.tryTokenize(tokenizer);
        //if (valueToken == null)
        //    throw new Error();
        return 1;
    };
    return HereDocTokenType;
}(TokenType));
var TokenTypes = (function () {
    function TokenTypes() {
    }
    TokenTypes.init = function () {
        var _this = this;
        if (this.all != null)
            return;
        this.all = [];
        Object.keys(TokenTypes).forEach(function (k) {
            var tt = TokenTypes[k];
            if (!(tt instanceof TokenType))
                return;
            tt.name = k;
            _this.all.push(tt);
        });
    };
    TokenTypes._fixRegex = function (regex) {
        var regex2 = new RegExp("^" + regex.source, (regex.multiline ? "m" : "") + (regex.global ? "g" : ""));
        return regex2;
    };
    TokenTypes._rs = function (list) {
        var tt = new TokenType();
        list = list.select(function (t) { return TokenTypes._fixRegex(t); });
        tt.tag = list;
        tt.match = function (tokenizer) {
            var res = null;
            list.first(function (regex) {
                var res2 = tokenizer.cursor.next(regex);
                if (res2 != null) {
                    res = res2;
                    return true;
                }
                return false;
            });
            return res;
            //return cursor.next(regex);
        };
        return tt;
    };
    TokenTypes._r = function (regex) {
        var tt = new TokenType();
        regex = TokenTypes._fixRegex(regex);
        tt.match = function (tokenizer) {
            return tokenizer.cursor.next(regex);
        };
        return tt;
    };
    TokenTypes._custom = function (matcher) {
        var tt = new TokenType();
        tt.match = matcher;
        return tt;
    };
    TokenTypes._matchPod = function (tokenizer) {
        var cursor = tokenizer.cursor;
        if (cursor.pos.column > 1)
            return null;
        var start = cursor.next(/^=[a-z]+/);
        if (start == null)
            return null;
        //if (!cursor.startsWith("=pod") && !cursor.startsWith("=encoding"))
        //    return null;
        //let start = cursor.index;
        var cursor2 = cursor.clone();
        cursor2.pos = start.end;
        var end;
        var cut = cursor2.next(/=cut/);
        if (cut != null)
            end = cut.index + 4;
        else
            end = cursor.file.text.length;
        //cursor.pos.index = end;
        var range = new TextRange2(cursor.file, start.start, cursor.file.getPos(end));
        return range;
    };
    TokenTypes._findLastNonWhitespaceOrCommentToken = function (tokens) {
        for (var i = tokens.length - 1; i >= 0; i--) {
            var token = tokens[i];
            if (!token.isAny([TokenTypes.comment, TokenTypes.whitespace]))
                return token;
        }
        return null;
    };
    TokenTypes._matchRegex = function (tokenizer) {
        var cursor = tokenizer.cursor;
        var lastToken = TokenTypes._findLastNonWhitespaceOrCommentToken(tokenizer.tokens);
        if (lastToken == null)
            return null;
        if (lastToken.isAny([TokenTypes.braceClose, TokenTypes.parenClose]))
            return null;
        var res = cursor.next(/^\/.*\/[a-z]*/);
        if (res == null)
            return null;
        var code = res.text.substring(0, res.text.lastIndexOf("/") + 1);
        if (code == "//")
            return null;
        console.log("Detected regex", res.text, lastToken);
        return res;
    };
    TokenTypes.identifierRegex = /[a-zA-Z_][a-zA-Z_0-9]*/;
    // Customary  Generic        Meaning	     Interpolates
    // ''	 q{}	      Literal		  no
    // ""	qq{}	      Literal		  yes
    // ``	qx{}	      Command		  yes*
    //      qw{}	     Word list		  no
    // //	 m{}	   Pattern match	  yes*
    //      qr{}	      Pattern		  yes*
    // 	    s{}{}	    Substitution	  yes*
    //      tr{}{}	  Transliteration	  no (but see below)
    // 	    y{}{}	  Transliteration	  no (but see below)
    // <<EOF                 here-doc            yes*
    // * unless the delimiter is ''.
    TokenTypes.heredoc = new HereDocTokenType(); // TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    TokenTypes.heredocValue = TokenTypes._custom(function (t) { return null; }); // TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    TokenTypes.qq = TokenTypes._rs([/qq\|[^|]*\|/, /qq\{[^\}]*\}/]);
    TokenTypes.qw = TokenTypes._rs([/qw\s*\/[^\/]*\//m, /qw\s*<[^>]*>/m, /qw\s*\([^\)]*\)/m, /qw\s*\[[^\]]*\]/m]);
    TokenTypes.qr = TokenTypes._rs([/qr\/.*\//, /qr\(.*\)/]); //Regexp-like quote
    TokenTypes.qx = TokenTypes._rs([/qx\/.*\//, /`.*`/]);
    TokenTypes.tr = TokenTypes._rs([/tr\/.*\/.*\/[cdsr]*/, /tr\{.*\}\{.*\}/]); //token replace
    TokenTypes.q = TokenTypes._rs([/q\{[^\}]*\}/]);
    TokenTypes.pod = TokenTypes._custom(TokenTypes._matchPod);
    //static pod = TokenTypes._r(/=pod.*=cut/m);
    TokenTypes.keyword = TokenTypes._rs([
        "BEGIN", "package",
        //"use", "no", removed temporarily
        "my", "our",
        "sub", "elsif", "else", "unless", "__END__",
        "and", "not", "or",
        "eq", "ne", "cmp",
        "lt", "gt", "le", "ge",
        "foreach", "while", "for",
        "if", "unless", "while", "until", "for", "foreach", "when" //statement modifiers
    ].map(function (t) { return new RegExp(t + "\\b"); })); //\b|use\b|my\b|sub\b|return\b|if\b|defined\b/
    //, "defined", "ref", "exists"
    TokenTypes.end = TokenTypes._r(/__END__/);
    TokenTypes.whitespace = TokenTypes._r(/[ \t\r\n]+/);
    TokenTypes.packageSeparator = TokenTypes._r(/\:\:/);
    TokenTypes.semicolon = TokenTypes._r(/;/);
    TokenTypes.sigiledIdentifier = TokenTypes._r(new RegExp("[\\$@%&*]" + TokenTypes.identifierRegex.source));
    TokenTypes.evalErrorVar = TokenTypes._r(/\$@/);
    TokenTypes.listSeparatorVar = TokenTypes._r(/\$"/);
    TokenTypes.comment = TokenTypes._r(/\#.*/);
    TokenTypes.equals = TokenTypes._r(/==/);
    TokenTypes.notEquals = TokenTypes._r(/!=/);
    TokenTypes.concatAssign = TokenTypes._r(/\.=/);
    TokenTypes.addAssign = TokenTypes._r(/\+=/);
    TokenTypes.subtractAssign = TokenTypes._r(/\-=/);
    TokenTypes.multiplyAssign = TokenTypes._r(/\+=/);
    TokenTypes.divideAssign = TokenTypes._r(/\/=/);
    TokenTypes.comma = TokenTypes._r(/\,/);
    TokenTypes.integer = TokenTypes._r(/[0-9]+/);
    TokenTypes.parenOpen = TokenTypes._r(/\(/);
    TokenTypes.parenClose = TokenTypes._r(/\)/);
    TokenTypes.braceOpen = TokenTypes._r(/\{/);
    TokenTypes.braceClose = TokenTypes._r(/\}/);
    TokenTypes.bracketOpen = TokenTypes._r(/\[/);
    TokenTypes.bracketClose = TokenTypes._r(/\]/);
    TokenTypes.smallerOrEqualsThan = TokenTypes._r(/\<=/);
    TokenTypes.greaterOrEqualsThan = TokenTypes._r(/\>=/);
    TokenTypes.interpolatedString = TokenTypes._r(/\"[^"]*\"/);
    TokenTypes.string = TokenTypes._r(/\'[^\']*\'/);
    TokenTypes.regex = TokenTypes._custom(TokenTypes._matchRegex); //_r(/\/.*\/[a-z]*/);
    TokenTypes.regexSubstitute = TokenTypes._r(/s\/.*\/.*\/[a-z]*/); // s/abc/def/mg
    TokenTypes.regexMatch = TokenTypes._rs([/m\/.*\/[a-z]*/, /m#.*#[a-z]*/]); // s/abc/def/mg
    TokenTypes.colon = TokenTypes._r(/\:/);
    TokenTypes.question = TokenTypes._r(/\?/);
    //unary:
    TokenTypes.inc = TokenTypes._r(/\+\+/);
    TokenTypes.dec = TokenTypes._r(/\-\-/);
    TokenTypes.codeRef = TokenTypes._r(/\\\&/);
    TokenTypes.lastIndexVar = TokenTypes._r(/\$#/);
    //binary
    TokenTypes.numericCompare = TokenTypes._r(/\<=\>/);
    TokenTypes.regexEquals = TokenTypes._r(/=\~/);
    TokenTypes.regexNotEquals = TokenTypes._r(/\!\~/);
    TokenTypes.smallerThan = TokenTypes._r(/\</);
    TokenTypes.greaterThan = TokenTypes._r(/\>/);
    TokenTypes.arrow = TokenTypes._r(/\-\>/);
    TokenTypes.fatComma = TokenTypes._r(/\=\>/);
    TokenTypes.assignment = TokenTypes._r(/=/);
    TokenTypes.range = TokenTypes._r(/\.\./);
    TokenTypes.concat = TokenTypes._r(/\./);
    TokenTypes.divDiv = TokenTypes._r(/\/\//);
    TokenTypes.tilda = TokenTypes._r(/\~/);
    TokenTypes.or = TokenTypes._r(/\|\|/);
    TokenTypes.and = TokenTypes._r(/\&\&/);
    TokenTypes.minus = TokenTypes._r(/\-/);
    TokenTypes.multiply = TokenTypes._r(/\*/); //also typeglob
    TokenTypes.div = TokenTypes._r(/\//);
    TokenTypes.plus = TokenTypes._r(/\+/);
    TokenTypes.multiplyString = TokenTypes._r(/x\b/);
    TokenTypes.bitwiseOr = TokenTypes._r(/\|/);
    TokenTypes.bitwiseAnd = TokenTypes._r(/\&/);
    TokenTypes.bitwiseXor = TokenTypes._r(/\^/);
    //static label = TokenTypes._r(new RegExp(TokenTypes.identifierRegex.source+"[\t\r\n ]*\:"));
    TokenTypes.identifier = TokenTypes._r(TokenTypes.identifierRegex);
    TokenTypes.makeRef = TokenTypes._r(/\\/);
    TokenTypes.not = TokenTypes._r(/\!/);
    TokenTypes.sigil = TokenTypes._r(/[\$@%&]/);
    return TokenTypes;
}());
