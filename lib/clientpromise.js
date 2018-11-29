
//https://github.com/BostjanPisler/node-furs-fiscal-verification
// http://www.datoteke.fu.gov.si/dpr/files/TehnicnaDokumentacijaVer1.6.pdf
'use strict';
const fs = require('fs-promise'); //promise
const request = require('request');
const jsonwebtoken = require('jsonwebtoken');
const co = require("co");
module.exports.runInit = co.wrap(function*(initObj) {
    if (fs.existsSync(initObj.config.responseFile)) {
        fs.unlink(initObj.config.responseFile, function(error) { //delete the response file
            // console.log(error);
        });
    };
    try {
        const str = require.main.filename;
        const str1 = str.replace(/\\/g, '/')
        initObj.mainDir = str1.substring(0, str1.lastIndexOf("/"));
        const certDir = initObj.mainDir + initObj.config.sslcert;
        let retArr = yield Promise.all([fs.readFile(path.resolve(certDir, initObj.config.tlsCertFile)),
            fs.readFile(path.resolve(certDir, initObj.config.myCertFile)),
            fs.readFile(path.resolve(certDir, initObj.config.fursCertPemFile)),
            fs.readFile(path.resolve(certDir, initObj.config.schema))
        ]);

        initObj.ca = retArr[0];
        initObj.pfx = retArr[1];
        initObj.certPk = retArr[2];
        initObj.schema = JSON.parse(retArr[3]);
        const keyHeader = computeVal.pemFromP12(retArr[1], initObj.config.passphrase); //myCertFile fs.readFile(config.myCertFile)
        initObj.key = keyHeader[0];
        initObj.header = keyHeader[1];
        return initObj;
    } catch (ex) {
        console.log(ex);
        throw ex;
    }
});

module.exports.runFursMes = co.wrap(function*(initObj) {
    var header = initObj.header;
    const certPK = initObj.certPk;
    let body = initObj.body;
    var options = {
        //passphrase: config.passphrase, // env
        rejectUnauthorized: false, //false
        requestCert: true,
        agent: false,
        headers: {
            'content-type': 'application/json; UTF-8',
        },
        json: true,
    }

    var requestPromise = require('request-promise');
    options.uri = initObj.config.url + '/invoices';
    //options.uri = url + '/echo';
    options.body = body;
    options.method = "POST";
    options.ca = initObj.ca;
    options.pfx = initObj.pfx;
    options.passphrase = initObj.config.passphrase;
    if (!options.ca) throw new Error("Error in ca!");
    if (!options.pfx) throw new Error("Error in pfx!");
    const promRes = yield requestPromise(options);
    var response = "";
    try {
        response = jsonwebtoken.verify(promRes.token, certPK, {
            algorithms: ['RS256', "HS256", "HS384"]
        });

    } catch (ex) {
        console.log("Response ERR:", ex);
        throw (ex);
    }
    if (response.InvoiceResponse) {
        const eor = response.InvoiceResponse.UniqueInvoiceID;
        if (eor) {
            //           console.log('EOR:', eor);
            // Show EOR, ZOI, QR code on document
            return ['OK', eor, response]; //save response triple in a data base
        } else {
            console.log("Error m.:", response);
            return ['ER', "Error in message.", response]; //manage error triple
        }
    }
})
