const fs = require('fs-promise'); //promise
const co=require("co");
const computeVal = require('./lib/computeVal.js');
const cp = require('./lib/clientpromise.js');
co(function* () {
  let initObj={};
  const con=yield fs.readFile ('config-client.json','utf8');
initObj.config=JSON.parse(con);
 
  initObj=   yield cp.runInit(initObj);
  const invoiceMesJson =JSON.parse(yield fs.readFile(initObj.config.invoiceJSON,"utf8"));
  initObj.invoiceMes= computeVal.transformInv(invoiceMesJson, initObj.config); 
  initObj.body=computeVal.ZOIValidateSign(initObj);
  let res= yield cp.runFursMes(initObj);
  yield fs.writeFile (initObj.config.responseFile,JSON.stringify(res),'utf8');
  console.log(res);
  return res;
}).catch(function(ex) {
  console.error("ERROR in nc:" ,ex.stack);
  fs.writeFile (initObj.config.responseFile,ex.stack,'utf8');
});

