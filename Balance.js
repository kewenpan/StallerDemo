var StellarSdk = require('stellar-sdk');
StellarSdk.Network.useTestNetwork();

// var server = new StellarSdk.Server('http://localhost:8000',{allowHttp: true});
var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

var p1 = 'GA4FFPNHJ5KFD6CMQZG3SVVEHJQPCYOU6Y3L36IZPOT6WN5HVFPQWBRO';
var p2 = 'GDVOOBOONLLPMYTVTZGFA3J3C4JOV6KHPZVKGWCAW7BWZYCMU67MBCNK';
var escrow = 'GBFOUE3E4TABITHPYPXFWAIF5X77AOTOURY6FZXDGLRVIYEG63IC2NSX';


// balance(p1);
// balance(p2);
// balance(escrow);

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

module.exports.balance = balance;

