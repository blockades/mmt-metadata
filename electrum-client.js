
// functions for talking to electrum via http

const request = require('request');

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



function electrumRequest (method, params, callback) {

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
    callback(err,body)
  })

}


function checkVersion (requiredVersion, callback) {
  electrumRequest("version", [], function (err,output) {
    var check = false
    // are we actually connected to electrum?
    if (output) if (output.result) check = (output.result === requiredVersion)
    callback(err, check)
  })
}

function signTransaction(tx,password,callback {
  electrumRequest("getmpk", {"tx": tx, "password": password }, function (err,output) {
    callback(err, output.result)
  })
})

function getMpk (callback) {
  electrumRequest("getmpk", [], function (err,output) {
    callback(err, output.result)
  })
}

// this can create a one-off multisig address,  not a multisig wallet
// see https://gist.github.com/atweiden/7272732#file-2of3-md
function createMultisig (num,pubKeys,callback) {
  electrumRequest("createmultisig", { "num": num, "pubkeys": pubKeys }, function (err,output) {
    callback(err, output.result)
  })
}

function getTransaction (txid, callback) {
  // get a tx and deserialize it
  electrumRequest("gettransaction",{ "txid":txid }, function (err,output) {
    electrumRequest("deserialize", { "tx":output.result.hex }, function (err,output) {
      callback(err,output)
    })
  })
}


// note this wont work with older electrum versions
function getFeeRate (callback) {
  electrumRequest("getfeerate", [], function (err,output) {
    callback(err,output.result)
  })
}

function addRequest (amount,memo,expiration, callback) {
  var p = { "amount": amount }
  if (memo) p["memo"] = memo
  if (expiration) p["expiration"] = expiration
  electrumRequest("addrequest", p, function (err,output) {
    callback(err,output.result)
  })
}

function payTo (desination, amount, callback) {
  electrumRequest("payto", { "destination":destination, "amount":amount }, function (err,output) {
    callback(err,output)
  })
}

function payToMany (outputs, callback) {
  // TODO: ouputs must be list of ["address", amount] --test this
  electrumRequest("payto", { "outputs": outputs }, function (err,output) {
    callback(err,output)
  })
}

function history (callback) {
  electrumRequest("history", [], function (err,output) {
    callback(err,output.result)
  })
}

checkVersion("3.1.3", function(err, output) {
  if (err) { 
    console.log("Error connecting to electrum")
  } else {
    if (output) { 
      console.log("electrum version ok")
    } else {
      console.log("electrum version 3.1.3 required")
    }
  }
})

addRequest(0, '', 0, function(err,output) {

  console.log(JSON.stringify(output,null,4))
})


// deserialize a tx
//getTransaction('dc4c9bf17b2dff0fff82e2b7cc98b343c14479586a4b8099dc0c52c825176647',function (err,output) {
//  if (err) console.error(err)
//  console.log(JSON.stringify(output,null,4))
//} )

