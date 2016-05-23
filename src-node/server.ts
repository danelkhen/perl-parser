﻿import * as express from "express";
import * as path from 'path';

var app = express();

let rootDir = path.join(__dirname, "../../..")

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use("/res", express.static(rootDir), (req, res) => {
    res.sendStatus(404);
});

app.get("*", function (req, res) {
    //if (req.params.base == "res")
    //    throw new Error();

    let file = path.join(path.join(rootDir, "viewer/index.html"));
    console.log({ base: req.params.base, url: req.url });
    console.log("sending", file);
    res.sendFile(file);
});


app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
