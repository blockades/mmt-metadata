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

function shareXpub(server, mpk) {
  var pubKey = {
    // walletId is the key of the initiateMmtMultisig message as above

    walletId: wallet.walletId,
    xpub: mpk
  };

  util.publishMessage(
    server,
    "shareMmtPublicKeyTest",
    pubKey,
    recipients,
    wallet.walletId,
    mergeAndDisplay
  );
}

function createPayTo(server) {
  var payToData = electronInterface.createTransaction(wallet);
  if (payToData) {
    // TODO: ask for password in a secure way. (password here is hard coded to 'test')

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
                walletId: wallet.walletId,
                key: txid,
                rawTransaction: output.hex,
                // add rate?
                comment: payToData.comment
              };
              util.publishMessage(
                server,
                "initiateMmtPaymentTest",
                payment,
                recipients,
                wallet.walletId,
                mergeAndDisplay
              );
            });
          }
        }
      );
    });
  }
}

function recieveMemo(server) {
  var recieveMemoData = electronInterface.createRecieveMemo();
  console.log("firstunsed", wallet.firstUnusedAddress);
  if (recieveMemoData) {
    recieveMemoData.walletId = wallet.walletId;
    recieveMemoData.address = wallet.firstUnusedAddress;
    // TODO: amount, and expiry fields
    ec.addRequest(0, recieveMemoData.memo, false, function(err, output) {
      ec.getUnusedAddress(function(err, output) {
        wallet.firstUnusedAddress = output;
      });

      var recipients = Object.keys(wallet.cosigners);
      util.publishMessage(
        server,
        "addMmtRecieveCommentTest",
        recieveMemoData,
        recipients,
        wallet.walletId,
        function(err, updatedData, server) {
          mergeWith(wallet, updatedData, util.concatArrays);
          electronInterface.displayWalletInfo(wallet);
        }
      );

      ec.getWalletInfo(function(err, output) {
        mergeWith(wallet, output);
        electronInterface.displayWalletInfo(wallet);
      });
    });
  }
}

function cosignerInfo(ssbAbout) {
  Object.keys(wallet.cosigners).forEach(function(cosigner) {
    // not sure if this is the most reliable way to get self-identified name but works for me
    wallet.cosigners[cosigner].name = ssbAbout[cosigner].name[cosigner][0];
    wallet.cosigners[cosigner].image = ssbAbout[cosigner].image[cosigner][0];
    // TODO: this gives image location, we still need to actually get the image from ssb
  });
}

function whoAmICallbackCreator(server) {
  return function whoAmICallback(err, msg) {
    if (err) console.error("Error running whoami.", err);

    var me = msg.id;

    if (verbose) console.log("whoami: ", me);

    server.about.get(aboutCallbackCreator(server, me));
  };
}

function mergeAndDisplay(err, updatedData, server) {
  // never ending loop. This looks dangerous
  mergeWith(wallet, updatedData, util.concatArrays);
  electronInterface.displayPayments(wallet, server, mergeAndDisplay);
}

function calculateOutgoingAmount() {
  for (transaction in wallet.transactions) {
    // Calculate total outgoing value of transaction
    // Here we have just checked if it is an address of ours we know about.
    // we could use electrums isMine to do this, im not sure if this would
    // give a better indication (eg: notice if its an address of our we havent
    // generated yet).
    if (typeof wallet.transactions[transaction].amount === "undefined")
      if (typeof wallet.transactions[transaction].outputs != "undefined") {
        wallet.transactions[transaction].amount = 0;
        wallet.transactions[transaction].outputs.forEach(function(anOutput) {
          if (Object.keys(wallet.addresses).indexOf(anOutput.address) < 0)
            wallet.transactions[transaction].amount -= anOutput.value;
        });
      }
  }
}
function updateWalletInfo(server) {
  ec.getWalletInfo(function(err, output) {
    mergeWith(wallet, output);
    calculateOutgoingAmount();
    electronInterface.displayWalletInfo(wallet);
    electronInterface.displayPayments(wallet, server, mergeAndDisplay);
  });
}



function aboutCallbackCreator(server, me) {
  return function aboutCallback(err, ssbAbout) {

    wallet.walletId = null;

    var electrumRunning = false;
    server.mmtMetadata.get(function(err, dataFromSsb) {
      if (err) throw (err)
      // console.log(
      //   "Output from mmtMetadata plugin: ",
      //   JSON.stringify(dataFromSsb, null, 4)
      // );

      // tidyWalletInfo()

      //var incompleteWallets = util.findIncompleteWallets(dataFromSsb);
      var walletInvitations = util.findWalletsNotSignedBy(me,dataFromSsb);

      ec.checkVersion(requiredElectrumVersion, function(err, output) {
        if (err) {
          console.log("Error connecting to electrum");
          $("#notifications").append(
            "Cannot connect to electrum.  Is the electrum daemon running, with a wallet loaded? <BR>"
          );
          if (walletInvitations.length > 0) electronInterface.sharePubKeyForm(walletInvitations,null)
          else electronInterface.initateWalletForm (server,ssbAbout,null)
        } else {
          electrumRunning = true;
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

      if (electrumRunning) {
        // Get master public key
        ec.getMpk(function(err, mpk) {
          // TODO: handle the situation the daemon is running with no wallet loaded
          if (err) throw (err)
          //var hashMpk = bitcoin.crypto.sha256(Buffer.from(mpk));
          console.log("-----mpk", mpk);
          wallet.walletId = util.identifyWallet(dataFromSsb, mpk);
          if (!wallet.walletId) {
            electronInterface.initateWalletForm (server,ssbAbout,mpk)
          } else {
            mergeWith(wallet, dataFromSsb[wallet.walletId], util.concatArrays);

            // deserialize all transactions
            for (transaction in wallet.transactions) {
              if (
                typeof wallet.transactions[transaction].rawTransaction !=
                "undefined"
              ) {
                ec.extractDataFromTx(
                  wallet.transactions[transaction].rawTransaction,
                  function(err, transactionData) {
                    mergeWith(
                      wallet.transactions[transaction],
                      transactionData,
                      util.concatArrays
                    );

                    electronInterface.displayPayments(
                      wallet,
                      server,
                      mergeAndDisplay
                    );
                  }
                );
              }
            }
            cosignerInfo(ssbAbout);
            //TODO: get image with something like:
            //server.blobs.get(wallet.cosigners[me].image)

            // Specify some event handlers.  This needs to be done here where we can
            // pass server
            $("#recieveMemo").click(function() {
              recieveMemo(server);
            });
            $("#createTransaction").click(function() {
              createPayTo(server);
            });
            electronInterface.displayPayments(wallet, server, mergeAndDisplay);

            updateWalletInfo(server);
          }
        });
        }
      });
      if (electrumRunning) {
      // TODO: do we need this?  its repeated in cosignerInfo()
      if (typeof wallet.cosigners[me] === "undefined") wallet.cosigners[me] = {};
      // not sure if this is the most reliable way to get self-identified name but works for me
      wallet.cosigners[me].name = ssbAbout[me].name[me][0];
      wallet.cosigners[me].image = ssbAbout[me].image[me][0];


      // Have scrapped this for now but it was an attempt to automate loading the wallet
      // will only work with unencrypted wallet
      //ec.setupElectrum(walletFile, function (err,output) { })

      updateWalletInfo(server);

      ec.parseHistory(function(err, output) {
        if (err) console.error(err);
        // todo change this to mergeWith
        wallet = merge(wallet, output, {
          arrayMerge: dontMerge
        });

        console.log(JSON.stringify(wallet, null, 4));
        electronInterface.displayPayments(wallet, server, mergeAndDisplay);
      });
  }
  };
}
