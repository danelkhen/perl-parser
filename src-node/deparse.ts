import {exec} from "child_process";
import "../../../libs/corex";


export function deparse(code: string): Promise<string> {
    let cmd = "perl -MO=Deparse,-p -E " + JSON.stringify(code);
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            let s = stdout.toString();
            let lines = s.lines();//.forEach((t,i)=>console.log(i, t));
            if (lines == null) {
                reject(stderr.toString());
                return;
            }
            let res = lines.first(t=>t.startsWith("("));
            //console.log(cmd);
            //console.log(s);
            //console.log(lines);
            //console.log("----------------------");
            //console.log(s);
            resolve(res);//lines[lines.length-2]);
            //console.log(`stderr: ${stderr}`);
        });
    });
}

//deparse("new Foo 1, 2 or die").then(t=>console.log("finished"));