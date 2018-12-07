var StellarSdk = require('stellar-sdk');
var request = require('request');

 var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
// var server = new StellarSdk.Server('http://localhost:8000',{allowHttp: true});

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var pair = StellarSdk.Keypair.random();




var s = pair.secret();
// SAV76USXIJOBMEQXPANUOQM6F5LIOTLPDIDVRJBFFE2MDJXG24TAPUU7
var p = pair.publicKey();
// GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB

console.log(s+' |  '+p)


request.get({
    url: 'https://friendbot.stellar.org',
    // url: 'http://localhost:8000',
    qs: { addr: pair.publicKey() },
    json: true
}, function(error, response, body) {
    if (error || response.statusCode !== 200) {
        console.error('ERROR!', error || body);
    }
    else {
        console.log('SUCCESS! You have a new account :)\n', body);
    }
});



setTimeout(function(){
    server.loadAccount(p).then(function(account) {
        console.log('Balances for account: ' + pair.publicKey());
        account.balances.forEach(function(balance) {
            console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
        });
    }).catch((error) => {
        console.error(error);
    });
},20000);




//
// // get a list of transactions that occurred in ledger 1400
// server.transactions()
//     .forLedger(1400)
//     .call().then(function(r){ console.log(r); })
//     .catch((error) => {
//         console.error(error);
//         });
//
// // get a list of transactions submitted by a particular account
// server.transactions()
//     .forAccount('GASOCNHNNLYFNMDJYQ3XFMI7BYHIOCFW3GJEOWRPEGK2TDPGTG2E5EDW')
//     .call().then(function(r){ console.log(r); })
//     .catch((error) => {
//         console.error(error);
//     });