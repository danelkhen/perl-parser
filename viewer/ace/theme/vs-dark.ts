"use strict";
let theme = {
    isDark: true,
    cssClass: "ace-vs-dark",
    cssText: `

.ace-vs-dark {
  background-color: #1e1e1e;
  color: rgb(220,220,220);
  font-size:14px;
}
.ace-vs-dark .ace_scrollbar::-webkit-scrollbar { background-color:#3e3e42; }
.ace-vs-dark .ace_scrollbar::-webkit-scrollbar-thumb { background-color:#686868; border:solid 3px #3e3e42;}
.ace-vs-dark .ace_scrollbar::-webkit-scrollbar-button { background-color:#686868; border:solid 6px #3e3e42;}

.ace-vs-dark .ace_gutter {
  color: rgb(43, 145, 175);
  overflow : hidden;
  border-right: solid 1px #555;
}

/*.ace-vs-dark .ace_print-margin {
  width: 1px;
  background: #e8e8e8;
} */


.ace-vs-dark .ace_cursor {
  border-left:1px solid white;
}

.ace-vs-dark .ace_invisible {
  color: rgb(191, 191, 191);
}

.ace-vs-dark .ace_constant.ace_buildin {
  color: rgb(88, 72, 246);
}

.ace-vs-dark .ace_constant.ace_language {
  color: rgb(88, 92, 246);
}

.ace-vs-dark .ace_constant.ace_library {
  color: rgb(6, 150, 14);
}

.ace-vs-dark .ace_invalid {
  background-color: rgb(153, 0, 0);
  color: white;
}

.ace-vs-dark .ace_fold {
}

.ace-vs-dark .ace_support.ace_function {
  color: rgb(60, 76, 114);
}

.ace-vs-dark .ace_support.ace_constant {
  color: rgb(6, 150, 14);
}

.ace-vs-dark .ace_support.ace_type,
.ace-vs-dark .ace_support.ace_class
.ace-vs-dark .ace_support.ace_other {
  color: rgb(109, 121, 222);
}

.ace-vs-dark .ace_variable.ace_parameter {
  font-style:italic;
  color:#FD971F;
}

/*.ace-vs-dark .ace_keyword.ace_operator {
  color: rgb(104, 118, 135);
}*/

.ace-vs-dark .ace_storage,
.ace-vs-dark .ace_keyword,
.ace-vs-dark .ace_meta.ace_tag { color: rgb(86, 156, 214); }



.ace-vs-dark .ace_pod,
.ace-vs-dark .ace_comment { color: rgb(87,166,74);}



.ace-vs-dark .ace_comment.ace_doc {  color: #236e24; }

.ace-vs-dark .ace_comment.ace_doc.ace_tag {  color: #236e24;}

.ace-vs-dark .ace_integer,
.ace-vs-dark .ace_constant.ace_numeric {  color: rgb(181, 206, 168); }

.ace-vs-dark .ace_variable {  color: rgb(49, 132, 149);}

.ace-vs-dark .ace_xml-pe {  color: rgb(104, 104, 91);}

.ace-vs-dark .ace_entity.ace_name.ace_function {  color: #0000A2;}


.ace-vs-dark .ace_heading {  color: rgb(12, 7, 255);}

.ace-vs-dark .ace_list {  color:rgb(185, 6, 144);}

.ace-vs-dark .ace_marker-layer .ace_selection {
  background: rgba(51, 153, 255, 0.5);
}

.ace-vs-dark .ace_marker-layer .ace_step {
  background: rgb(252, 255, 0);
}

.ace-vs-dark .ace_marker-layer .ace_stack {
  background: rgb(164, 229, 101);
}

.ace-vs-dark .ace_marker-layer .ace_bracket {
  margin: -1px 0 0 -1px;
  border: 1px solid rgb(192, 192, 192);
}

.ace-vs-dark .ace_marker-layer .ace_active-line {
    background:black;
}

.ace-vs-dark .ace_gutter-active-line {
/*  background: rgba(200, 200, 200, 0.2);*/
}

.ace-vs-dark .ace_marker-layer .ace_selected-word {
  background: rgb(250, 250, 255);
  border: 1px solid rgb(200, 200, 250);
}


.ace-vs-dark .ace_heredoc,
.ace-vs-dark .ace_heredocValue,
.ace-vs-dark .ace_bareString,
.ace-vs-dark .ace_string,
.ace-vs-dark .ace_qq,
.ace-vs-dark .ace_qw,
.ace-vs-dark .ace_interpolatedString    { color: rgb(214, 157, 133); }

.ace-vs-dark .ace_regex,
.ace-vs-dark .ace_regexSubstitute,
.ace-vs-dark .ace_qr { color: #d25b29; }

.ace-vs-dark .ace_sigiledIdentifier { color: rgb(215, 186, 125);}


.ace-vs-dark .ace_entity.ace_other.ace_attribute-name { color: #994409; }

/*.ace-vs-dark .ace_indent-guide {  background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==") right repeat-y; }*/
.ace-vs-dark .ace_indent-guide {    border-right: 1px dotted #7d7d7d;}



.ace-vs-dark .ace_builtin-function { color: blue;}
.ace-vs-dark .ace_end { color: blue;}
.ace-vs-dark .ace_package-name { color:red;}
.ace-vs-dark .ace_whitespace { color: inherit;}
.ace-vs-dark .ace_packageSeparator { color: inherit;}
.ace-vs-dark .ace_semicolon { color: inherit;}
.ace-vs-dark .ace_regExpEquals { color: inherit;}
.ace-vs-dark .ace_equals { color: inherit;}
.ace-vs-dark .ace_concatAssign { color: inherit;}
.ace-vs-dark .ace_addAssign { color: inherit;}
.ace-vs-dark .ace_subtractAssign { color: inherit;}
.ace-vs-dark .ace_multiplyAssign { color: inherit;}
.ace-vs-dark .ace_divideAssign { color: inherit;}
.ace-vs-dark .ace_comma { color: inherit;}
.ace-vs-dark .ace_parenOpen { color: inherit;}
.ace-vs-dark .ace_parenClose { color: inherit;}
.ace-vs-dark .ace_braceOpen { color: inherit;}
.ace-vs-dark .ace_braceClose { color: inherit;}
.ace-vs-dark .ace_bracketOpen { color: inherit;}
.ace-vs-dark .ace_bracketClose { color: inherit;}
.ace-vs-dark .ace_smallerOrEqualsThan { color: inherit;}
.ace-vs-dark .ace_greaterOrEqualsThan { color: inherit;}
.ace-vs-dark .ace_smallerThan { color: inherit;}
.ace-vs-dark .ace_greaterThan { color: inherit;}
.ace-vs-dark .ace_arrow { color: inherit;}
.ace-vs-dark .ace_fatComma { color: inherit;}
.ace-vs-dark .ace_assignment { color: inherit;}
.ace-vs-dark .ace_concat { color: inherit;}
.ace-vs-dark .ace_divDiv { color: inherit;}
.ace-vs-dark .ace_tilda { color: inherit;}
.ace-vs-dark .ace_or { color: inherit;}
.ace-vs-dark .ace_and { color: inherit;}
.ace-vs-dark .ace_minus { color: inherit;}
.ace-vs-dark .ace_multiply { color: inherit;}
.ace-vs-dark .ace_plus { color: inherit;}
.ace-vs-dark .ace_multiplyString { color: inherit;}
.ace-vs-dark .ace_identifier { color: inherit;}



/*

.ace-vs-dark .ace_fold-widget {
    background-image:none;
    font-size:13px;
    color: #ccc;
    border: 1px solid #ccc;
    border-radius:0;
    max-height:1em;
    height:1em;
    
}
.ace-vs-dark .ace_fold-widget.ace_open::after {
    content: "-";
}
.ace-vs-dark .ace_fold-widget.ace_closed::after {
    content: "+";
}*/


`

};

var dom = require("ace/lib/dom");
dom.importCssString(theme.cssText, theme.cssClass);
export = theme;
