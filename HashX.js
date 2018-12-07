

var StellarSdk = require('stellar-sdk')
var hashs = require('hash.js')
StellarSdk.Network.useTestNetwork();
var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

var balance = require('./Balance.js');

var pairA = {
    "secret":'SDWXVWQKZNQ2DABFHSRW2ANWIHTBWUXDOV3DCLNRLY7B6QZYWB52AGB2',
    "accountID":'GB2DCQ4QS6QPB3WCEG7V3LPYVHGKQDKZFYY6VX2KOLDF2YZMKKB6UJAW'
};

var pairB = {
    "secret":'SAZBBSOGRMIGR6XTWYJ4YLVHORXQD7GIX7BGNMCMHZPEAZ5STTHPSW23',
    "accountID":'GDVOOBOONLLPMYTVTZGFA3J3C4JOV6KHPZVKGWCAW7BWZYCMU67MBCNK'
};


var hashx = '1234567890';

let buffer = new Buffer(val, "hex");
let hash = hashs.sha256().update(buffer).digest('hex');

const addHashXSigner = async (hash, secretKey) => {
    try {
        var keypair = StellarSdk.Keypair.fromSecret(secretKey);
        let account = await server.loadAccount(keypair.publicKey());

        var transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.setOptions({
                signer: {
                    sha256Hash: hash,
                    weight: 1
                }
            }))
            .build();
        console.log('hash:',hash)
        transaction.sign(keypair);
        await server.submitTransaction(transaction);
        console.log("Submitted successfully", hash);
    } catch (err) {
        console.log("Submission error:", err);
    }
}

const sendTxWithHashXSigner = async (val, publickey) => {
    try {
        let account = await server.loadAccount(publickey);
        var transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.payment({
                destination: pairB.accountID,
                asset: StellarSdk.Asset.native(),
                amount: "0.888"
            }))
            .build();

        transaction.signHashX(val);
        await server.submitTransaction(transaction);
        console.log("Submitted successfully");
    } catch (err) {
        console.log("Submission error:", err);
    }
}



function currentStep(step) {
    console.log("-------step:",step,"---------")
    balance.balance(pairA.accountID);
    balance.balance(pairB.accountID);
}


addHashXSigner(hash, pairA.secret)
    .then(() => { console.log('ok') })
    .catch((e) => { console.error(e); throw e})
currentStep(1);
setTimeout(function () {
    step2();
},5000)


function step2(){
    sendTxWithHashXSigner(hashx, pairA.accountID).then(() => { console.log('ok') })
        .catch((e) => { console.error(e); throw e});

    setTimeout(function () {
        currentStep(2);
    },5000)
}