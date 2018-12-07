
const fs = require('fs').promises
var hashs = require('hash.js')
var Stellar = require('stellar-sdk');

var server = new Stellar.Server('https://horizon-testnet.stellar.org');



var pairA = {
    "secret":'SACOMT4W3N36KOZTK2TWNLFPEQC26WFSBKQKYJDG2QH7PIEXNEFR5IMF',
    "accountID":'GBM6UF7BO3C6I5KGURQMBPKCAZLNQQEPTSAF6VPZWSRWI3VUIZJO2OZS'
};

var pairB = {
    "secret":'SAZBBSOGRMIGR6XTWYJ4YLVHORXQD7GIX7BGNMCMHZPEAZ5STTHPSW23',
    "accountID":'GDVOOBOONLLPMYTVTZGFA3J3C4JOV6KHPZVKGWCAW7BWZYCMU67MBCNK'
};


Stellar.Network.useTestNetwork();

//step 1
var escrowPair ;

function CreateNewAccount(){

    var pair = Stellar.Keypair.random();

    var newAccount = {
        "secret":pair.secret(),
        "accountID":pair.publicKey()
    };

    console.log("new account:", newAccount);

    return newAccount;
}


function createAndFundNewAccount(){
    escrowPair = CreateNewAccount();

    server
        .loadAccount(pairA.accountID)
        .then(function(account){
            var transaction = new Stellar.TransactionBuilder(account)
            // this operation funds the new account with XLM
                .addOperation(Stellar.Operation.createAccount({
                    destination: escrowPair.accountID,
                    startingBalance: '2.88'
                }))
                .build(); //

            transaction.sign(Stellar.Keypair.fromSecret(pairA.secret)); // sign the transaction

            return server.submitTransaction(transaction);
        })
        .then(function (transactionResult) {
            // console.log(transactionResult);
            console.log("创建账户OK");
        })
        .catch(function (err) {
            console.error('新建委托账户出错了',err);
        });
}




//
//step 2 send lxm to escrow
//
const payEscrow = async () => {
    try{
        const KeypairA = Stellar.Keypair.fromSecret(pairA.secret)

        const accountA = await server.loadAccount(pairA.accountID)

        const paymentToEscrow = {
            destination: escrowPair.accountID,
            asset: Stellar.Asset.native(),
            amount: '10.0000000',
        }

        const memo = Stellar.Memo.text("Funding the escrow account")

        let transaction = new Stellar.TransactionBuilder(accountA, { memo })
            .addOperation(Stellar.Operation.payment(paymentToEscrow))
            .build();

        transaction.sign(KeypairA);  // account A signs the transaction

        await server.submitTransaction(transaction)
    }catch (e) {
        console.log("转账给委托账户出错了",e);
    }

}


//B账户   创建hash(x)
function newHashX(x) {
    let buffer = new Buffer(x, "hex");
    let hash = hashs.sha256().update(buffer).digest('hex');
    return hash;
}


//A构造转B交易，B之后需要用X 进行签名
const txHashXToB = async (currentTime,hashxStart,hashxEnd) => {
    try{
        const KeypairA = Stellar.Keypair.fromSecret(pairA.secret)
        const escrowAccount =  await server.loadAccount(escrowPair.accountID)
        escrowAccount.incrementSequenceNumber();
        const paymentToAccountB = {
            destination: pairB.accountID,
            asset: Stellar.Asset.native(),
            amount: '10.0000000',
        }

        var TimeBounds = {
            minTime: Math.round(currentTime+hashxStart),
            maxTime: Math.round(currentTime+hashxEnd)
        };
        var opts = {
            timebounds:TimeBounds
        };
        const memo = Stellar.Memo.text("to B")
        // console.log('TimeBounds: ',opts)
        // console.log('Memo: ',memo)

        let transaction = new Stellar.TransactionBuilder(escrowAccount, { memo:memo,timebounds:TimeBounds })
            .addOperation(Stellar.Operation.payment(paymentToAccountB))
            .build();
        transaction.sign(KeypairA);

        const txEnvelopeXDR =  transaction.toEnvelope().toXDR('base64')

        await fs.writeFile('txHashXsignalA.dat', txEnvelopeXDR, { encoding: 'base64' })
    }catch (e) {
        console.log("A 构造转B hash(x)交易出错了 ",e);
    }

}



//A账户回撤交易
const recoveryToA = async(currentTime,recoveryStart) => {
    try{

        const KeypairA = Stellar.Keypair.fromSecret(pairA.secret);
        const KeypairEscrow = Stellar.Keypair.fromSecret(escrowPair.secret);
        // Get an account object
        let account = await server.loadAccount(KeypairEscrow.publicKey());
        // Increment this account object's sequence number
        account.incrementSequenceNumber();

        var TimeBounds = {
            minTime: Math.round(currentTime+recoveryStart),
            maxTime: 0
        };
        // var opts = {
        //     timebounds:TimeBounds
        // };
        const memo = Stellar.Memo.text("recovery  10  A ")
        // console.log('TimeBounds: ',opts)
        // console.log('Memo: ',memo)

        var preAuthTx = new Stellar.TransactionBuilder(account, { memo:memo,timebounds:TimeBounds })
            .addOperation(Stellar.Operation.payment({
                destination: pairA.accountID,
                asset: Stellar.Asset.native(),
                amount: "10.0000"
            }))
            .build();
        preAuthTx.sign(KeypairA);
        return preAuthTx;

    }catch (e) {
        console.log('构造撤销交易失败：',e)
        return 'preAthTx error!';
    }
}



//step 2  多签名
const setEscrowMultisig = async (hashx, preAuthTx) => {
    try{
        const escrowKeyPair = Stellar.Keypair.fromSecret(escrowPair.secret)
        const escrowAccount = await server.loadAccount(escrowPair.accountID)
        const thresholds = {
            masterWeight: 0, // Escrow account has a weight of 0, no rights :)
            lowThreshold: 2,
            medThreshold: 2, // payment is medium threshold
            highThreshold: 2,
        }
        const extraSignerA = {
            signer: {
                ed25519PublicKey: pairA.accountID,
                weight: 1,
            }
        }
        console.log('hash:',hashx);
        const extraSignerHashX = {
            signer: {
                sha256Hash: hashx,
                weight: 1,
            }
        }
        const extraSignerPreAuthTx = {
            signer: {
                preAuthTx: preAuthTx.hash(),
                weight: 1
            }
        }

        let transaction = new Stellar.TransactionBuilder(escrowAccount)
            .addOperation(Stellar.Operation.setOptions(thresholds))
            .addOperation(Stellar.Operation.setOptions(extraSignerA))
            .addOperation(Stellar.Operation.setOptions(extraSignerHashX))
            .addOperation(Stellar.Operation.setOptions(extraSignerPreAuthTx))
            .build()

        transaction.sign(escrowKeyPair)
        await server.submitTransaction(transaction)

    }catch (e) {
        console.log('构造多方签名 error:   ',e)
    }
}


//
// B 使用x 进行hash签名
const hashXSignatureB = async (x) => {
    try{
        // const signAccount = Stellar.Keypair.fromSecret(pairA.secret)
        // const escrowAccount = await server.loadAccount(escrowPair.accountID)
        //
        // const paymentToAccountB = {
        //     destination: pairB.accountID,
        //     asset: Stellar.Asset.native(),
        //     amount: '10.0000000',
        // }
        //
        //
        // let transaction = new Stellar.TransactionBuilder(escrowAccount)
        //     .addOperation(Stellar.Operation.payment(paymentToAccountB))
        //     .build();
        // transaction.sign(signAccount);
        //
        // //
        const fundsReleaseTx = await fs.readFile('txHashXsignalA.dat', { encoding: 'base64' })
        const buffer = Buffer.from(fundsReleaseTx, 'base64')
        const envelope = Stellar.xdr.TransactionEnvelope.fromXDR(buffer, 'base64')
        const transaction = new Stellar.Transaction(envelope)


        transaction.signHashX(x);

        await server.submitTransaction(transaction);
        console.log("B 提交 X 获取资产OK ：） ");
    }catch (e) {
        console.log("B 提交 X 获取资产失败 ");
    }
}


const recoverySubmitToA = async (preAuthTx) => {
    try{
        const transaction = preAuthTx;
        await server.submitTransaction(transaction)
        console.log('A 回撤 escrow 资产 OK ：）');
    }catch (e) {
        console.log('A 回撤 escrow 资产 失败 ！');
    }
}

function balance(p){
    server.loadAccount(p)
        .then(function(sourceAccount) {

            console.log('Balances for account: ' + p);
            sourceAccount.balances.forEach(function (balance) {
                console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
            });
        }).catch(function(error) {
        console.error('Something went wrong!', error);
    });
}

function currentStep(step) {
    console.log("-------step:",step,"---------")
    balance(pairA.accountID);
    balance(pairB.accountID);
    balance(escrowPair.accountID);
}

function escrowAccount(){
    return escrowPair;
}

module.exports.currentStep = currentStep;
module.exports.createAndFundNewAccount = createAndFundNewAccount;
module.exports.newHashX = newHashX;
module.exports.recoveryToA = recoveryToA;
module.exports.txHashXToB = txHashXToB;
module.exports.setEscrowMultisig = setEscrowMultisig;
module.exports.hashXSignatureB = hashXSignatureB;
module.exports.recoverySubmitToA = recoverySubmitToA;
module.exports.payEscrow = payEscrow;
module.exports.escrowAccount = escrowAccount;
