"use strict";
class HereDocTokenType extends TokenType {

    tryTokenize(tokenizer: Tokenizer): number {
        if (!tokenizer.cursor.startsWith("<<"))
            return 0;
        let ender;
        let range = tokenizer.cursor.next(/^<<"[a-zA-Z0-9_]+"/);
        if (range == null)
            range = tokenizer.cursor.next(/^<<'[a-zA-Z0-9_]+'/);
        if (range != null) {
            ender = range.text.substring(3, range.text.length - 1)
        }
        else {
            range = tokenizer.cursor.next(/^<<[a-zA-Z0-9_]+/);
            if (range == null)
                return 0;
            else
                ender = range.text.substring(2);
        }
        let newTokenType = TokenTypes._r(new RegExp("\\n[\\S\\s]*" + ender + "\\n", "m"));
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

    static _fixRegex(regex: RegExp): RegExp {
        let regex2 = new RegExp("^" + regex.source, (regex.multiline ? "m" : "") + (regex.global ? "g" : ""));
        return regex2;
    }
    static _rs(list: RegExp[]): TokenType {
        let tt = new TokenType();
        list = list.select(t=> TokenTypes._fixRegex(t));
        tt.tag = list;
        tt.match = tokenizer => {
            let res = null;
            list.first(regex => {
                let res2 = tokenizer.cursor.next(regex);
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
    }
    static _r(regex: RegExp): TokenType {
        let tt = new TokenType();
        regex = TokenTypes._fixRegex(regex);
        tt.match = tokenizer => {
            return tokenizer.cursor.next(regex);
        };
        return tt;
    }
    static _custom(matcher: TokenMatcher): TokenType {
        let tt = new TokenType();
        tt.match = matcher;
        return tt;
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
    static heredocValue = TokenTypes._custom(t=> null);// TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    static qq = TokenTypes._rs([/qq\|[^|]*\|/, /qq\{[^\}]*\}/]);
    static qw = TokenTypes._rs([/qw\s*\/[^\/]*\//m, /qw\s*<[^>]*>/m, /qw\s*\([^\)]*\)/m, /qw\s*\[[^\]]*\]/m]);
    static qr = TokenTypes._rs([/qr\/.*\//, /qr\(.*\)/]);//Regexp-like quote
    static qx = TokenTypes._rs([/qx\/.*\//, /`.*`/]);
    static tr = TokenTypes._rs([/tr\/.*\/.*\/[cdsr]*/, /tr\{.*\}\{.*\}/]); //token replace
    static q = TokenTypes._rs([/q\{[^\}]*\}/]);
    static pod = TokenTypes._custom(TokenTypes._matchPod);
    //static pod = TokenTypes._r(/=pod.*=cut/m);
    static keyword = TokenTypes._rs([
        "BEGIN", "package",
        //"use", "no", removed temporarily
        "my", "our", //"local",
        "sub", "elsif", "else", "unless", "__END__", //"return", 
        "and", "not", "or",
        "eq", "ne", "cmp",
        "lt", "gt", "le", "ge",
        "foreach", "while", "for",
        "if", "unless", "while", "until", "for", "foreach", "when"    //statement modifiers
    ].map(t=> new RegExp(t + "\\b"))); //\b|use\b|my\b|sub\b|return\b|if\b|defined\b/
    //, "defined", "ref", "exists"
    static end = TokenTypes._r(/__END__/);
    static whitespace = TokenTypes._r(/[ \t\r\n]+/);
    static packageSeparator = TokenTypes._r(/\:\:/);
    static semicolon = TokenTypes._r(/;/);
    static sigiledIdentifier = TokenTypes._r(new RegExp("[\\$@%&*]" + TokenTypes.identifierRegex.source));
    static evalErrorVar = TokenTypes._r(/\$@/);
    static listSeparatorVar = TokenTypes._r(/\$"/);
    static comment = TokenTypes._r(/\#.*/);
    static equals = TokenTypes._r(/==/);
    static notEquals = TokenTypes._r(/!=/);
    static concatAssign = TokenTypes._r(/\.=/);
    static addAssign = TokenTypes._r(/\+=/);
    static subtractAssign = TokenTypes._r(/\-=/);
    static multiplyAssign = TokenTypes._r(/\+=/);
    static divideAssign = TokenTypes._r(/\/=/);
    static comma = TokenTypes._r(/\,/);
    static integer = TokenTypes._r(/[0-9]+/);
    static parenOpen = TokenTypes._r(/\(/);
    static parenClose = TokenTypes._r(/\)/);
    static braceOpen = TokenTypes._r(/\{/);
    static braceClose = TokenTypes._r(/\}/);
    static bracketOpen = TokenTypes._r(/\[/);
    static bracketClose = TokenTypes._r(/\]/);
    static smallerOrEqualsThan = TokenTypes._r(/\<=/);
    static greaterOrEqualsThan = TokenTypes._r(/\>=/);
    static interpolatedString = TokenTypes._r(/\"[^"]*\"/);
    static string = TokenTypes._r(/\'[^\']*\'/);
    static regex = TokenTypes._custom(TokenTypes._matchRegex);//_r(/\/.*\/[a-z]*/);
    static regexSubstitute = TokenTypes._r(/s\/.*\/.*\/[a-z]*/);  // s/abc/def/mg
    static regexMatch = TokenTypes._rs([/m\/.*\/[a-z]*/, /m#.*#[a-z]*/]);  // s/abc/def/mg

    static colon = TokenTypes._r(/\:/);
    static question = TokenTypes._r(/\?/);
    
    //unary:
    static inc = TokenTypes._r(/\+\+/);
    static dec = TokenTypes._r(/\-\-/);
    static codeRef = TokenTypes._r(/\\\&/);
    static lastIndexVar = TokenTypes._r(/\$#/);
    
    //binary
    static numericCompare = TokenTypes._r(/\<=\>/);
    static regexEquals = TokenTypes._r(/=\~/);
    static regexNotEquals = TokenTypes._r(/\!\~/);
    static smallerThan = TokenTypes._r(/\</);
    static greaterThan = TokenTypes._r(/\>/);
    static arrow = TokenTypes._r(/\-\>/);
    static fatComma = TokenTypes._r(/\=\>/);
    static assignment = TokenTypes._r(/=/);
    static range = TokenTypes._r(/\.\./);
    static concat = TokenTypes._r(/\./);
    static divDiv = TokenTypes._r(/\/\//);
    static tilda = TokenTypes._r(/\~/);
    static or = TokenTypes._r(/\|\|/);
    static and = TokenTypes._r(/\&\&/);
    static minus = TokenTypes._r(/\-/);
    static multiply = TokenTypes._r(/\*/);  //also typeglob
    static div = TokenTypes._r(/\//);
    static plus = TokenTypes._r(/\+/);
    static multiplyString = TokenTypes._r(/x\b/);

    static bitwiseOr = TokenTypes._r(/\|/);
    static bitwiseAnd = TokenTypes._r(/\&/);
    static bitwiseXor = TokenTypes._r(/\^/);
    
    //static label = TokenTypes._r(new RegExp(TokenTypes.identifierRegex.source+"[\t\r\n ]*\:"));
    static identifier = TokenTypes._r(TokenTypes.identifierRegex);


    static makeRef = TokenTypes._r(/\\/);
    static not = TokenTypes._r(/\!/);
    static sigil = TokenTypes._r(/[\$@%&]/);

    static _matchPod(tokenizer: Tokenizer): TextRange2 {
        let cursor = tokenizer.cursor;
        if (cursor.pos.column > 1)
            return null;
        let start = cursor.next(/^=[a-z]+/);
        if (start == null)
            return null;
        //if (!cursor.startsWith("=pod") && !cursor.startsWith("=encoding"))
        //    return null;
        //let start = cursor.index;
        let cursor2 = cursor.clone();
        cursor2.pos = start.end;

        let end: number;
        let cut = cursor2.next(/=cut/);
        if (cut != null)
            end = cut.index + 4;
        else
            end = cursor.file.text.length;
        //cursor.pos.index = end;
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
