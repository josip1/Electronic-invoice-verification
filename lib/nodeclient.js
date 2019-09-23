const fs = require('fs-promise'); //promise
const computeVal = require('./lib/computeVal.js');
const cp = require('./lib/clientpromise.js');
let initObj = {};
async function runApp() {
    const con = await fs.readFile('config-client.json', 'utf8');
    initObj.config = JSON.parse(con);
    initObj = await cp.runInit(initObj);
    const invoiceMesJson = JSON.parse(await fs.readFile(initObj.config.invoiceJSON, "utf8"));
    initObj.invoiceMes = computeVal.transformInv(invoiceMesJson, initObj.config);
    // console.log(initObj.invoiceMes)
    initObj.body = computeVal.ZOIValidateSign(initObj);
    //  console.log(initObj.body);
    let res = await cp.runFursMes(initObj);
    await fs.writeFile(initObj.config.responseFile, JSON.stringify(res), 'utf8'); //message to the client
    //  console.log(res);
    return res;
}
runApp().
  catch(function(ex) {
    console.error("ERROR in nc:", ex.stack);
    fs.writeFile(initObj.config.responseFile, ex.stack, 'utf8');
});
