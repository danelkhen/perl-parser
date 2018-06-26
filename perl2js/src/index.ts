import "./global.js"
import { masonFileToPerl, MasonDoc, tokenizeMason, MasonBlock, BlockTypeName, getFile } from "./mason.js"
import { parseExpression, parseUnit, findTopSymbols, } from "./perl.js"
import { process, generateJs, PerlToJsAstWriter, perlIdentifierToJs, perlToJs } from "./convert.js"
import { arrayMin, regexExec, pathJoin } from "./utils.js"
//import "./expression-parser.js"

let testFilename = "test.html";

export function $<T extends HTMLElement>(selector: string): T {
    return document.querySelector(selector) as T;
}
export async function main() {
    $<HTMLInputElement>(".tbFilename").value = testFilename;
    $<HTMLInputElement>(".tbFilename").addEventListener("input", e => testFilename = (e.target as HTMLInputElement).value);
    let res = await process({ file: testFilename });
    console.log(res);
    document.querySelector("#code").textContent = res.js;
    document.querySelector("#preview").textContent = [res.doc].concat(res.doc.subDocs).map(t => t.unit.toCode()).join("\n\n\n\n");
}

export async function go() {
    main();

}





function createHtml() {
    let file2 = new File([
        `<!doctype html>
<html>
    <head></head>
    <body>hello world</body>
</html>

`], "ggg.html", { type: "text/html" });
    let url = URL.createObjectURL(file2);
    let a = document.createElement("a");
    a.href = url;
    //a.target = "_blank";
    a.innerText = "ggg.html";
    document.body.appendChild(a);

}



export async function updatePreviewUrl() {
    let html = await getFile("./out/test/test.html");
    let file = new File([html], "ggg.html", { type: "text/html" });
    let url = URL.createObjectURL(file);
    (document.querySelector(".btnPreview") as HTMLAnchorElement).href = url;
    //window.open(url);
}

//async function main4(file) {
//    let tokens = await tokenizeMasonFile(file);
//    let exps = tokens.filter(t => t.type == "expressionBlock" || t.type == "codeLine");
//    let list = [];
//    for (let exp of exps) {
//        let pre = document.createElement("pre");
//        let code = exp.match[1].trim();
//        if (code.indexOf("@") < 0)
//            continue;
//        let js = perlToJs(code);
//        pre.innerText = code + "\n\n" + js;
//        list.push(js);
//        document.body.appendChild(pre);
//    }
//    document.querySelector("#code").textContent = list.join("\n");
//}

//export async function main3(file) {

//    document.querySelector("#code").textContent = await generateJs(file);
//    //document.querySelector("#code").textContent = toHtml(tokens);
//    //document.querySelector("#preview").innerHTML = toHtml(tokens);
//    //console.log("DONE!!!!!!!!!!!!!!!!");
//}

//export async function main2(master) {
//    let page = master;
//    let html = Array.from(page.render()).join("");
//    document.querySelector("#code").textContent = html;
//    document.querySelector("#preview").innerHTML = html;
//    //for (let item of list) {
//    //    console.log(item);
//    //}
//    console.log("done");
//}
