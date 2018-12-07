const fs = require('fs').promises
var Stellar = require('stellar-sdk');
var balance = require('./Balance.js');
var fun = require('./StellarHashXDemoFun.js');

var server = new Stellar.Server('https://horizon-testnet.stellar.org');

Stellar.Network.useTestNetwork();

var pairB = {
    "secret":'SAZBBSOGRMIGR6XTWYJ4YLVHORXQD7GIX7BGNMCMHZPEAZ5STTHPSW23',
    "accountID":'GDVOOBOONLLPMYTVTZGFA3J3C4JOV6KHPZVKGWCAW7BWZYCMU67MBCNK'
};


const setMutiSign = async () =>  {
    try{
        const KeyPair = Stellar.Keypair.fromSecret(pairA.secret)
        const Account = await server.loadAccount(pairA.accountID)
        const thresholds = {
            masterWeight: 1, // Escrow account has a weight of 0, no rights :)
            lowThreshold: 2,
            medThreshold: 2, // payment is medium threshold
            highThreshold: 1,
        }
        const extraSignerB = {
            signer: {
                ed25519PublicKey: pairB.accountID,
                weight: 1,
            }
        }
        let transaction = new Stellar.TransactionBuilder(Account)
            .addOperation(Stellar.Operation.setOptions(thresholds))
            .addOperation(Stellar.Operation.setOptions(extraSignerB))
            .build()

        transaction.sign(KeyPair)
        await server.submitTransaction(transaction)

    }catch (e) {
        console.log('构造多方签名 error:   ',e)
    }
}

const makeTx = async () => {
    try{
        const key1 = Stellar.Keypair.fromSecret(pairA.secret)
        const key2 = Stellar.Keypair.fromSecret(pairB.secret)
        const Account = await server.loadAccount(pairA.accountID)

        const paymentToAccountB = {
            destination: pairB.accountID,
            asset: Stellar.Asset.native(),
            amount: '10.0000000',
        }

        var currentTime = Date.now()/1000
        var TimeBounds = {
            minTime: Math.round(currentTime+5),
            maxTime: 0
        };

        const memo = Stellar.Memo.text("MutiSigTimeBounds")

        let transaction = new Stellar.TransactionBuilder(Account, { memo:memo,timebounds:TimeBounds })
            .addOperation(Stellar.Operation.payment(paymentToAccountB))
            .build();
        transaction.sign(key1);
        transaction.sign(key2);

        return transaction;

    }catch (e) {
        console.log("error : ",e);
    }
}



const submitTx = async (tx) => {
    try{

        await server.submitTransaction(tx)
        console.log('交易提交 OK ：）');
    }catch (e) {
        console.log('交易提交 error！',e);
    }
}

var pairA;
fun.createAndFundNewAccount();
setTimeout(function () {
        pairA = fun.escrowAccount();
        fun.payEscrow()
            .then(()=>{
                    balance.balance(pairA.accountID);
                    balance.balance(pairB.accountID);
                    step2();

                }

            ).catch(

        )

    }
,10000)

function step2() {
    console.log("1 设置多签名")
    setMutiSign()
    .then(() => {
        setTimeout(function () {
            step3();
        },15000)

    })
    .catch((e) => { console.error(e); throw e});
}


function step3() {
    console.log("2 多签名交易")
    makeTx()
        .then((tx)=>{
            console.log("3 交易提交")
            setTimeout(function () {
                submitTx(tx).then().catch((e) => { console.error(e); throw e})
            },7000)

            setTimeout(function () {
                balance.balance(pairA.accountID);
                balance.balance(pairB.accountID);
            },15000)
        })
        .catch((e) => { console.error(e); throw e})
}
