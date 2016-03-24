import {exec} from "child_process";
import * as fs from "fs";
import "../../../libs/corex";


let index = 100000;
export function deparse(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
        index++;
        let filename = "C:\\temp\\perl\\" + (index++) + ".tmp.pm";
        let cmd = "perl -MO=Deparse,-p " + JSON.stringify(filename);//-E " + JSON.stringify(code);
        fs.writeFileSync(filename, code);
        exec(cmd, (error, stdout, stderr) => {
            let out = stdout.toString();
            let err = stderr.toString();
            if (!err.contains("syntax OK")) {
                fs.appendFileSync(filename, "\n\n\n\n\n" + out + "\n\n\n\n\n" + err);
                fs.renameSync(filename, filename + ".err.pm");
                reject(err);
                return;
            }
            fs.unlinkSync(filename);
            
            //fs.writeFileSync(filename+".txt", s);
            //fs.appendFileSync(filename, "\n\n\n\n\n"+out);
            //console.log(s);
            let lines = out.lines();
            //.forEach((t,i)=>console.log(i, t));
            //if (lines == null) {
            //    reject(err);
            //    return;
            //}
            let res = lines.first(t=> t.startsWith("("));
            resolve(res);
            //console.log(cmd);
            //console.log(s);
            //console.log(lines);
            //console.log("----------------------");
            //console.log(s);
            //lines[lines.length-2]);
            //console.log(`stderr: ${stderr}`);
        });
    });
}

//deparse("new Foo 1, 2 or die").then(t=>console.log("finished"));