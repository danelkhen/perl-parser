//import * as cp from "child_process";
import * as cp2 from "./cp2";
//import * as fs from "fs";
import * as fs2 from "./fs2";
import "../../../libs/corex";



export class Deparse {
    index = 100000;
    _deparse(code: string, opts?: DeparseOptions): Promise<DeparseResult> {
        let phBegin = "PLACEHOLDERBEGIN();";
        let phEnd = "PLACEHOLDEREND();";
        code = `${phBegin}\n${code};\n${phEnd}\n`;
        let ignores: string[] = [];
        if (opts.assumeSubs) {
            let subs = opts.assumeSubs.select(t=> `sub ${t};`).join("\n");
            code = subs + "\n" + code;
            ignores = opts.assumeSubs.select(t=> `sub ${t} ;`);
        }


        //return new Promise((resolve, reject) => {
        this.index++;
        let filename = opts.filename || "C:\\temp\\perl\\" + (this.index++) + ".tmp.pm";
        let cmd = "perl -IC:\\Users\\Dan-el\\github\\perl-parser\\lib\\ -MO=Deparse,-p " + JSON.stringify(filename);//-E " + JSON.stringify(code); //TODO: detect warnings
        //console.log("cmd", cmd);
        return fs2.writeFile(filename, code)
            .then(e=> cp2.exec(cmd))
            .then(e2 => {
                let dr: DeparseResult = { success: false, deparsed: null };

                let out = e2.stdout.toString();
                let err = e2.stderr.toString();
                //console.log("cmd", cmd);
                //console.log("out", out);
                //console.log("err", err);
                if (!err.contains("syntax OK")) {
                    //console.log("can't find syntax ok in out");
                    return fs2.appendFile(filename, "\n\n\n\n\n" + out + "\n\n\n\n\n" + err).then(t=> dr);
                }
                if (out.contains("'???'")) {
                    //console.log("found ??? in out");
                    return fs2.appendFile(filename, "\n\n\n\n\n" + out + "\n\n\n\n\n" + err).then(t=> dr);
                }
                return fs2.unlink(filename).then(e3=> {
                    let lines = out.lines();
                    let start = lines.findIndex(t=> t == phBegin);
                    let end = lines.findIndex(t=> t == phEnd);
                    let lines2 = lines.slice(start + 1, end);
                    let res = lines2.join("\n");
                    //let res = lines.where(t=>
                    //    !t.startsWith("use feature ") || ignores.contains(t)
                    //).join("\n");//.first(t=> t.startsWith("("));
                    dr.deparsed = res;
                    dr.success = true;
                    return dr;
                    //resolve(dr);
                });
            });
        //});
    }
    deparse(code: string, opts?: DeparseOptions): Promise<DeparseResult> {
        opts = opts || {};
        //console.log("assumeSubs", opts.assumeSubs);
        if (opts.tryAsAssignment) {
            return this._deparse(code, opts).then(depRes=> {
                if (depRes.success)
                    return depRes;
                let opts2: DeparseOptions = { filename: opts.filename, tryAsAssignment: false, assumeSubs: opts.assumeSubs };
                return this._deparse("$GGGGGGGG = " + code, opts).then(depRes => {
                    if (!depRes.success)
                        return depRes;
                    if (depRes.deparsed.startsWith("($GGGGGGGG = ") && depRes.deparsed.endsWith(");")) {
                        //console.log(depRes.deparsed);
                        depRes.deparsed = depRes.deparsed.substring("($GGGGGGGG = ".length, depRes.deparsed.length - 2);
                        //console.log(depRes.deparsed);
                        return depRes;
                    }
                    console.error("Can't unwrap placeholder variable", depRes.deparsed);
                    depRes.success = false;
                    return depRes;
                });
            });
        }
        return this._deparse(code, opts);
    }
}
interface DeparseOptions {
    filename?: string;
    tryAsAssignment?: boolean;
    assumeSubs?: string[];
}
interface DeparseResult {
    deparsed: string;
    success: boolean;
}
//deparse("new Foo 1, 2 or die").then(t=>console.log("finished"));