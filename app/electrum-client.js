// functions for talking to electrum via http
const request = require("request");
const mergeWith = require("lodash.mergewith");

var exec = require("child_process").exec;

const testnet = true;

var baseCommand = "electrum ";
if (testnet) baseCommand += "--testnet ";

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

var ec = (module.exports = {});

electrumRequest = function(method, params, callback) {
  // username and pw should be read from config file
  // note: this is not the actual password which the wallet is encrypted
  //       with, its just for basic http authentication on a local machine
  //
  // TODO: 8888 is not the default port
  //       by default electrum uses a random port, so we must set it with
  //       electrum setconfig rpcport 8888
  //       This needs to be automated.

  var options = {
    method: "POST",
    json: { id: "curltext", method: method, params: params },
    url: "http://127.0.0.1:8888",
    auth: {
      username: "spinach",
      password: "test"
    }
  };
  request(options, function(err, response, body) {
    // todo: display this error message on the html page
    if (err)
      console.log("Error from electrum.  Is the electrum daemon running?", err);

    callback(err, body);
  });
};

ec.setupElectrum = function(walletFile, callback) {
  // could split this into separate function so we can switch
  // wallets without restarting the daemon but this will do
  // for now.

  // TODO: either just run these commands or check if they were
  // allready run with getconfig
  //electrum --testnet setconfig rpcport 8888
  //electrum --testnet setconfig rpcuser spinach
  //electrum --testnet setconfig rpcpassword test

  console.log("Starting electrum daemon");
  var child = exec(baseCommand + "daemon start", function(err, stdout, stderr) {
    if (err) throw err;
    else {
      console.log(stdout);
      console.log("Electrum daemon stopped");
    }
  });

  // '~/.electrum/testnet/wallets/testnetw daemon'

  var child = exec(
    baseCommand + "-w " + walletFile + " daemon load_wallet",
    function(err, stdout, stderr) {
      if (err) throw err;
      else {
        console.log(stdout);
        console.log("Wallet " + walletFile + " loaded successfully");
        callback(err, stdout);
      }
    }
  );
};

ec.stopElectrum = function(walletFile, callback) {
  console.log("Stopping electrum daemon");
  var child = exec(baseCommand + "daemon stop", function(err, stdout, stderr) {
    if (err) throw err;
    else {
      console.log(stdout);
      console.log("Electrum daemon stopped successfully");
    }
  });
};

// should this be run as an external command so that we know even before
// starting daemon?
ec.checkVersion = function(requiredVersion, callback) {
  // todo: remove dots from version number, convert to int and do >
  electrumRequest("version", [], function(err, output) {
    var check = false;
    // are we actually connected to electrum?
    if (output) if (output.result) check = output.result === requiredVersion;
    callback(err, check);
  });
};

ec.broadcast = function(tx, callback) {
  // TODO: broadcast optionally takes 'timeout' in seconds
  //       is this useful?
  electrumRequest("broadcast", { tx }, function(err, output) {
    callback(err, output);
  });
};

ec.getUnusedAddress = function(callback) {
  electrumRequest("getunusedaddress", [], function(err, output) {
    callback(err, output.result);
  });
};

ec.listAddresses = function(callback) {
  electrumRequest("listaddresses", [], function(err, output) {
    callback(err, output.result);
  });
};

ec.listRequests = function(callback) {
  electrumRequest("listrequests", [], function(err, output) {
    callback(err, output.result);
  });
};

ec.signTransaction = function(tx, password, callback) {
  electrumRequest("signtransaction", { tx, password }, function(err, output) {
    callback(err, output.result);
  });
};

ec.getMpk = function(callback) {
  electrumRequest("getmpk", [], function(err, output) {
    callback(err, output.result);
  });
};

// this can create a one-off multisig address,  not a multisig wallet
// see https://gist.github.com/atweiden/7272732#file-2of3-md
ec.createMultisig = function(num, pubKeys, callback) {
  electrumRequest("createmultisig", { num: num, pubkeys: pubKeys }, function(
    err,
    output
  ) {
    callback(err, output.result);
  });
};

ec.getTransaction = function(txid, callback) {
  // get a tx and deserialize it
  electrumRequest("gettransaction", { txid: txid }, function(err, output) {
    electrumRequest("deserialize", { tx: output.result.hex }, function(
      err,
      output
    ) {
      callback(err, output);
    });
  });
};

ec.deserialize = function(tx, callback) {
  electrumRequest("deserialize", { tx: tx }, function(err, output) {
    callback(err, output);
  });
};

ec.extractDataFromTx = function(tx, callback) {
  electrumRequest("deserialize", { tx }, function(err, output) {
    if (err) return callback(err, null);
    var txData = output.result;
    var transaction = {};

    // todo: take from signatures from all inputs?
    transaction.signatures = txData.inputs[0].signatures;
    // (array of signatures where the missing ones are 'null')
    transaction.outputs = txData.outputs;
    //value -int,satoshis,  address
    // TODO: use ismine to find which is the change address
    callback(err, transaction);
  });
};

// note this wont work with older electrum versions, but we kind of need it for building
// transactions
ec.getFeeRate = function(callback) {
  electrumRequest("getfeerate", [], function(err, output) {
    callback(err, output.result);
  });
};

ec.addRequest = function(amount, memo, expiration, callback) {
  var p = { amount: amount };
  if (memo) p["memo"] = memo;
  if (expiration) p["expiration"] = expiration;
  electrumRequest("addrequest", p, function(err, output) {
    callback(err, output.result);
  });
};

ec.payTo = function(destination, amount, fee, password, callback) {
  let payData = { destination: destination, amount: amount };
  if (!!fee) {
    payData["fee"] = fee;
  }
  if (!!password && password !== "") payData.password = password;

  electrumRequest("payto", payData, function(err, output) {
    if (typeof output.result !== "undefined") output = output.result;
    callback(err, output);
  });
};

ec.payToMany = function(outputs, callback) {
  // TODO: ouputs must be list of ["address", amount] --test this
  electrumRequest("payto", { outputs: outputs }, function(err, output) {
    if (typeof output.result !== "undefined") output = output.result;
    callback(err, output);
  });
};

ec.getBalance = function(callback) {
  electrumRequest("getbalance", [], function(err, output) {
    if (output && output.result) callback(err, output.result);
    else callback(1, null);
  });
};

ec.history = function(callback) {
  electrumRequest("history", [], function(err, output) {
    // JSON.parse is needed with electrum version 3.1.3
    if (typeof output.result !== "undefined")
      output = JSON.parse(output.result);
    callback(err, output);
  });
};

ec.parseHistory = function(callback) {
  ec.history(function(err, output) {
    // note: electrums history formatting varies greatly with electrum versions
    //       this requires electrum version 3.1.3
    var wallet = {
      transactions: {}
    };
    if (typeof output.transactions === "undefined") output.transactions = [];

    if (output.transactions.length > 0) {
      output.transactions.forEach(function(transaction) {
        wallet.transactions[transaction.txid] = {};

        // TODO: value is a string eg "1.0 BTC" - convert to int
        wallet.transactions[transaction.txid].amount = transaction.value;

        wallet.transactions[transaction.txid].confirmations =
          transaction.confirmations;

        wallet.transactions[transaction.txid].broadcast = true;

        // convert timestamp to seconds to use as javascript date
        wallet.transactions[transaction.txid].timestamp =
          transaction.timestamp * 1000;

        // copy transaction.label as comment?

        // TODO: what to do about the date for partially signed transactions? what is locktime?

        electrumRequest("gettransaction", { txid: transaction.txid }, function(
          err,
          rawTx
        ) {
          ec.extractDataFromTx(rawTx.result.hex, function(
            err,
            moreTransactionData
          ) {
            mergeWith(
              wallet.transactions[transaction.txid],
              moreTransactionData
            );
            callback(err, wallet);
          });
        });
      });
    } else {
      callback(err, wallet);
    }
    // could store balance as
    //output.summary.end_balance.value
    // or get it from getBalance
  });
};

ec.getWalletInfo = function(callback) {
  var wallet = {};
  // the pyramid of doom!  (fix this)
  ec.getBalance(function(err, output) {
    if (!err) wallet.balance = parseFloat(output.confirmed);

    ec.listAddresses(function(err, output) {
      if (err) console.error(err);
      //console.log('addresses ', JSON.stringify(output,null,4))
      //wallet.addresses = output;
      if (typeof wallet.addresses === "undefined") wallet.addresses = {};
      output.forEach(function(address) {
        if (typeof wallet.addresses[address] === "undefined")
          wallet.addresses[address] = {};
      });

      ec.listRequests(function(err, output) {
        if (err) console.error(err);

        output.forEach(function(request) {
          wallet.addresses[request.address] = request;
        });

        ec.getUnusedAddress(function(err, output) {
          wallet.firstUnusedAddress = output;
          // TODO: qr code
          callback(err, wallet);
        });
      });
    });
  });
};
