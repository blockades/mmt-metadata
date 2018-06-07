// local:
const ec = require("./electrum-client");
const electronInterface = require("./electron-interface");
const bitcoinUtils = require("./bitcoin-utils");
const util = require("./util");

const mergeWith = require("lodash.mergewith");
// todo: replace with mergeWith
const merge = require("deepmerge");
const dontMerge = (destination, source) => source;

// const bitcoin = require('bitcoinjs-lib');
// const ByteBuffer = require('bytebuffer');
// const pull = require('pull-stream');

const requiredElectrumVersion = "3.1.3";

// global variables are bad, but using one anyway
var wallet = {
  cosigners: {}
};

const messageTypes = util.messageTypes;

var verbose = true;

// at the bottom of index.html, there's a script tag that opens an ssb-client,
// and calls into this. Thats where everything starts!
// In future we should try and use some kind of dependency injection and render templates
// This way we'll be rendering html based on application state, i.e. from the bottom up
// (rather than jQuery which plucks out from top-down)
// This will give us much greater capacity to build a cool dynamic front-end
// for proof of concept, jQuery is perfect :-)

module.exports = function(root, server) {
  if (server) server.whoami(whoAmICallbackCreator(server));
  else console.error("Unable to connect to server.  Is server running?");
};

function publishMessage(server, type, content, recipients) {
  // publish an encrypted message
  // recipients are embedded in 'content'
  server.private.publish(
    { type, content, recipients },
    recipients,
    (err, msg) => {
      if (err) console.error(err);
      if (verbose) {
        console.log("Published: ", type);
        console.log(JSON.stringify(msg, null, 4));
      }
    }
  );
}

// TODO: sort this out
function initiateWallet(server, mpk) {
  var recipients = Object.keys(wallet.cosigners);

  var initWallet = {
    walletName: "the groovy gang wallet",
    requiredCosigners: 2,
    xpub: mpk
  };

  publishMessage(server, "initiateMmtMultisigTest", initWallet, recipients);
  // TODO: we need the id of this message
}

function shareXpub(server, currentWallet, mpk) {
  var pubKey = {
    // walletId is the key of the initiateMmtMultisig message as above

    walletId: currentWallet,
    xpub: mpk
  };

  publishMessage(server, "shareMmtPublicKeyTest", pubKey, recipients);
}

function createPayTo(server) {
  var payToData = electronInterface.createTransaction(wallet);
  if (payToData) {
    // TODO: ask for password in a secure way. (password here is hard coded to 'test')
    // TODO fix the hardcoded fee of 0.01

    // TODO: we should already display a fee estimation on the 'send' tab somewhere
    ec.getFeeRate(function(err, feeRate) {
      console.log("fee rate", feeRate);
      // going to guess the transaction size for now - taking an example which has
      // 982 hex digits, would be 491 bytes, convert to kb, 0.479492187.  assuming the fee rate is satoshis per kb
      feeInSatoshis = feeRate / 0.479492187;
      feeInBTC = feeInSatoshis / 100000000;

      ec.payTo(
        payToData.recipient,
        payToData.amount,
        feeInBTC,
        "test",
        function(err, output) {
          // console.log(JSON.stringify(output,null,4))

          if (output.hex) {
            let txid;
            // deserialize to take a look at it
            ec.deserialize(output.hex, function(err, deserializedTx) {
              txid = bitcoinUtils.getTransactionId(deserializedTx.result);

              console.log("Txid calculated as", txid);

              var recipients = Object.keys(wallet.cosigners);

              var payment = {
                //walletId: currentWallet,
                key: txid,
                rawTransaction: output.hex,
                // add rate?
                comment: payToData.comment
              };
              publishMessage(
                server,
                "initiateMmtPaymentTest",
                payment,
                recipients
              );
              // todo: add this as an imcomplete tx and display it
            });
          }
        }
      );
    });
  }
}

function recieveMemo(server) {
  var recieveMemoData = electronInterface.createRecieveMemo();
  if (recieveMemoData) {
    recieveMemoData.address = wallet.firstUnusedAddress;
    // TODO: amount, and expiry fields
    ec.addRequest(0, recieveMemoData.memo, false, function(err, output) {
      ec.getUnusedAddress(function(err, output) {
        wallet.firstUnusedAddress = output;
      });

      var recipients = Object.keys(wallet.cosigners);
      publishMessage(
        server,
        "addMmtRecieveCommentTest",
        recieveMemoData,
        recipients
      );

      // display the request
      ec.listRequests(function(err, output) {
        if (err) console.error(err);
        //console.log('requests ', JSON.stringify(output,null,4))
        wallet.requests = output;
        electronInterface.displayWalletInfo(wallet);
      });
    });
  }
}

function whoAmICallbackCreator(server) {
  return function whoAmICallback(err, msg) {
    if (err) console.error("Error running whoami.", err);

    var me = msg.id;

    if (verbose) console.log("whoami: ", me);

    server.about.get(aboutCallbackCreator(server, me));
  };
}

function aboutCallbackCreator(server, me) {
  return function aboutCallback(err, ssbAbout) {
    ec.checkVersion(requiredElectrumVersion, function(err, output) {
      if (err) {
        console.log("Error connecting to electrum");
        $("#notifications").append(
          "Error connecting to electrum.  Is the electrum daemon running, with a wallet loaded?"
        );
      } else {
        if (output) {
          console.log("electrum version ok");
        } else {
          var errmsg =
            "electrum version" + requiredElectrumVersion + "required";
          console.log(errmsg);
          $("#notifications").append(errmsg);
        }
      }
    });

    server.mmtMetadata.get(function(err, dataFromSsb) {
      console.log(
        "Output from mmtMetadata plugin: ",
        JSON.stringify(dataFromSsb, null, 4)
      );

      // tidyWalletInfo()

      var incompleteWallets = util.findIncompleteWallets(dataFromSsb);
      if (incompleteWallets.length > 0) {
        console.log("Wallet Invite Found.  Do you want to join?");
        // form where you can enter and publish public key (for now)
      }

      // Get master public key
      ec.getMpk(function(err, mpk) {
        //var hashMpk = bitcoin.crypto.sha256(Buffer.from(mpk));
        console.log("-----mpk", mpk);
        var currentWallet = util.identifyWallet(dataFromSsb, mpk);
        if (!currentWallet) {
          console.log(
            "Cannot find this wallet on ssb. Do you want to initiate it"
          );
          // first check if there are any incomplete wallets we could possibly join

          // todo: provide a way to initiate it
        } else {
          mergeWith(wallet, dataFromSsb[currentWallet], util.concatArrays);
        }
      });
    });
    
    if (typeof wallet.cosigners[me] === 'undefined') wallet.cosigners[me] = {}
    // not sure if this is the most reliable way to get self-identified name but works for me
    wallet.cosigners[me].name = ssbAbout[me].name[me][0];
    wallet.cosigners[me].image = ssbAbout[me].image[me][0];
    // TODO: this gives image location, we still need to actually get the image from ssb

    console.log("-----cosigners:", JSON.stringify(wallet.cosigners, null, 4));

    // Specify some event handlers.  This needs to be done here where we can
    // pass server.
    $("#recieveMemo").click(function() {
      recieveMemo(server);
    });
    $("#createTransaction").click(function() {
      createPayTo(server);
    });

    // Have scrapped this for now but it was an attempt to automate loading the wallet
    // will only work with unencrypted wallet
    //ec.setupElectrum(walletFile, function (err,output) { })

    ec.getWalletInfo(function(err, output) {
      mergeWith(wallet, output);
      electronInterface.displayWalletInfo(wallet);
    });

    ec.parseHistory(function(err, output) {
      if (err) console.error(err);
      // todo change this to mergeWith
      wallet = merge(wallet, output, {
        arrayMerge: dontMerge
      });

      electronInterface.displayPayments(wallet, currentWallet, server);
    });
  };
}
