var dateFormat = require('dateformat');
var fun = require('./StellarHashXDemoFun.js');

//hash（x） 赎回机制
// hash(x) 开始时间，结束时间  回撤开始时间
var hashxStart = 30;
var hashxEnd = 60;
var recoveryStart = 60;

//hash(x) 提交时间   回撤提交时间
var hashxSubmit = 45;
var recoverySubmit = 65;


var x = '123';  //只有B账户知道
var hashB =  fun.newHashX(x);
var currentTime = Date.now()/1000;
console.log("当前时间：", logTime(currentTime));
console.log('B 提交hash(x)时间段：',logTime(currentTime+hashxStart),'--',logTime(currentTime+hashxEnd));
console.log('A 回撤开始时间：', logTime(currentTime+recoveryStart));

console.log('预设B提交 hash时间：', logTime(currentTime+hashxSubmit));
console.log('预设A回撤时间：', logTime(currentTime+recoverySubmit));

var preAuthTx;

console.log("\n\n*** 建立委托账户 ***")
fun.createAndFundNewAccount();

setTimeout(function () {
    fun.currentStep(1);
    step2();
},10*1000)


function step2(){
    console.log("\n\n*** A为委托账户转10LXM ***")
    fun.payEscrow()
        .then(() => { console.log('A为委托账户转10LXM ok') })
        .catch((e) => { console.error(e); throw e})

    setTimeout(function () {
        fun.currentStep(2);
        step3();
    },5*1000)
}

async function step3(){
    //构造hash(x)交易
    fun.txHashXToB(currentTime, hashxStart, hashxEnd);

    fun.recoveryToA(currentTime, recoveryStart)
        .then((tx) => {
            preAuthTx = tx;
            //设置签名规则
            console.log("\n\n\n*** 委托账户构造多方签名 ***")
            console.log('签名策略改变:',logTime(Date.now()/1000));
            fun.setEscrowMultisig(hashB, preAuthTx)
                .then(() => { console.log('委托账户构造多方签名 over') })
                .catch((e) => { console.error(e); throw e})

        })
        .catch((e) => { console.error(e); throw e})

    var timeout = hashxSubmit-(Date.now()/1000-currentTime);
    setTimeout(function () {
        fun.currentStep(3);
        step4();            //B 用X来取回资产
    },timeout*1000)

    timeout = recoverySubmit-(Date.now()/1000-currentTime);
    setTimeout(function () {
        fun.currentStep(4);
        step5();            //A 赎回资产
    },timeout*1000)
}


function step4(){
    console.log("\n\n\n*** B 提交使用X签名的交易 ***")
    fun.hashXSignatureB(x)
        .then(() => {
            console.log('B hash(x) 时间：', logTime(Date.now()/1000))
        })
        .catch((e) => { console.error(e); throw e})

    setTimeout(function () {
        fun.currentStep(4);
    },15*1000)

}

function step5(){
    console.log("\n\n\n*** 回撤提交执行 ***")
    console.log('回撤时间：', logTime(Date.now()/1000))
    fun.recoverySubmitToA(preAuthTx)
        .then(() => {

        })
        .catch((e) => { console.error(e); throw e})

    setTimeout(function () {
        fun.currentStep(5);
    },15*1000)

}


function logTime(t) {
    return dateFormat(t*1000, "dddd, mmmm dS, yyyy, h:MM:ss TT");
}
