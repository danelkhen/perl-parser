"use strict";
import {Token, TokenType, } from "./token";
import {Tokenizer} from "./tokenizer";
import {TextFile, TextFilePos, TextFileRange, Cursor} from "./text";
let _r = TokenType.regex;
let _rs = TokenType.anyRegex;
let _custom = TokenType.custom;
let _words = TokenType.words;

export class HereDocTokenType extends TokenType {

    tryTokenize(tokenizer: Tokenizer): number {
        if (!tokenizer.cursor.startsWith("<<"))
            return 0;
        let matchers = [/^<<\s*"([a-zA-Z0-9_\-]+)"/, /^<<\s*'([a-zA-Z0-9_\-]+)'/, /^<<\s*([a-zA-Z0-9_]+)/];
        let range = tokenizer.cursor.nextAny(matchers);
        if (range == null)
            return 0;
        let ender = tokenizer.cursor.captureAny(matchers).text;
        let newTokenType = _r(new RegExp("\\r?\\n[\\S\\s]*?\\r?\\n" + ender + "\\r?\\n"));
        newTokenType.name = "heredocValue";
        tokenizer.tempTokenTypes.push(newTokenType);
        let token = this.create(range);
        tokenizer.tokens.push(token);
        tokenizer.cursor.pos = range.end;
        return 1;
    }

}




export class TokenTypes {
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
    static heredocValue = _custom(t => null);// TokenTypes._custom(TokenTypes.match(/<<"([a-zA-Z0-9]+)"[\s\S]*$/m);
    static bareString = _custom(t => {
        let lastToken = TokenTypes._findLastNonWhitespaceOrCommentToken(t.tokens);
        if (lastToken != null && lastToken.isAny([TokenTypes.arrow, TokenTypes.packageSeparator]))
            return null;
        let res = t.cursor.capture(/^(\-?[a-zA-Z_]+[a-zA-Z0-9_]*)?\s*?\=>/);
        return res;
    });
    static qq = _rs([/qq\s*?\|[^|]*\|/, /qq\s*?\{[^\}]*\}/]);
    static qw = _rs([/qw\s*\/[^\/]*\//, /qw\s*<[^>]*>/, /qw\s*\([^\)]*\)/, /qw\s*\[[^\]]*\]/, /qw\s*\{[^\}]*\}/]);
    static qr = _rs([/qr\/[^\/]*?\/[a-z]*/, /qr\([^\)]*?\)[a-z]*/, /qr\{[^\}]*?\}[a-z]*/]);//Regexp-like quote
    static qx = _rs([/qx\/.*\//, /`.*`/]);
    static tr = _rs([/tr\/.*\/.*\/[cdsr]*/, /tr\{.*\}\{.*\}/]); //token replace
    static q = _rs([/q\{[^\}]*\}/]);
    static pod = _custom(TokenTypes._matchPod);
    //static pod = _r(/=pod.*=cut/m);

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

    static builtinFunctions = [
        "\"current_sub\"",
        "\"evalbytes\"",
        "\"fc\"",
        "\"say\"",
        "\"state\"",
        "\"switch\"",
        "/etc/passwd",
        "AUTOLOAD",
        "BEGIN",
        "CHECK",
        "CORE",
        "CORE::",
        "DESTROY",
        "END",
        "I/O",
        "INIT",
        "IP",
        "IPC",
        "System V",
        "UNITCHECK",
        "Unix",
        "X",
        "__DATA__",
        "__END__",
        "__FILE__",
        "__LINE__",
        "__PACKAGE__",
        "__SUB__",
        "abs",
        "accept",
        "address",
        "alarm",
        "and",
        "array",
        "atan2",
        "bind",
        "binmode",
        "bless",
        "break",
        "caller",
        "character",
        "chdir",
        "chmod",
        "chomp",
        "chop",
        "chown",
        "chr",
        "chroot",
        "class",
        "close",
        "closedir",
        "cmp",
        "connect",
        "continue",
        "control flow",
        "cos",
        "crypt",
        "date",
        "dbm",
        "dbmclose",
        "dbmopen",
        "default",
        "defined",
        "delete",
        "die",
        "directory",
        "do",
        "dump",
        "each",
        "else",
        "elseif",
        "elsif",
        "endgrent",
        "endhostent",
        "endnetent",
        "endprotoent",
        "endpwent",
        "endservent",
        "eof",
        "eq",
        "eval",
        "evalbytes",
        "exec",
        "exists",
        "exit",
        "exp",
        "fc",
        "fcntl",
        "feature",
        "file",
        "filehandle",
        "fileno",
        "flock",
        "for",
        "foreach",
        "fork",
        "format",
        "formline",
        "function",
        "ge",
        "getc",
        "getgrent",
        "getgrgid",
        "getgrnam",
        "gethostbyaddr",
        "gethostbyname",
        "gethostent",
        "getlogin",
        "getnetbyaddr",
        "getnetbyname",
        "getnetent",
        "getpeername",
        "getpgrp",
        "getppid",
        "getpriority",
        "getprotobyname",
        "getprotobynumber",
        "getprotoent",
        "getpwent",
        "getpwnam",
        "getpwuid",
        "getservbyname",
        "getservbyport",
        "getservent",
        "getsockname",
        "getsockopt",
        "gid",
        "given",
        "glob",
        "gmtime",
        "goto",
        "grep",
        "group",
        "gt",
        "hash",
        "hex",
        "host",
        "hostname",
        "if",
        "import",
        "index",
        "input",
        "int",
        "ioctl",
        "join",
        "keys",
        "kill",
        "last",
        "lc",
        "lcfirst",
        "le",
        "length",
        "link",
        "list",
        "listen",
        "local",
        "localtime",
        "lock",
        "log",
        "lstat",
        "lt",
        "map",
        "memory",
        "message",
        "mkdir",
        "module",
        "msgctl",
        "msgget",
        "msgrcv",
        "msgsnd",
        "my",
        "ne",
        "network",
        "next",
        "no",
        "not",
        "number",
        "numeric",
        "object",
        "oct",
        "open",
        "opendir",
        "or",
        "ord",
        "our",
        "output",
        "pack",
        "package",
        "passwd",
        "password",
        "perlport",
        "perlsyn/\"Switch Statements\"",
        "pid",
        "pipe",
        "pop",
        "portability",
        "portable",
        "pos",
        "print",
        "printf",
        "process",
        "process id",
        "protocol",
        "prototype",
        "push",
        "quotemeta",
        "rand",
        "read",
        "readdir",
        "readline",
        "readlink",
        "readpipe",
        "recv",
        "redo",
        "ref",
        "regex",
        "regexp",
        "regular expression",
        "rename",
        "require",
        "reset",
        "return",
        "reverse",
        "rewinddir",
        "rindex",
        "rmdir",
        "say",
        "scalar",
        "seek",
        "seekdir",
        "select",
        "semaphore",
        "semctl",
        "semget",
        "semop",
        "send",
        "service",
        "setgrent",
        "sethostent",
        "setnetent",
        "setpgrp",
        "setpriority",
        "setprotoent",
        "setpwent",
        "setservent",
        "setsockopt",
        "shared memory",
        "shift",
        "shmctl",
        "shmget",
        "shmread",
        "shmwrite",
        "shutdown",
        "sin",
        "sleep",
        "sock",
        "socket",
        "socketpair",
        "sol",
        "sort",
        "splice",
        "split",
        "sprintf",
        "sqrt",
        "srand",
        "stat",
        "state",
        "string",
        "study",
        "sub",
        "substr",
        "symlink",
        "syscall",
        "sysopen",
        "sysread",
        "sysseek",
        "system",
        "syswrite",
        "tell",
        "telldir",
        "tie",
        "tied",
        "time",
        "times",
        "trigonometric",
        "trigonometry",
        "truncate",
        "uc",
        "ucfirst",
        "uid",
        "umask",
        "undef",
        "unless",
        "unlink",
        "unpack",
        "unshift",
        "untie",
        "until",
        "use",
        "use v5.10",
        "use v5.16",
        "user",
        "utime",
        "values",
        "vec",
        "wait",
        "waitpid",
        "wantarray",
        "warn",
        "when",
        "while",
        "write",
        "x",
        "xor"
    ];

    static pragmas = [
        "attributes",
        "autodie",
        "autouse",
        "base",
        "bigint",
        "bignum",
        "bigrat",
        "blib",
        "bytes",
        "charnames",
        "constant",
        "diagnostics",
        "encoding",
        "feature",
        "fields",
        "filetest",
        "if",
        "integer",
        "less",
        "lib",
        "locale",
        "mro",
        "open",
        "ops",
        "overload",
        "overloading",
        "parent",
        "re",
        "sigtrap",
        "sort",
        "strict",
        "subs",
        "threads",
        "threads::shared",
        "utf8",
        "vars",
        "vmsish",
        "warnings",
        "warnings::register",
    ];

    static specialNamedUnaryOperators = [
        "do", "eval",   //Also parsed as terms are the do {} and eval {} constructs, as well as subroutine and method calls, and the anonymous constructors [] and {} .
        "return", //Unlike most named operators, this is also exempt from the looks-like-a-function rule, so return ("foo")."bar" will cause "bar" to be part of the argument to return.
    ];

    //TODO: exempt from looks like a function rule: return, goto, last, next 


    static keyword = _words([
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
    static end = _r(/__END__/);
    static whitespace = _rs([/[ \t]+/,/[\r?\n]/]); //line breaks (\r?\n) will always be separate tokens per line break
    static packageSeparator = _r(/\:\:/);
    static semicolon = _r(/;/);
    static sigiledIdentifier = _r(new RegExp("[\\$@%&*]" + TokenTypes.identifierRegex.source));
    static evalErrorVar = _r(/\$@/);
    static listSeparatorVar = _r(/\$"/);
    static ctrlCVar = _r(/\$\^C/);
    static comment = _r(/\#.*/);
    static equals = _r(/==/);
    static notEquals = _r(/!=/);
    static concatAssign = _r(/\.=/);
    static addAssign = _r(/\+=/);
    static subtractAssign = _r(/\-=/);
    static multiplyAssign = _r(/\+=/);
    static divideAssign = _r(/\/=/);
    static xorAssign = _r(/\^=/);
    static divDivAssign = _r(/\/\/=/);

    static orAssign = _r(/\|\|=/);
    static comma = _r(/\,/);
    static integer = _r(/[0-9]+/);
    static parenOpen = _r(/\(/);
    static parenClose = _r(/\)/);
    static braceOpen = _r(/\{/);
    static braceClose = _r(/\}/);
    static bracketOpen = _r(/\[/);
    static bracketClose = _r(/\]/);
    static interpolatedString = _r(/\"(\\.|[^"])*\"/);//_r(/\"[^"]*\"/);
    static string = _r(/\'[^\']*\'/);
    static regex = _custom(TokenTypes._matchRegex);//_r(/\/.*\/[a-z]*/);
    static regexSubstitute = _rs([/s\/.*\/.*\/[a-z]*/, /s#.*#.*#[a-z]*/, /s\{.*\}\{.*\}[a-z]*/, /s\,[^\,]*\,[^\,]*\,[a-z]*/]);  // s/abc/def/mg
    static regexMatch = _rs([/m\/.*\/[a-z]*/, /m#.*#[a-z]*/, /m\{.*?\}[a-z]*/]);  // s/abc/def/mg

    static colon = _r(/\:/);
    static question = _r(/\?/);

    //unary:
    static inc = _r(/\+\+/);
    static dec = _r(/\-\-/);
    //static codeRef = _r(/\\\&/);
    static lastIndexVar = _r(/\$#/);


    //binary
    static numericCompare = _r(/\<=\>/);
    static smallerThanOrEquals = _r(/\<=/);
    static greaterThanOrEquals = _r(/\>=/);
    static regexEquals = _r(/=\~/);
    static regexNotEquals = _r(/\!\~/);
    static smallerThan = _r(/\</);
    static greaterThan = _r(/\>/);
    static arrow = _r(/\-\>/);
    static fatComma = _r(/\=\>/);
    static assignment = _r(/=/);
    static range3 = _r(/\.\.\./);
    static range = _r(/\.\./);
    static concat = _r(/\./);
    static divDiv = _r(/\/\//);
    static tilda = _r(/\~/);
    static or = _r(/\|\|/);
    static and = _r(/\&\&/);
    static minus = _r(/\-/);
    static multiply = _r(/\*/);  //also typeglob
    static div = _r(/\//);
    static plus = _r(/\+/);
    static multiplyString = _r(/x\b/);

    static bitwiseOr = _r(/\|/);
    static bitwiseAnd = _r(/\&/);
    static bitwiseXor = _r(/\^/);


    //static label = _r(new RegExp(TokenTypes.identifierRegex.source+"[\t\r\n ]*\:"));
    static identifier = _r(TokenTypes.identifierRegex);


    static makeRef = _r(/\\/);
    static not = _r(/\!/);
    static sigil = _r(/[\$@%&]/);



    static unknown = _r(/.*/);







    static binaryOperators: TokenType[] = [
        TokenTypes.numericCompare,
        TokenTypes.regexEquals,
        TokenTypes.regexNotEquals,
        TokenTypes.smallerThan,
        TokenTypes.smallerThanOrEquals,
        TokenTypes.greaterThan,
        TokenTypes.greaterThanOrEquals,
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
        TokenTypes.equals,
        TokenTypes.notEquals,
    ];
    static unaryOperators: TokenType[] = [
        TokenTypes.inc,
        TokenTypes.dec,
        TokenTypes.not,
    ];

    static _matchPod(tokenizer: Tokenizer): TextFileRange {
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
        let range = new TextFileRange(cursor.file, start.start, cursor.file.getPos(end));
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
    static _matchRegex(tokenizer: Tokenizer): TextFileRange { //figure out how to distinguish between regex and two divisions. a / b / c, is it a(/b/c), or (a / b) / c ?
        let cursor = tokenizer.cursor;
        let lastToken = TokenTypes._findLastNonWhitespaceOrCommentToken(tokenizer.tokens);
        if (lastToken == null)
            return null;
        if (lastToken.isAny([TokenTypes.braceClose, TokenTypes.parenClose, TokenTypes.sigiledIdentifier, TokenTypes.integer]))
            return null;
        let res = cursor.next(/^\/.*?\/[a-z]*/);
        if (res == null)
            return null;
        if (cursor.next(/^\/\/\s*?\,/) != null)  //make //, to be considered regex
            return res;
        if (cursor.next(/^\/\//) != null)  //prevent // from being considered regex
            return null;
        //let code = res.text.substring(0, res.text.lastIndexOf("/") + 1);
        //if (code == "//")
        //    return null;
        //console.log("Detected regex", res.text, lastToken);
        return res;
    }



}
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
//let line = tokenizer.cursor.pos.line;
//while (line == tokenizer.cursor.pos.line)
//    tokenizer.next();
//let valueToken = newTokenType.tryTokenize(tokenizer);
//if (valueToken == null)
//    throw new Error();
