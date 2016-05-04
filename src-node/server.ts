import * as express from "express";
import * as path from 'path';

var app = express();

let rootDir = path.join(__dirname, "../../..")
app.use("/res", express.static(rootDir), (req, res) => {
//    res.status(404);
    res.sendStatus(404);

    //// respond with html page
    //if (req.accepts('html')) {
    //    res.render('404', { url: req.url });
    //    return;
    //}

    //// respond with json
    //if (req.accepts('json')) {
    //    res.send({ error: 'Not found' });
    //    return;
    //}

    //// default to plain-text. send()
    //res.type('txt').send('Not found');
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
