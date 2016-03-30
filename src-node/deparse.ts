import * as proc from "child_process";
import * as fs from "fs";
import "../../../libs/corex";



export class Deparse {
    index = 100000;
    _deparse(code: string, opts?: DeparseOptions): Promise<DeparseResult> {
        let phBegin = "PLACEHOLDERBEGIN();";
        let phEnd = "PLACEHOLDEREND();";
        code = `${phBegin}\n${code};\n${phEnd}\n`;
        let ignores:string[] = [];
        if (opts.assumeSubs) {
            let subs = opts.assumeSubs.select(t=> `sub ${t};`).join("\n");
            code = subs + "\n" + code;
            ignores = opts.assumeSubs.select(t=> `sub ${t} ;`);
        }


        return new Promise((resolve, reject) => {
            this.index++;
            let filename = opts.filename || "C:\\temp\\perl\\" + (this.index++) + ".tmp.pm";
            let cmd = "perl -MO=Deparse,-p " + JSON.stringify(filename);//-E " + JSON.stringify(code);
            //console.log("CODE", code);
            fs.writeFileSync(filename, code);
            proc.exec(cmd, (error, stdout, stderr) => {
                let dr: DeparseResult = { success: false, deparsed: null };

                let out = stdout.toString();
                let err = stderr.toString();
                //console.log(out);
                //console.log(err);
                if (!err.contains("syntax OK")) {
                    fs.appendFileSync(filename, "\n\n\n\n\n" + out + "\n\n\n\n\n" + err);
                    resolve(dr);
                    return;
                }
                fs.unlinkSync(filename);

                let lines = out.lines();
                let start = lines.findIndex(t=>t==phBegin);
                let end = lines.findIndex(t=>t==phEnd);
                let lines2 = lines.slice(start+1, end);
                let res = lines2.join("\n");
                //let res = lines.where(t=>
                //    !t.startsWith("use feature ") || ignores.contains(t)
                //).join("\n");//.first(t=> t.startsWith("("));
                dr.deparsed = res;
                dr.success = true;
                resolve(dr);
            });
        });
    }
    deparse(code: string, opts?: DeparseOptions): Promise<DeparseResult> {
        opts = opts || {};
        if (opts.tryAsAssignment) {
            return this._deparse(code, opts).then(depRes=> {
                if (depRes.success)
                    return depRes;
                let opts2: DeparseOptions = { filename: opts.filename, tryAsAssignment: false, assumeSubs: opts.assumeSubs };
                return this._deparse("$GGGGGGGG = " + code, opts).then(depRes => {
                    if (!depRes.success)
                        return depRes;
                    if (depRes.deparsed.startsWith("($GGGGGGGGG = ") && depRes.deparsed.endsWith(");")) {
                        console.log(depRes.deparsed);
                        depRes.deparsed = depRes.deparsed.substring("($GGGGGGGGG = ".length, depRes.deparsed.length - 2);
                        console.log(depRes.deparsed);
                        return depRes;
                    }
                    throw new Error("Can't unwrap placeholder variable");
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