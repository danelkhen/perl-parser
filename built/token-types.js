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
        var newTokenType = TokenType._r(new RegExp("\\n[\\S\\s]*" + ender + "\\n"));
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
    TokenTypes._matchPod = function (tokenizer) {
        var cursor = tokenizer.cursor;
        if (cursor.pos.column > 1)
            return null;
        var start = cursor.next(/^=[a-z]+/);
        if (start == null)
            return null;
        var cursor2 = cursor.clone();
        cursor2.pos = start.end;
        var end;
        var cut = cursor2.next(/=cut/);
        if (cut != null)
            end = cut.end.index; //.index + 4;
        else
            end = cursor.file.text.length;
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
    TokenTypes.heredocValue = TokenType._custom(function (t) { return null; }); // TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    TokenTypes.qq = TokenType._rs([/qq\|[^|]*\|/, /qq\{[^\}]*\}/]);
    TokenTypes.qw = TokenType._rs([/qw\s*\/[^\/]*\//m, /qw\s*<[^>]*>/m, /qw\s*\([^\)]*\)/m, /qw\s*\[[^\]]*\]/m]);
    TokenTypes.qr = TokenType._rs([/qr\/.*\//, /qr\(.*\)/]); //Regexp-like quote
    TokenTypes.qx = TokenType._rs([/qx\/.*\//, /`.*`/]);
    TokenTypes.tr = TokenType._rs([/tr\/.*\/.*\/[cdsr]*/, /tr\{.*\}\{.*\}/]); //token replace
    TokenTypes.q = TokenType._rs([/q\{[^\}]*\}/]);
    TokenTypes.pod = TokenType._custom(TokenTypes._matchPod);
    //static pod = TokenType._r(/=pod.*=cut/m);
    TokenTypes.statementModifiers = ["if", "unless", "while", "until", "for", "foreach", "when"];
    TokenTypes.namedUnaryOperators = [
        "gethostbyname", "localtime", "return",
        "alarm", "getnetbyname", "lock", "rmdir",
        "caller", "getpgrp", "log", "scalar",
        "chdir", "getprotobyname", "lstat", "sin",
        "chroot", "glob", "my", "sleep",
        "cos", "gmtime", "oct", "sqrt",
        "defined", "goto", "ord", "srand",
        "delete", "hex", "quotemeta", "stat",
        "do", "int", "rand", "uc",
        "eval", "lc", "readlink", "ucfirst",
        "exists", "lcfirst", "ref", "umask",
        "exit", "length", "require", "undef",
    ];
    TokenTypes.keyword = TokenType._words([
        "BEGIN", "package",
        //"use", "no", removed temporarily
        "my", "our",
        "sub", "elsif", "else", "unless", "__END__",
        "and", "not", "or",
        "eq", "ne", "cmp",
        "lt", "gt", "le", "ge",
        "foreach", "while", "for",
    ].concat(TokenTypes.statementModifiers).concat(TokenTypes.namedUnaryOperators));
    //, "defined", "ref", "exists"
    TokenTypes.end = TokenType._r(/__END__/);
    TokenTypes.whitespace = TokenType._r(/[ \t\r\n]+/);
    TokenTypes.packageSeparator = TokenType._r(/\:\:/);
    TokenTypes.semicolon = TokenType._r(/;/);
    TokenTypes.sigiledIdentifier = TokenType._r(new RegExp("[\\$@%&*]" + TokenTypes.identifierRegex.source));
    TokenTypes.evalErrorVar = TokenType._r(/\$@/);
    TokenTypes.listSeparatorVar = TokenType._r(/\$"/);
    TokenTypes.comment = TokenType._r(/\#.*/);
    TokenTypes.equals = TokenType._r(/==/);
    TokenTypes.notEquals = TokenType._r(/!=/);
    TokenTypes.concatAssign = TokenType._r(/\.=/);
    TokenTypes.addAssign = TokenType._r(/\+=/);
    TokenTypes.subtractAssign = TokenType._r(/\-=/);
    TokenTypes.multiplyAssign = TokenType._r(/\+=/);
    TokenTypes.divideAssign = TokenType._r(/\/=/);
    TokenTypes.comma = TokenType._r(/\,/);
    TokenTypes.integer = TokenType._r(/[0-9]+/);
    TokenTypes.parenOpen = TokenType._r(/\(/);
    TokenTypes.parenClose = TokenType._r(/\)/);
    TokenTypes.braceOpen = TokenType._r(/\{/);
    TokenTypes.braceClose = TokenType._r(/\}/);
    TokenTypes.bracketOpen = TokenType._r(/\[/);
    TokenTypes.bracketClose = TokenType._r(/\]/);
    TokenTypes.smallerOrEqualsThan = TokenType._r(/\<=/);
    TokenTypes.greaterOrEqualsThan = TokenType._r(/\>=/);
    TokenTypes.interpolatedString = TokenType._r(/\"[^"]*\"/);
    TokenTypes.string = TokenType._r(/\'[^\']*\'/);
    TokenTypes.regex = TokenType._custom(TokenTypes._matchRegex); //_r(/\/.*\/[a-z]*/);
    TokenTypes.regexSubstitute = TokenType._rs([/s\/.*\/.*\/[a-z]*/, /s#.*#.*#[a-z]*/]); // s/abc/def/mg
    TokenTypes.regexMatch = TokenType._rs([/m\/.*\/[a-z]*/, /m#.*#[a-z]*/]); // s/abc/def/mg
    TokenTypes.colon = TokenType._r(/\:/);
    TokenTypes.question = TokenType._r(/\?/);
    //unary:
    TokenTypes.inc = TokenType._r(/\+\+/);
    TokenTypes.dec = TokenType._r(/\-\-/);
    //static codeRef = TokenType._r(/\\\&/);
    TokenTypes.lastIndexVar = TokenType._r(/\$#/);
    //binary
    TokenTypes.numericCompare = TokenType._r(/\<=\>/);
    TokenTypes.regexEquals = TokenType._r(/=\~/);
    TokenTypes.regexNotEquals = TokenType._r(/\!\~/);
    TokenTypes.smallerThan = TokenType._r(/\</);
    TokenTypes.greaterThan = TokenType._r(/\>/);
    TokenTypes.arrow = TokenType._r(/\-\>/);
    TokenTypes.fatComma = TokenType._r(/\=\>/);
    TokenTypes.assignment = TokenType._r(/=/);
    TokenTypes.range = TokenType._r(/\.\./);
    TokenTypes.concat = TokenType._r(/\./);
    TokenTypes.divDiv = TokenType._r(/\/\//);
    TokenTypes.tilda = TokenType._r(/\~/);
    TokenTypes.or = TokenType._r(/\|\|/);
    TokenTypes.and = TokenType._r(/\&\&/);
    TokenTypes.minus = TokenType._r(/\-/);
    TokenTypes.multiply = TokenType._r(/\*/); //also typeglob
    TokenTypes.div = TokenType._r(/\//);
    TokenTypes.plus = TokenType._r(/\+/);
    TokenTypes.multiplyString = TokenType._r(/x\b/);
    TokenTypes.bitwiseOr = TokenType._r(/\|/);
    TokenTypes.bitwiseAnd = TokenType._r(/\&/);
    TokenTypes.bitwiseXor = TokenType._r(/\^/);
    //static label = TokenType._r(new RegExp(TokenTypes.identifierRegex.source+"[\t\r\n ]*\:"));
    TokenTypes.identifier = TokenType._r(TokenTypes.identifierRegex);
    TokenTypes.makeRef = TokenType._r(/\\/);
    TokenTypes.not = TokenType._r(/\!/);
    TokenTypes.sigil = TokenType._r(/[\$@%&]/);
    return TokenTypes;
}());
