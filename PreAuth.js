var StellarSdk = require('stellar-sdk')
StellarSdk.Network.useTestNetwork();
var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
var balance = require('./Balance.js');


var pairA = {
    "secret":'SBLI67OCRKC42WQRONZEPTIOLWK6TLBC52HSJXQG6URRAI2S2F63V46F',
    "accountID":'GC46KJGGEQ7ZMABB6EREMHR5BIDILJ22T46AEMTOZUAATBWLMWWGX22I'
};

var pairB = {
    "secret":'SAZBBSOGRMIGR6XTWYJ4YLVHORXQD7GIX7BGNMCMHZPEAZ5STTHPSW23',
    "accountID":'GDVOOBOONLLPMYTVTZGFA3J3C4JOV6KHPZVKGWCAW7BWZYCMU67MBCNK'
};


const addPreAuthSigner = async (secretKey) => {
    try {
        var keypair = StellarSdk.Keypair.fromSecret(secretKey);
        // Get an account object
        let account = await server.loadAccount(keypair.publicKey());
        // Increment this account object's sequence number
        account.incrementSequenceNumber()

        var preAuthTx = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.payment({
                destination: pairB.accountID,
                asset: StellarSdk.Asset.native(),
                amount: "1"
            }))
            .build()
        account = await server.loadAccount(keypair.publicKey());
        account.incrementSequenceNumber()

        var preAuthTx2 = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.payment({
                destination: pairB.accountID,
                asset: StellarSdk.Asset.native(),
                amount: "10"
            }))
            .build()

        account = await server.loadAccount(keypair.publicKey());
        // Set the preAuthTx as a signer on the account
        var transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.setOptions({
                signer: {
                    preAuthTx: preAuthTx.hash(),
                    weight: 1
                }
            }))
            .addOperation(StellarSdk.Operation.setOptions({
            signer: {
                preAuthTx: preAuthTx2.hash(),
                weight: 1
            }
        }))
            .build()

        transaction.sign(keypair)
        await server.submitTransaction(transaction);
        var ret =  {tx1:preAuthTx, tx2:preAuthTx2};
        console.log('return tx:',ret);
        return ret;
    } catch (err) {
        console.log(err)
    }
};

function currentStep(step) {
    console.log("-------step:",step,"---------")
    balance.balance(pairA.accountID);
    balance.balance(pairB.accountID);
}

addPreAuthSigner(pairA.secret)
    .then((tx) => {
            console.log('tx:',tx);
            server.submitTransaction(tx.tx1);
            // server.submitTransaction(tx.tx2);
            console.log('ok')
        })
    .catch((e) => { console.error(e); throw e});

setTimeout(function () {
    currentStep(1);
},15000)