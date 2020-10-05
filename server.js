const converter = require('hex2dec')// convert from hexa to decimal
const express = require('express')
const mongoose = require('mongoose')// for mongdodb
const app = express()
//const async = require('async')
//const delay = require('util').promisify(setTimeout);

var handlebars = require('express-handlebars') //for heroku deployment
  .create({
    defaultLayout: 'main'
  });
const Web3 = require("web3") //remote to the evm
const postTran = require('./Models/Transaction') //model for posting a transaction
const port = process.env.PORT || 5050 //defind the env port (localy or deployed)
const cors = require('cors')  // communication between front and end 
const bodyParser = require('body-parser') //parsing 
const { promises } = require('fs');
require('dotenv').config()
app.use(bodyParser.json()) //parsing 
app.use(cors()) 
//let address = '0x07ee55aa48bb72dcc6e9d78256648910de513eca'
mongoose.connect(process.env.MONGODB_URI || process.env.DB_CONNECTION, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, () => {

})//connection to db

var db = mongoose.connection;// connect to db

db.on('error', console.error.bind(console, 'connection error:')); //connection status 
db.on('open', function callback() {
  console.log("connected to db");
});
const web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/8d3bc27c75c84c9c9808a57c80c49d86")) //node connection 

const minABI = [
  // balanceOf
  {
    "constant": true,
    "inputs": [{
      "name": "_owner",
      "type": "address"
    }],
    "name": "balanceOf",
    "outputs": [{
      "name": "balance",
      "type": "uint256"
    }],
    "type": "function"
  },
  // decimals
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{
      "name": "",
      "type": "uint8"
    }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{
      "name": "",
      "type": "string"
    }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }, {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{
      "name": "",
      "type": "string"
    }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }, {
    "constant": false,
    "inputs": [{
      "name": "_to",
      "type": "address"
    }, {
      "name": "_value",
      "type": "uint256"
    }],
    "name": "transfer",
    "outputs": [{
      "name": "",
      "type": "bool"
    }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{
      "name": "_owner",
      "type": "address"
    }, {
      "name": "_spender",
      "type": "address"
    }],
    "name": "allowance",
    "outputs": [{
      "name": "",
      "type": "uint256"
    }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }, {
    "anonymous": false,
    "inputs": [{
      "indexed": true,
      "name": "_from",
      "type": "address"
    }, {
      "indexed": true,
      "name": "_to",
      "type": "address"
    }, {
      "indexed": false,
      "name": "_value",
      "type": "uint256"
    }],
    "name": "Transfer",
    "type": "event"
  }, {
    "anonymous": false,
    "inputs": [{
      "indexed": true,
      "name": "_owner",
      "type": "address"
    }, {
      "indexed": true,
      "name": "_spender",
      "type": "address"
    }, {
      "indexed": false,
      "name": "_value",
      "type": "uint256"
    }],
    "name": "Approval",
    "type": "event"
  }
];// for tokens and contracts information 

const getToken = async (input, tokenadd) => {
  let sign = input.slice(0, 10) // the sign
  let addTo = input.slice(34, 74) // whos the contract 

  let amount = input.slice(75, ) //token amount
  amount = converter.hexToDec(amount)// convert to dec
  const toknAddress = '0x68d57c9a1c35f63e2c83ee8e49a64e9d70528d25' //sirin example

  let contract = new web3.eth.Contract(minABI, tokenadd) //get information about the token/contract - 

  let name = await contract.methods.symbol().call()
  return ({
    amount,
    name
  })
}

const postTransaction = (trx) => {
  const postTrx = new postTran({
    Hash: trx.hash,
    From: trx.from,
    To: trx.to
  })
  postTrx.save()
    .then(data => {
      // res.json(data)
    })
    .catch(err => {
      res.json({
        message: err
      })
    })
}

const getBlockInfo = async (blocknumber) => {
  try {
    console.log('block number ' + blocknumber)
    let result = await web3.eth.getBlock(blocknumber)
    const txn = result.transactions
    let detailTxn = await Promise.all(txn.map(async (item, index) => {
      try {
        var transaction = await web3.eth.getTransaction(item)//get trx
        if (transaction.to !== null) //a point that a contract is made
          transaction.to = transaction.to.toLowerCase()
        if (parseInt(transaction.value) === 0 && transaction.to !== null) {//is a token?
          let res = await getToken(transaction.input, transaction.to)
          transaction.value = res.amount
          transaction.token = res.name
        } else
          transaction.value = web3.utils.fromWei(transaction.value, "ether")//value of ether
        transaction.gasPrice = web3.utils.fromWei(transaction.gasPrice, "ether")//gas price
        let receipt = await web3.eth.getTransactionReceipt(item)//get the reciept of the trx
        transaction.gasUsed = receipt.gasUsed //gas used
        transaction.timestamp = result.timestamp * 1000 //time 
        //transaction.time = new Date(transaction.timestamp)
        transaction.fee = parseFloat(transaction.gasPrice) * transaction.gasUsed //fee of the trx
        //allTrx.push(transaction)
        transaction.from = transaction.from.toLowerCase()
        transaction.hash = transaction.hash.toLowerCase()
        postTransaction(transaction)
        return transaction;
      } catch (err) {
        // console.log(err)
        var transaction = await web3.eth.getTransaction(item)
        if (transaction.to !== null) //a point that a contact is made
          transaction.to = transaction.to.toLowerCase()
        transaction.value = web3.utils.fromWei(transaction.value, "ether")
        transaction.gasPrice = web3.utils.fromWei(transaction.gasPrice, "ether")
        let receipt = await web3.eth.getTransactionReceipt(item)
        transaction.gasUsed = receipt.gasUsed
        transaction.timestamp = result.timestamp * 1000
        transaction.time = new Date(transaction.timestamp)
        transaction.fee = parseFloat(transaction.gasPrice) * transaction.gasUsed
        //allTrx.push(transaction)
        transaction.from = transaction.from.toLowerCase()
        transaction.hash = transaction.hash.toLowerCase()
        postTransaction(transaction)
        return transaction;
      }
    })) 
    return detailTxn
  } catch (err) {
    console.log(err)
  }
}

const getBlockchain = async (blocknum) => {
  try {
    let Promises = []
    console.log('start')
   
     let blockInfo =  getBlockInfo(blocknum)
      Promises.push(blockInfo)
      let blockChain= await Promise.all(Promises)
   console.log(blockChain)
    console.log('end')
    return 'hello';
  } catch {
    console.log(err)
  }
}



let i=700000
const blockChainHandler=()=>{
  setTimeout(()=>{
    getBlockchain(i)
i++
if(i<=700100){
  blockChainHandler()
}
  },1000)
}
app.get('/', async (req, res) => {
  res.send('im loading')
 // getBlockchain()
 blockChainHandler()
  //console.log(hello)


})

app.listen(port, () => {
  console.log(`server up on port ${port}`)
})