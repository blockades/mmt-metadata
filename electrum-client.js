
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
  // TODO: 8888 is not the default port
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
    if (err) console.error(err)
    callback(body)
  })

}

// an example request for history with no parameters
electrumRequest("history",[], function (output) {
  console.log(JSON.stringify(output,null,4))
})
