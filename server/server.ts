import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import * as fs3 from "./fs3";
import {P5Service} from "./service";
import {GitFile, FsFile, PerlPackage, PerlCriticResult} from "./service-spec";

var app = express();

let rootDir = path.join(__dirname, "../..")
console.log(rootDir);
let aceDir = path.join(rootDir, "../ace/lib/ace")


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use("/res/ace", express.static(aceDir), (req, res) => res.sendStatus(404));
app.use("/res", express.static(rootDir), express.static(path.join(rootDir, "built")), (req, res) => res.sendStatus(404));


async function handleServiceRequest(req: express.Request, res: express.Response): Promise<any> {
    console.log(req.params);
    let action = req.params.action;
    let path2 = req.params[0];
    let service = new P5Service();
    if (action == "fs") {
        return service.fs_list_files({ path: path2 })
            .catch(err => {
                console.warn(err);
                res.status(500).send(err);
            })
            .then(res2 => {
                res.status(200).send(res2);
                return res2;
            });
    }
    else if (action == "src") {
        let filename = path.join(rootDir, path2);
        try {
            let buffer = await fs3.readFile(path2);
            //let text = buffer.toString();
            res.status(200).contentType("text/plain").send(buffer);
        }
        catch (e) {
            res.status(500).send(e);
        }
        //return service.fs_list_files({ path: path2 })
        //    .catch(err => {
        //        console.warn(err);
        //        res.status(500).send(err);
        //    })
        //    .then(res2 => {
        //        res.status(200).send(res2);
        //        return res2;
        //    });
    }
}

app.use("//:action/*", handleServiceRequest);
//(req, res) => {
//    req.param
//});


app.get("*", (req, res) => {
    //if (req.params.base == "res")
    //    throw new Error();

    let file = path.join(path.join(rootDir, "viewer/index.html"));
    console.log({ base: req.params.base, url: req.url });
    console.log("sending", file);
    res.sendFile(file);
});


app.listen(3000, () => {
    console.log('Server listening on port 3000!');
});
