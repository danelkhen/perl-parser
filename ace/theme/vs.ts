"use strict";
let theme = {
    isDark: false,
    cssClass: "ace-vs",
    cssText: `
.ace-vs .ace_ace_gutter {
  background: #ebebeb;
  color: #333;
  overflow : hidden;
}

.ace-vs .ace_ace_print-margin {
  width: 1px;
  background: #e8e8e8;
}

.ace-vs {
  background-color: #FFFFFF;
  color: black;
}

.ace-vs .ace_ace_cursor {
  color: black;
}

.ace-vs .ace_ace_invisible {
  color: rgb(191, 191, 191);
}

.ace-vs .ace_ace_constant.ace_buildin {
  color: rgb(88, 72, 246);
}

.ace-vs .ace_ace_constant.ace_language {
  color: rgb(88, 92, 246);
}

.ace-vs .ace_ace_constant.ace_library {
  color: rgb(6, 150, 14);
}

.ace-vs .ace_ace_invalid {
  background-color: rgb(153, 0, 0);
  color: white;
}

.ace-vs .ace_ace_fold {
}

.ace-vs .ace_ace_support.ace_function {
  color: rgb(60, 76, 114);
}

.ace-vs .ace_ace_support.ace_constant {
  color: rgb(6, 150, 14);
}

.ace-vs .ace_ace_support.ace_type,
.ace-vs .ace_ace_support.ace_class
.ace-vs .ace_ace_support.ace_other {
  color: rgb(109, 121, 222);
}

.ace-vs .ace_ace_variable.ace_parameter {
  font-style:italic;
  color:#FD971F;
}
.ace-vs .ace_ace_keyword.ace_operator {
  color: rgb(104, 118, 135);
}

.ace-vs .ace_ace_comment {
  color: #236e24;
}

.ace-vs .ace_ace_comment.ace_doc {
  color: #236e24;
}

.ace-vs .ace_ace_comment.ace_doc.ace_tag {
  color: #236e24;
}

.ace-vs .ace_ace_constant.ace_numeric {
  color: rgb(0, 0, 205);
}

.ace-vs .ace_ace_variable {
  color: rgb(49, 132, 149);
}

.ace-vs .ace_ace_xml-pe {
  color: rgb(104, 104, 91);
}

.ace-vs .ace_ace_entity.ace_name.ace_function {
  color: #0000A2;
}


.ace-vs .ace_ace_heading {
  color: rgb(12, 7, 255);
}

.ace-vs .ace_ace_list {
  color:rgb(185, 6, 144);
}

.ace-vs .ace_ace_marker-layer .ace_selection {
  background: rgb(181, 213, 255);
}

.ace-vs .ace_ace_marker-layer .ace_step {
  background: rgb(252, 255, 0);
}

.ace-vs .ace_ace_marker-layer .ace_stack {
  background: rgb(164, 229, 101);
}

.ace-vs .ace_ace_marker-layer .ace_bracket {
  margin: -1px 0 0 -1px;
  border: 1px solid rgb(192, 192, 192);
}

.ace-vs .ace_ace_marker-layer .ace_active-line {
  background: rgba(0, 0, 0, 0.07);
}

.ace-vs .ace_ace_gutter-active-line {
    background-color : #dcdcdc;
}

.ace-vs .ace_ace_marker-layer .ace_selected-word {
  background: rgb(250, 250, 255);
  border: 1px solid rgb(200, 200, 250);
}

.ace-vs .ace_ace_storage,
.ace-vs .ace_ace_keyword,
.ace-vs .ace_ace_meta.ace_tag {
  color: rgb(147, 15, 128);
}

.ace-vs .ace_ace_string.ace_regex {
  color: rgb(255, 0, 0)
}

.ace-vs .ace_ace_string {
  color: #1A1AA6;
}

.ace-vs .ace_ace_entity.ace_other.ace_attribute-name {
  color: #994409;
}

.ace-vs .ace_ace_indent-guide {
  background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==") right repeat-y;
}














.ace-vs .ace_qq { color: red;}
.ace-vs .ace_pod { color: darkgreen;}
.ace-vs .ace_keyword { color: blue;}
.ace-vs .ace_builtin-function { color: blue;}
        
.ace-vs .ace_end { color: blue;}
.ace-vs .ace_sigiledIdentifier { color: #FF8700;}
.ace-vs .ace_integer { color: red;}
.ace-vs .ace_interpolatedString { color: brown;}
.ace-vs .ace_bareString { color: brown;}
.ace-vs .ace_string { color: brown;}
.ace-vs .ace_heredoc { color: brown;}
.ace-vs .ace_heredocValue { color: brown;}
.ace-vs .ace_regex { color: red;}
.ace-vs .ace_regexSubstitute { color: red;}
.ace-vs .ace_package-name { color:red;}
        
        
        
.ace-vs .ace_whitespace { color: inherit;}
.ace-vs .ace_packageSeparator { color: inherit;}
.ace-vs .ace_semicolon { color: inherit;}
.ace-vs .ace_comment { color: green;}
.ace-vs .ace_regExpEquals { color: inherit;}
.ace-vs .ace_equals { color: inherit;}
.ace-vs .ace_concatAssign { color: inherit;}
.ace-vs .ace_addAssign { color: inherit;}
.ace-vs .ace_subtractAssign { color: inherit;}
.ace-vs .ace_multiplyAssign { color: inherit;}
.ace-vs .ace_divideAssign { color: inherit;}
.ace-vs .ace_comma { color: inherit;}
.ace-vs .ace_parenOpen { color: inherit;}
.ace-vs .ace_parenClose { color: inherit;}
.ace-vs .ace_braceOpen { color: inherit;}
.ace-vs .ace_braceClose { color: inherit;}
.ace-vs .ace_bracketOpen { color: inherit;}
.ace-vs .ace_bracketClose { color: inherit;}
.ace-vs .ace_smallerOrEqualsThan { color: inherit;}
.ace-vs .ace_greaterOrEqualsThan { color: inherit;}
.ace-vs .ace_smallerThan { color: inherit;}
.ace-vs .ace_greaterThan { color: inherit;}
.ace-vs .ace_arrow { color: inherit;}
.ace-vs .ace_fatComma { color: inherit;}
.ace-vs .ace_assignment { color: inherit;}
.ace-vs .ace_concat { color: inherit;}
.ace-vs .ace_divDiv { color: inherit;}
.ace-vs .ace_tilda { color: inherit;}
.ace-vs .ace_or { color: inherit;}
.ace-vs .ace_and { color: inherit;}
.ace-vs .ace_minus { color: inherit;}
.ace-vs .ace_multiply { color: inherit;}
.ace-vs .ace_plus { color: inherit;}
.ace-vs .ace_multiplyString { color: inherit;}
.ace-vs .ace_identifier { color: inherit;}

`

};

var dom = require("../lib/dom");
dom.importCssString(theme.cssText, theme.cssClass);
export = theme;
