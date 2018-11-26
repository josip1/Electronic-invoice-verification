Electronic-invoice-verification 

Node JS asynchronous client for TLS and signed fiscal invoice message (SLO): 

a) JSON type invoice message, 

b) TLS transport protocol, 

c) signed message, 

d) JSON type response.  

 

Basic modules are inside the folder lib.  

 

nodeclient.js is an example how to use the two modules to send invoices to SLO FURS, Fiscal verification of invoices ( www.datoteke.fu.gov.si/dpr/files/TehnicnaDokumentacijaVer1.6.pdf). 

The client depends on parameters presented in config-client.json. 

The certificates are inside the folder ssl-cert. In this folder is also the verification schema of the invoice message. 

The file invoiceFile.json is an example of the invoice written in JSON format. The response (from FURS) is inside the fie response.json.  

Another example is the ELECTRON app (reference). 

 

After the download, 

1) copy yours's cert (demo_podjetje.p12) to the subfolder (slo-cert), 

2) in the file config-client.json change the name (demo_podjetje.p12), the password and other data. 

3) in the command window (of the downloaded folder) run: node nodeclient. 

 
 

Some explanations of the config-client.json: 

"invoiceJSON" : "invoiceFile.json", //yours's invoice data file, to be send to FURS 

"myCertFile" : "./ssl-cert/demo_podjetje.p12", //private key obtained from FURS 

"tlsCertFile" : "./ssl-cert/test-tls.cer", //certificate public key TLS 

"fursCertPemFile" : "./ssl-cert/test-sign.pem", //public key SIGN (signing of messages), rename test-sign.cer to test-sign.pem 

"responseFile" : "response.json", response file received from FURS 

 
See also: 

1) https://github.com/BostjanPisler/node-furs-fiscal-verification, 

2) https://github.com/MPrtenjak/SLOTax, 

3) https://github.com/boris-savic/python-furs-fiscal, 

4) https://github.com/rokj/js-furs-fiscal/blob/master/example.html. 
 

Other usage: 

You should change the verification schema, the certificates, the config-client file and use the library to send other type of messages. 
