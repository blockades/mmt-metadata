
// functions for talking to electrum via http

const request = require('request');

var exec = require('child_process').exec

const testnet = true

var baseCommand = 'electrum '
if (testnet) baseCommand += '--testnet '


// things we probably need: (theres more but this is the basics)
// addrequest          Create a payment request, using the first unused
//                     address of the wallet
// addtransaction      Add a transaction to the wallet history
// broadcast           Broadcast a transaction to the network
// createmultisig      Create multisig address
// createnewaddress    Create a new receiving address, beyond the gap limit
//                     of the wallet
// deserialize         Deserialize a serialized transaction
// getbalance          Return the balance of your wallet
// getconfig           Return a configuration variable
// getfeerate          Return current optimal fee rate per kilobyte,
//                     according to config settings (static/dynamic)
// getmpk              Get master public key
// getrequest          Return a payment request
// gettransaction      Retrieve a transaction
// getunusedaddress    Returns the first unused address of the wallet, or
//                     None if all addresses are used
// history             Wallet history
// is_synchronized     return wallet synchronization status
// ismine              Check if address is in wallet
// listaddresses       List wallet addresses
// listrequests        List the payment requests you made
// notify              Watch an address
// payto               Create a transaction
// paytomany           Create a multi-output transaction
// setconfig           Set a configuration variable
// setlabel            Assign a label to an item
// signtransaction     Sign a transaction
// version             Return the version of electrum

var ec = module.exports = {}

electrumRequest = function (method, params, callback) {

  // username and pw should be read from config file
  // note: this is not the actual password which the wallet is encrypted
  //       with, its just for basic http authentication on a local machine
  // 
  // TODO: 8888 is not the default port
  //       by default electrum uses a random port, so we must set it with
  //       electrum setconfig rpcport 8888
  //       This needs to be automated.
  
  var options = {  
      method: 'POST',
      json: {"id":"curltext","method":method,"params": params},
      url: 'http://127.0.0.1:8888',
      auth: {
          username: 'spinach',
          password: 'test'
      }
  }
  request(options, function(err,response,body) {
    if (err) console.log("Error from electrum.  Is the electrum daemon running?",err)
    callback(err,body)
  })

}

ec.setupElectrum = function (walletFile,callback) {
  // could split this into separate function so we can switch
  // wallets without restarting the daemon but this will do 
  // for now.

  // TODO: either just run these commands or check if they were
  // allready run with getconfig
  //electrum --testnet setconfig rpcport 8888
  //electrum --testnet setconfig rpcuser spinach
  //electrum --testnet setconfig rpcpassword test
  

  console.log('Starting electrum daemon')
  var child = exec(baseCommand + 'daemon start', function(err, stdout, stderr) {
      if (err) throw err
      else {
        console.log(stdout)
        console.log('Electrum daemon stopped')
      }
  })

  // '~/.electrum/testnet/wallets/testnetw daemon' 

  var child = exec(baseCommand + '-w '+walletFile+' daemon load_wallet', function(err, stdout, stderr) {
      if (err) throw err
      else {
        console.log(stdout)
        console.log('Wallet '+walletFile+' loaded successfully')
        callback(err,stdout)
      }
  })
}


ec.stopElectrum = function (walletFile,callback) {
  console.log('Stopping electrum daemon')
  var child = exec(baseCommand + 'daemon stop', function(err, stdout, stderr) {
      if (err) throw err
      else {
        console.log(stdout)
        console.log('Electrum daemon stopped successfully')
      }
  })
}

// should this be run as an external command so that we know even before 
// starting daemon?
ec.checkVersion = function (requiredVersion, callback) {
  // todo: remove dots from version number, convert to int and do > 
  electrumRequest("version", [], function (err,output) {
    var check = false
    // are we actually connected to electrum?
    if (output) if (output.result) check = (output.result === requiredVersion)
    callback(err, check)
  })
}

ec.getUnusedAddress = function (callback) {
  electrumRequest("getunusedaddress", [], function (err,output) {
    callback(err, output.result)
  })
}

ec.listAddresses = function (callback) {
  electrumRequest("listaddresses", [], function (err,output) {
    callback(err, output.result)
  })
}

ec.signTransaction = function (tx,password,callback) {
  electrumRequest("getmpk", {"tx": tx, "password": password }, function (err,output) {
    callback(err, output.result)
  })
}

ec.getMpk = function (callback) {
  electrumRequest("getmpk", [], function (err,output) {
    callback(err, output.result)
  })
}

// this can create a one-off multisig address,  not a multisig wallet
// see https://gist.github.com/atweiden/7272732#file-2of3-md
ec.createMultisig = function (num,pubKeys,callback) {
  electrumRequest("createmultisig", { "num": num, "pubkeys": pubKeys }, function (err,output) {
    callback(err, output.result)
  })
}

ec.getTransaction = function (txid, callback) {
  // get a tx and deserialize it
  electrumRequest("gettransaction",{ "txid":txid }, function (err,output) {
    electrumRequest("deserialize", { "tx":output.result.hex }, function (err,output) {
      callback(err,output)
    })
  })
}


// note this wont work with older electrum versions, but we kind of need it for building
// transactions
ec.getFeeRate = function (callback) {
  electrumRequest("getfeerate", [], function (err,output) {
    callback(err,output.result)
  })
}

ec.addRequest = function (amount,memo,expiration, callback) {
  var p = { "amount": amount }
  if (memo) p["memo"] = memo
  if (expiration) p["expiration"] = expiration
  electrumRequest("addrequest", p, function (err,output) {
    callback(err,output.result)
  })
}

ec.payTo = function (destination, amount, callback) {
  electrumRequest("payto", { "destination":destination, "amount":amount }, function (err,output) {
    callback(err,output)
  })
}

ec.payToMany = function (outputs, callback) {
  // TODO: ouputs must be list of ["address", amount] --test this
  electrumRequest("payto", { "outputs": outputs }, function (err,output) {
    callback(err,output)
  })
}

ec.getBalance = function (callback) {
  electrumRequest("getbalance", [], function (err,output) {
    if ((output) && output.result)
      callback(err,output.result)
    else 
      callback(1,null)
  })
}

ec.history = function (callback) {
  electrumRequest("history", [], function (err,output) {
    if (typeof output.result !== 'undefined') output = output.result
    callback(err,output)
  })
}

ec.parseHistory = function (wallet, callback) {
  ec.history( function(err,output) {
      if (output.transactions) 
        output.transactions.forEach(function(transaction) {
          if (typeof wallet.payments === 'undefined') 
            wallet.payments = {}
          if (typeof wallet.payments[transaction.txid] === 'undefined') 
            wallet.payments[transaction.txid] = {}
          wallet.payments[transaction.txid].amount = transaction.value.value
          wallet.payments[transaction.txid].confirmations = transaction.confirmations
        
          // convert timestamp to seconds to use as javascript date
          wallet.payments[transaction.txid].timestamp = transaction.timestamp * 1000
          
          // copy transaction.label as comment?
        
        })
      // could store balance as
      //output.summary.end_balance.value
      // or get it from getBalance
    callback(err,wallet)
 })
}



// test 
// ec.checkVersion("3.1.3", function(err, output) {
//   if (err) { 
//     console.log("Error connecting to electrum")
//   } else {
//     if (output) { 
//       console.log("electrum version ok")
//     } else {
//       console.log("electrum version 3.1.3 required")
//     }
//   }
// })





// deserialize a tx
//getTransaction('dc4c9bf17b2dff0fff82e2b7cc98b343c14479586a4b8099dc0c52c825176647',function (err,output) {
//  if (err) console.error(err)
//  console.log(JSON.stringify(output,null,4))
//} )

