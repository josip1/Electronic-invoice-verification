const md5 = require('md5');
const jsrsasign = require('jsrsasign');
const moment = require('moment');
const hexToDecimal = require('biguint-format');
const uuidv4 = require('uuid').v4;
const forge = require('node-forge');
const jsonwebtoken = require('jsonwebtoken');
//const validate = require('jsonschema').validate;
//const Validator=require('jsonschema').Validator;
const jschema=require('jschema');
function computeZOI(invoice, key) {
    const sig = new jsrsasign.KJUR.crypto.Signature({
        alg: 'SHA256withRSA'
    });
    try {
        var ZOI = '' + invoice.TaxNumber +
            moment().format('DD.MM.Y HH:mm:ss') +
            invoice.InvoiceIdentifier.InvoiceNumber +
            invoice.InvoiceIdentifier.BusinessPremiseID +
            invoice.InvoiceIdentifier.ElectronicDeviceID +
            invoice.InvoiceAmount;
        sig.init(key);
        sig.updateString(ZOI);
         ZOI = md5(sig.sign);
        return ZOI;
    } catch (ex) {
        console.log("ZOI ERR:", ex);
        throw (ex);
    }
}

module.exports.computeQR = function(ZOI, invoice) {
    let qrValue = hexToDecimal(ZOI, 'dec');
    while (qrValue.length < 39) qrValue = '0' + qrValue;
    qrValue = qrValue + moment(invoice.IssueDateTime, 'Y.MM.DD HH:mm:ss').format('YYMMDDHHmmss');
    qrValue += invoice.TaxNumber;
    let controlNum = 0;
    for (let i = 0; i < qrValue.length; i++) controlNum += parseInt(qrValue[i]);
    controlNum %= 10;
    qrValue += controlNum;
    return qrValue;
}

module.exports.pemFromP12 = function(myCertData, passphrase) {
    const p12Der = forge.util.decode64(myCertData.toString('base64'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);
    const bags = p12.getBags({
        bagType: forge.pki.oids.certBag
    });
    const cert = bags[forge.pki.oids.certBag][0];
    let serial = hexToDecimal(cert['cert']['serialNumber'], 'dec');
    // Header issuer and subject
    let mapArr = Object.keys(p12.safeContents).reduce(function(accAll, curk) {
        p12Bags = p12.safeContents[curk].safeBags;
        accAll = Object.keys(p12Bags).reduce((acc, ck) => {
            let safeBag = p12Bags[ck];
            let localKeyId = null;
            if (safeBag.attributes.localKeyId) {
                localKeyId = forge.util.bytesToHex(safeBag.attributes.localKeyId[0]);
                if (!(localKeyId in accAll)) {
                    accAll[localKeyId] = {
                        privateKey: null,
                        certChain: [],
                    }
                    if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                        accAll[localKeyId].privateKey = safeBag.key
                    } else {
                        if (safeBag.type === forge.pki.oids.certBag) {
                            accAll[localKeyId].certChain.push(safeBag.cert);
                        }
                    }
                }
            }
            return accAll;
        }, []);
        return accAll;
    }, []);
    let key = Object.keys(mapArr).reduce((acc, ckey) => {
        return (mapArr[ckey].privateKey) ? forge.pki.privateKeyToPem(mapArr[ckey].privateKey) : acc
    }, "");
    let header = {
        alg: 'RS256',
        subject_name: '',
        issuer_name: '',
        serial,
    }
    const certCNs = {
        'issuer_name': cert['cert']['issuer'],
        'subject_name': cert['cert']['subject'],
    };
    const cnTypes = ['subject_name', 'issuer_name'];
    cnTypes.forEach(t => {
        for (let i = 0; i < certCNs[t].attributes.length; i++) {
            let attributes = certCNs[t].attributes[i];

            let tName = 'name';
            if ('shortName' in attributes) tName = 'shortName';
            header[t] = header[t] + ',' + attributes[tName] + '=' + attributes['value'];
        }
        header[t] = header[t].substring(1);
    });
    return [key, header];
}


module.exports.transformInv = function(invoiceMes, config) {
    var invoice = invoiceMes.InvoiceRequest.Invoice
    invoiceMes.InvoiceRequest.Header.MessageID = uuidv4(),
        invoiceMes.InvoiceRequest.Header.DateTime = moment().format(config.dtf),
        //invoice.IssueDateTime= moment().format(dtf),
        invoice.TaxNumber = config.TaxNumber;
    invoice.InvoiceIdentifier.BusinessPremiseID = config.BusinessPremiseID;
    invoice.InvoiceIdentifier.ElectronicDeviceID = config.ElectronicDeviceID;
    if (invoice.hasOwnProperty("OperatorTaxNumber")) {
        invoice.OperatorTaxNumber = config.OperatorTaxNumber;
        invoice.IssueDateTime = moment().format(config.dtf);
    }
    return invoiceMes;
}
module.exports.insertValues = function(invoiceMes, dataJSON) {
    invoiceMes = JSON.parse(invoiceMes);
    invoiceMes.InvoiceRequest.Invoice.InvoiceIdentifier.InvoiceNumber = dataJSON.InvoiceNumber;
    invoiceMes.InvoiceRequest.Invoice.IssueDateTime = dataJSON.IssueDateTime;
    invoiceMes.InvoiceRequest.Invoice.InvoiceAmount = Number(dataJSON.InvoiceAmount);
    invoiceMes.InvoiceRequest.Invoice.PaymentAmount = Number(dataJSON.InvoiceAmount);
    invoiceMes.InvoiceRequest.Invoice.TaxesPerSeller[0].VAT[0].TaxRate = Number(dataJSON.TaxRate);
    const ta = Number(dataJSON.InvoiceAmount) * 100 / (100 + Number(dataJSON.TaxRate)).toFixed(2);
    invoiceMes.InvoiceRequest.Invoice.TaxesPerSeller[0].VAT[0].TaxableAmount = Number(ta.toFixed(2));
    invoiceMes.InvoiceRequest.Invoice.TaxesPerSeller[0].VAT[0].TaxAmount = Number((Number(dataJSON.InvoiceAmount) - ta).toFixed(2));
    invoiceMes.InvoiceRequest.Invoice.SpecialNotes = dataJSON.SpecialNotes;
    return invoiceMes;
};

module.exports.ZOIValidateSign = function(initObj) {
    const key = initObj.key
    const schema = initObj.schema;
    const header = initObj.header;
    try {
        var invoice = initObj.invoiceMes.InvoiceRequest.Invoice;
        if (invoice.hasOwnProperty("ProtectedID")) {
            let ZOI = computeZOI(invoice, key);
            invoice.ProtectedID = ZOI;
        } //sales book
        // Generate QR code value

var test = jschema(schema.definitions);
test.validate( initObj.invoiceMes,function (err) {
    if (err) {
        console.log(err); // properties 'bath' and 'hearth' will fail, as they match patternProperties and are not numbers
        throw (err);
    } else {
     //   console.log('looks valid!');
    }
} )
    } catch (ex) {
        console.log("FURS ERR:", ex);
        throw (ex);
    }
    // Generate JWT
    let body = jsonwebtoken.sign(initObj.invoiceMes, key, {
        header,
        algorithm: 'RS256',
        noTimestamp: true
    });
    return {
        body
    }; // {token : ....}
}