"use strict";
class HereDocTokenType extends TokenType {

    tryTokenize(tokenizer: Tokenizer): number {
        if (!tokenizer.cursor.startsWith("<<"))
            return 0;
        let matchers = [/^<<\s*"([a-zA-Z0-9_]+)"/, /^<<\s*'([a-zA-Z0-9_]+)'/, /^<<\s*([a-zA-Z0-9_]+)/];
        let range = tokenizer.cursor.nextAny(matchers);
        if (range == null)
            return 0;
        let ender = tokenizer.cursor.captureAny(matchers).text;
        //    range = tokenizer.cursor.next(/^<<\s*'[a-zA-Z0-9_]+'/);
        //if (range != null) {
        //    ender = range.text.substring(3, range.text.length - 1).trim();
        //}
        //else {
        //    range = tokenizer.cursor.next(/^<<\s*[a-zA-Z0-9_]+/);
        //    if (range == null)
        //        return 0;
        //    else
        //        ender = range.text.substring(2).trim();
        //}
        let newTokenType = TokenType._r(new RegExp("\\r?\\n[\\S\\s]*?\\r?\\n" + ender + "\\r?\\n"));
        newTokenType.name = "heredocValue";
        tokenizer.tempTokenTypes.push(newTokenType);
        let token = this.create(range);
        tokenizer.tokens.push(token);
        tokenizer.cursor.pos = range.end;

        //let line = tokenizer.cursor.pos.line;
        //while (line == tokenizer.cursor.pos.line)
        //    tokenizer.next();
        //let valueToken = newTokenType.tryTokenize(tokenizer);
        //if (valueToken == null)
        //    throw new Error();

        return 1;
    }

}


class TokenTypes {
    static identifierRegex = /[a-zA-Z_][a-zA-Z_0-9]*/;
    static all: TokenType[];
    static init() {
        if (this.all != null)
            return;
        this.all = [];
        Object.keys(TokenTypes).forEach(k => {
            var tt = TokenTypes[k];
            if (!(tt instanceof TokenType))
                return;
            tt.name = k;
            this.all.push(tt);
        });

    }
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
    static heredoc = new HereDocTokenType();// TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    static heredocValue = TokenType._custom(t=> null);// TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    static qq = TokenType._rs([/qq\|[^|]*\|/, /qq\{[^\}]*\}/]);
    static qw = TokenType._rs([/qw\s*\/[^\/]*\//m, /qw\s*<[^>]*>/m, /qw\s*\([^\)]*\)/m, /qw\s*\[[^\]]*\]/m]);
    static qr = TokenType._rs([/qr\/.*\//, /qr\(.*\)/]);//Regexp-like quote
    static qx = TokenType._rs([/qx\/.*\//, /`.*`/]);
    static tr = TokenType._rs([/tr\/.*\/.*\/[cdsr]*/, /tr\{.*\}\{.*\}/]); //token replace
    static q = TokenType._rs([/q\{[^\}]*\}/]);
    static pod = TokenType._custom(TokenTypes._matchPod);
    //static pod = TokenType._r(/=pod.*=cut/m);
    
    static statementModifiers = ["if", "unless", "while", "until", "for", "foreach", "when"];
    static namedUnaryOperators = [
        "gethostbyname", "localtime", 
        "alarm", "getnetbyname", "lock", "rmdir",
        "caller", "getpgrp", "log", "scalar",
        "chdir", "getprotobyname", "lstat", "sin",
        "chroot", "glob", "my", "sleep",
        "cos", "gmtime", "oct", "sqrt",
        "defined", "ord", "srand",
        "delete", "hex", "quotemeta", "stat",
        "int", "rand", "uc",
        "lc", "readlink", "ucfirst",
        "exists", "lcfirst", "ref", "umask",
        "exit", "length", "require", "undef",
        
        "goto", 
        ];
    
    static specialNamedUnaryOperators = [
        "do", "eval",   //Also parsed as terms are the do {} and eval {} constructs, as well as subroutine and method calls, and the anonymous constructors [] and {} .
        "return", //Unlike most named operators, this is also exempt from the looks-like-a-function rule, so return ("foo")."bar" will cause "bar" to be part of the argument to return.
    ];

    //TODO: exempt from looks like a function rule: return, goto, last, next 


    static keyword = TokenType._words([
        "BEGIN", "package",
        //"use", "no", removed temporarily
        "my", "our", //"local",
        "sub", "elsif", "else", "unless", "__END__", 
        "and", "not", "or",
        "eq", "ne", "cmp",
        "lt", "gt", "le", "ge",
        "foreach", "while", "for",
    ].concat(TokenTypes.statementModifiers).concat(TokenTypes.namedUnaryOperators));


    //, "defined", "ref", "exists"
    static end = TokenType._r(/__END__/);
    static whitespace = TokenType._r(/[ \t\r\n]+/);
    static packageSeparator = TokenType._r(/\:\:/);
    static semicolon = TokenType._r(/;/);
    static sigiledIdentifier = TokenType._r(new RegExp("[\\$@%&*]" + TokenTypes.identifierRegex.source));
    static evalErrorVar = TokenType._r(/\$@/);
    static listSeparatorVar = TokenType._r(/\$"/);
    static ctrlCVar = TokenType._r(/\$\^C/);
    static comment = TokenType._r(/\#.*/);
    static equals = TokenType._r(/==/);
    static notEquals = TokenType._r(/!=/);
    static concatAssign = TokenType._r(/\.=/);
    static addAssign = TokenType._r(/\+=/);
    static subtractAssign = TokenType._r(/\-=/);
    static multiplyAssign = TokenType._r(/\+=/);
    static divideAssign = TokenType._r(/\/=/);
    static divDivAssign = TokenType._r(/\/\/=/);

    static orAssign = TokenType._r(/\|\|=/);
    static comma = TokenType._r(/\,/);
    static integer = TokenType._r(/[0-9]+/);
    static parenOpen = TokenType._r(/\(/);
    static parenClose = TokenType._r(/\)/);
    static braceOpen = TokenType._r(/\{/);
    static braceClose = TokenType._r(/\}/);
    static bracketOpen = TokenType._r(/\[/);
    static bracketClose = TokenType._r(/\]/);
    static smallerOrEqualsThan = TokenType._r(/\<=/);
    static greaterOrEqualsThan = TokenType._r(/\>=/);
    static interpolatedString = TokenType._r(/\"[^"]*\"/);
    static string = TokenType._r(/\'[^\']*\'/);
    static regex = TokenType._custom(TokenTypes._matchRegex);//_r(/\/.*\/[a-z]*/);
    static regexSubstitute = TokenType._rs([/s\/.*\/.*\/[a-z]*/, /s#.*#.*#[a-z]*/]);  // s/abc/def/mg
    static regexMatch = TokenType._rs([/m\/.*\/[a-z]*/, /m#.*#[a-z]*/]);  // s/abc/def/mg

    static colon = TokenType._r(/\:/);
    static question = TokenType._r(/\?/);
    
    //unary:
    static inc = TokenType._r(/\+\+/);
    static dec = TokenType._r(/\-\-/);
    //static codeRef = TokenType._r(/\\\&/);
    static lastIndexVar = TokenType._r(/\$#/);

    
    //binary
    static numericCompare = TokenType._r(/\<=\>/);
    static regexEquals = TokenType._r(/=\~/);
    static regexNotEquals = TokenType._r(/\!\~/);
    static smallerThan = TokenType._r(/\</);
    static greaterThan = TokenType._r(/\>/);
    static arrow = TokenType._r(/\-\>/);
    static fatComma = TokenType._r(/\=\>/);
    static assignment = TokenType._r(/=/);
    static range3 = TokenType._r(/\.\.\./);
    static range = TokenType._r(/\.\./);
    static concat = TokenType._r(/\./);
    static divDiv = TokenType._r(/\/\//);
    static tilda = TokenType._r(/\~/);
    static or = TokenType._r(/\|\|/);
    static and = TokenType._r(/\&\&/);
    static minus = TokenType._r(/\-/);
    static multiply = TokenType._r(/\*/);  //also typeglob
    static div = TokenType._r(/\//);
    static plus = TokenType._r(/\+/);
    static multiplyString = TokenType._r(/x\b/);

    static bitwiseOr = TokenType._r(/\|/);
    static bitwiseAnd = TokenType._r(/\&/);
    static bitwiseXor = TokenType._r(/\^/);

    
    //static label = TokenType._r(new RegExp(TokenTypes.identifierRegex.source+"[\t\r\n ]*\:"));
    static identifier = TokenType._r(TokenTypes.identifierRegex);


    static makeRef = TokenType._r(/\\/);
    static not = TokenType._r(/\!/);
    static sigil = TokenType._r(/[\$@%&]/);










    static binaryOperators: TokenType[] = [
        TokenTypes.numericCompare,
        TokenTypes.regexEquals,
        TokenTypes.regexNotEquals,
        TokenTypes.smallerThan,
        TokenTypes.greaterThan,
        TokenTypes.arrow,
        TokenTypes.comma,
        TokenTypes.fatComma,
        TokenTypes.assignment,
        TokenTypes.range3,
        TokenTypes.range,
        TokenTypes.concat,
        TokenTypes.divDiv,
        TokenTypes.tilda,
        TokenTypes.or,
        TokenTypes.and,
        TokenTypes.minus,
        TokenTypes.multiply,
        TokenTypes.div,
        TokenTypes.plus,
        TokenTypes.multiplyString,
    ];
    static unaryOperators: TokenType[] = [
        TokenTypes.inc,
        TokenTypes.dec,
        TokenTypes.not,
    ];

    static _matchPod(tokenizer: Tokenizer): TextRange2 {
        let cursor = tokenizer.cursor;
        if (cursor.pos.column > 1)
            return null;
        let start = cursor.next(/^=[a-z]+/);
        if (start == null)
            return null;

        let cursor2 = cursor.clone();
        cursor2.pos = start.end;

        let end: number;
        let cut = cursor2.next(/=cut/);
        if (cut != null)
            end = cut.end.index;//.index + 4;
        else
            end = cursor.file.text.length;
        let range = new TextRange2(cursor.file, start.start, cursor.file.getPos(end));
        return range;
    }

    static _findLastNonWhitespaceOrCommentToken(tokens: Token[]) {
        for (let i = tokens.length - 1; i >= 0; i--) {
            let token = tokens[i];
            if (!token.isAny([TokenTypes.comment, TokenTypes.whitespace]))
                return token;
        }
        return null;
    }
    static _matchRegex(tokenizer: Tokenizer): TextRange2 { //figure out how to distinguish between regex and two divisions. a / b / c, is it a(/b/c), or (a / b) / c ?
        let cursor = tokenizer.cursor;
        let lastToken = TokenTypes._findLastNonWhitespaceOrCommentToken(tokenizer.tokens);
        if (lastToken == null)
            return null;
        if (lastToken.isAny([TokenTypes.braceClose, TokenTypes.parenClose]))
            return null;
        let res = cursor.next(/^\/.*\/[a-z]*/);
        if (res == null)
            return null;
        let code = res.text.substring(0, res.text.lastIndexOf("/") + 1);
        if (code == "//")
            return null;
        console.log("Detected regex", res.text, lastToken);
        return res;
    }



}
