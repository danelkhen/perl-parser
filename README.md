# perl-parser
Perl parser written in TypeScript, can run on nodejs or a browser

## Installation
* Install nodejs
```
npm install -g typescript typings
git clone https://github.com/danelkhen/perl-parser.git
git clone https://github.com/ajaxorg/ace.git
cd perl-parser
npm install
typings install
```

## Compilation
```
tsc -p perl-parser-es6
tsc -p server

tsc -p perl-parser
tsc -p viewer
```

* add `-w` to watch and recompile automatically

## Running the server
```
node built/server/server.js
```


