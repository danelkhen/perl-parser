import * as express from "express";
import * as path from "path";
import * as fs from "fs";
import * as fs3 from "./fs3";
import { P5Service } from "./service";
import { GitFile, FsFile, PerlPackage, PerlCriticResult } from "./service-spec";
import "../../libs/corex.js"
import * as bodyParser from 'body-parser';
import * as ChildProcess from 'child_process';
import auth = require("basic-auth")


let rootDir: string;
let config: {
    auth?: string,
    username?: string,
    password?: string,
} = {};


main();

function loadConfig() {
    let configFile = path.join(rootDir, "config.json");
    if (!fs.existsSync(configFile))
        return;
    config = JSON.parse(fs.readFileSync(configFile, "utf8"));
}
function main() {
    var app = express();

    rootDir = path.join(__dirname, "../..")
    console.log(rootDir);
    loadConfig();

    let aceDir = path.join(rootDir, "../ace/lib/ace")


    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.use("/res/ace", express.static(aceDir), (req, res) => res.sendStatus(404));
    app.use("/res", express.static(rootDir), express.static(path.join(rootDir, "built")), (req, res) => res.sendStatus(404));

    let service = new P5Service();

    app.use(bodyParser.json());
    app.all('/_api_/:action', (req: express.Request, res: express.Response) => {
        if (!authenticate(req, res))
            return;
        console.log(req.method, req.url, (<any>req).body);
        if (req.method == "OPTIONS") {
            res.status(200);
            return;
        }
        res.contentType("application/json");
        let action = req.params["action"];
        let prm: any;
        if (req.method == "POST") {
            prm = (<any>req).body;
        }
        else
            prm = req.query;
        if (service[action] == null) {
            res.json("not found");
            return;
        }
        Promise.resolve()
            .then(() => service[action](prm))
            .then(t => {
                if (t instanceof Buffer) {
                    res.contentType("text/plain").send(t);
                }
                else {
                    res.json(t);
                }
            }, e => {
                let e2: ErrorEvent = e;
                //if (e2.err != null) {
                //    (<any>e2).errMessage = e2.err.message;
                //    delete e.err;
                //}
                console.log("ERROR", e);
                res.status(400).json(String(e));
            });

    });

    app.get("*", (req: express.Request, res: express.Response) => {
        if (!authenticate(req, res))
            return;
        let file = path.join(path.join(rootDir, "viewer/index.html"));
        //console.log({ base: req.params.base, url: req.url });
        console.log("sending", file);
        res.sendFile(file);
    });


    app.listen(3000, () => {
        console.log('Server listening on port 3000!');
    });
}


function authenticate(req: express.Request, res: express.Response): boolean {
    if (config.auth != "basic")
        return true;
    var credentials = auth(req)
    if (credentials != null && credentials.name == config.username && credentials.pass == config.password)
        return true;
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="codeviewer"')
    res.end('Access denied')
    return false;
}