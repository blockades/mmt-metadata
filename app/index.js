const pull = require('pull-stream')
const fs = require('fs')
const bitcoin = require('bitcoinjs-lib')
const ByteBuffer = require("bytebuffer")
const btcnodejs = require('btcnodejs')
const merge = require('deepmerge')
const dontMerge = (destination, source) => source
const ec = require("./electrum-client")
const electronInterface = require("./electron-interface")

btcnodejs.network.setup('testnet')

// this will be replaced by a flume view
const localDbFile = '../localdb.json'
var wallets = require(localDbFile)

// for now just use the first wallet (we need to let the user choose)
// TODO: this wont work if there are no wallets yet
var currentWallet = Object.keys(wallets)[0]

//var cosigners = {}
//var recipients = []
const requiredElectrumVersion = "3.1.3"

const messageTypes = [
  'initiateMmtMultisigTest',
  'shareMmtPublicKeyTest',
  'initiateMmtPaymentTest',
  'signMmtPaymentTest',
  'addMmtPaymentCommentTest',
  'addMmtRecieveCommentTest'
]

var verbose = true

// this is temporary
//var walletFile = '~/.electrum/testnet/wallets/default_wallet'

// at the bottom of index.html, there's a script tag that opens an ssb-client,
// and calls into this. Thats where everything starts!
// In future we should try and use some kind of dependency injection and render templates
// This way we'll be rendering html based on application state, i.e. from the bottom up
// (rather than jQuery which plucks out from top-down)
// This will give us much greater capacity to build a cool dynamic front-end
// for proof of concept, jQuery is perfect :-)

module.exports = function (root, server) {
  if (server) server.whoami(whoAmICallbackCreator(server))
  else console.error('Unable to connect to server.  Is server running?')
}

// todo:
//   make less ugly
//   error handling
//   validation
//   interact with wallet either electrum locally or bitcoin on a server
//   re-write rates tool into node
//   make more modular -split into many tiny node modules

function publishMessage (server, type, content, recipients) {
  // publish an encrypted message
  // recipients are embedded in 'content'
  server.private.publish({ type, content, recipients }, recipients, (err, msg) => {
    if (err) console.error(err)
    if (verbose) {
      console.log('Published: ', messageType)
      console.log(JSON.stringify(msg, null, 4))
    }
  })
}

function writeDbLocally() {
  if (verbose) console.log('writing to local file')
  // should use deepmerge
  fs.writeFileSync(
    localDbFile,
    JSON.stringify(wallets,null,4)
  )
}

function processDecryptedMessage(err, msg, author, ssbKey, currentWallet, server) {
  if (msg) {
    if (verbose) console.log('Found a ', msg.type, ' with key:', ssbKey)
    //if (verbose) console.log(JSON.stringify(msg,null,4))

    // determine id for wallet
    var walletId = ''
    if (msg.type === 'initiateMmtMultisigTest')  {
      walletId = ssbKey
    } else {
      walletId = msg.content.walletId
    }

    // if we dont yet have this record, create it
    if (typeof wallets[walletId] === 'undefined') wallets[walletId] = {}

    switch (msg.type) {
      case 'initiateMmtMultisigTest':
        if (typeof wallets[ssbKey] === 'undefined') {
          // TODO:
          // this wallet we dont yet know of, but we are invited to join
          // since we are a recipient.  so this is the place do choose to
          // accept the inivitation, generate a public key and publish it
          wallets[ssbKey] = {}
        }
        wallets[ssbKey].name = msg.content.walletName

        //wallets[ssbKey].cosigners = msg.recipients

        // note number of cosigners is wallet[ssbKey].cosigners.length
        // todo: validate requiredCosigners < cosigners.length
        wallets[ssbKey].requiredCosigners = msg.content.requiredCosigners
        addXpub(msg,author,ssbKey,true)
        break

      case 'shareMmtPublicKeyTest':
        if (typeof wallets[msg.content.walletId] === 'undefined')
          wallets[walletId] = {}
        addXpub(msg, author, msg.content.walletId,false)
        // TODO:
        // check if the wallet is now 'complete', that is
        // if (wallets[walletId].publicKeys.length === msg.recipients.length)
        // and if it is do something like wallets[walletId].isActive = true
        // but why are these stored separetly?  fix this
        break

      case 'initiateMmtPaymentTest':

        // todo: validate that we dont have too many cosigners
        // check if its already been added
        //payments[msg.payment.key].cosigners.push(message.author)

        // todo: check if the transaction has already been signed and broadcast
        // (can we see it already) if not prompt the user to review and sign.
        // then if there are still more required cosigners, re-publish the
        // transaction to ssb, if not broadcast transaction.

        if (typeof wallets[walletId].payments === 'undefined')
          wallets[walletId].payments = {}
        if (typeof wallets[walletId].payments[msg.content.key] === 'undefined')
          wallets[walletId].payments[msg.content.key] = {}

        if (msg.content.comment) addPaymentComment(msg, author, walletId)
        if (msg.content.rate)
          wallets[walletId].payments[msg.content.key].rate = msg.content.rate

        // if the transaction has not yet been broadcast
        // TODO: should we refresh our transaction history from electrum before doing this?
        if (!wallets[walletId].payments[msg.content.key].broadcast) { 
          wallets[walletId].payments[msg.content.key].broadcast = false

          // TODO: what to do about the date for partially signed transactions? what is locktime?
          if (msg.content.rawTransaction) {
            wallets[walletId].payments[msg.content.key].rawTransaction = msg.content.rawTransaction
            ec.deserialize(msg.content.rawTransaction, function (err,output) {

              // TODO: we already have some test messages with rawTransactions which 
              // cant be deserialized. aargh. 

              console.log(JSON.stringify(output,null,4))
              // we are interested in:
              //   result.inputs[0].signatures (array of signatures where the missing ones are 'null')
              //   result.outputs.forEach( function (output){  } )  value -int,satoshis,  address
            })
          }
        }
        break

      case 'signMmtPaymentTest':
        // much the same as for initiatePayment above

        if (typeof wallets[walletId].payments === 'undefined')
          wallets[walletId].payments = {}
        if (typeof wallets[walletId].payments[msg.content.key] === 'undefined')
          wallets[walletId].payments[msg.content.key] = {}

        if (msg.content.comment) addPaymentComment(msg, author, walletId)
        if (msg.content.rate)
          wallets[walletId].payments[msg.content.key].rate = msg.content.rate

        break

      case 'addMmtPaymentCommentTest':
        if (typeof wallets[walletId].payments === 'undefined')
          wallets[walletId].payments = {}
        addPaymentComment(msg,author,walletId)
        break
      case 'addMmtRecieveCommentTest':
        // TODO: here we do something like:
        var theComment = {
          author: author,
          comment: msg.content.memo
        }
        //wallets[walletId].addresses[msg.content.address].comments.push(theComment)
    }

    electronInterface.displayPayments(wallets[currentWallet],currentWallet,server)
    //writeDbLocally()
  }
}


function addXpub(msg,author,walletId,initiator) {

  var xpubToAdd = {
    owner: author,
    xpub: msg.content.xpub
  }

  if (typeof wallets[walletId].publicKeys === 'undefined')
    wallets[walletId].publicKeys = []

  var alreadyExists = false
  // only add if unique
  wallets[walletId].publicKeys.forEach(function (item) {
    if (item.xpub === xpubToAdd.xpub) alreadyExists = true
  } )

  //if (wallets[walletId].publicKeys.indexOf(xpubToAdd) === -1) {
  if (!alreadyExists) {
    // if this is the initiators public key, make sure it is the first item in the array
    if (initiator) {
      wallets[walletId].publicKeys = [xpubToAdd].concat(wallets[walletId].publicKeys)
    } else {
      wallets[walletId].publicKeys.push(xpubToAdd)
    }
  }
}

function addPaymentComment (msg, author,walletId) {

  // if we dont yet have this entry, define it
  if (typeof wallets[walletId].payments[msg.content.key] === 'undefined')
    wallets[walletId].payments[msg.content.key] = { complete: false }

  if (typeof wallets[walletId].payments[msg.content.key].comments === 'undefined')
    wallets[walletId].payments[msg.content.key].comments = []

  var commentToAdd = {
    author: author,
    comment: msg.content.comment
  }

  var alreadyExists = false

  // todo: improve this by having a general function using object.keys
  //       or using one from a library like deep compare
  // ---only add if unique
  wallets[walletId].payments[msg.content.key].comments.forEach(function (item) {
    if ((item.author === commentToAdd.author) && (item.comment === commentToAdd.comment  ))
      alreadyExists = true
  } )
  //if (wallets[walletId].payments[msg.content.key].comments.indexOf(commentToAdd) === -1)
  if (!alreadyExists)
    wallets[walletId].payments[msg.content.key].comments.push(commentToAdd)
}

function addExampleData(server) {


  var recipients = Object.keys(wallets[currentWallet].cosigners)

  // an example to initiate a wallet.  Note that the recipients for this message
  // should be the recipients for all future messages associated with this wallet

  var initWallet = {
    walletName: 'the groovy gang wallet',
    requiredCosigners: 2,
    xpub: 'xpubblahblah....'
  }

  publishMessage(server, 'initiateMmtMultisigTest', initWallet, recipients)

  // an example of sharing a public key to initiate a wallet

  var pubKey = {
    // walletId is the key of the initiateMmtMultisig message as above

    walletId: '%2idi0F1cCzjhHKSh8gymzvP+LDiXbB/dv2x7mt47n5Q=.sha256',
    xpub: 'xpubblahblah.....'
  }

  publishMessage(server, 'shareMmtPublicKeyTest', pubKey, recipients)

  // an example payment to add to the db
  var payment = {
    walletId: '%2idi0F1cCzjhHKSh8gymzvP+LDiXbB/dv2x7mt47n5Q=.sha256',
    // the 'key' would be a bitcoin transaction id
    key: 'd5f2a6a8cd1e8c35466cfec16551',
    rawTransaction: 'a294b83........',
    // the actual metadata
    // note - no date, amounts or recieve addresses - for this we have a better
    // source of truth

    // this will be calculated at the time of initiating the payment
    rate:           5000,
    comment:       'bought a new pencil sharpener'
  }

  publishMessage(server, 'unsignedMmtPaymentTest', payment, recipients)

  // an example payment comment to add to the db
  var paymentComment = {
    // not sure if wallet id is needed here but will keep it for now
    walletId: '%2idi0F1cCzjhHKSh8gymzvP+LDiXbB/dv2x7mt47n5Q=.sha256',
    key: 'd5f2a6a8cd1e8c35466cfec16551',

    comment: 'this payment was a mistake'
  }


  publishMessage(server, 'addMmtPaymentCommentTest', paymentComment, recipients)

}

function createPayTo(server) {
  var payToData = electronInterface.createTransaction(wallets[currentWallet])
  if (payToData) {
    // TODO: ask for password in a secure way. (password here is hard coded to 'test')
    // TODO fix the hardcoded fee of 0.01

    // TODO: we should already display a fee estimation on the 'send' tab somewhere 
    ec.getFeeRate(function (err,feeRate) {
      console.log('fee rate',feeRate)
      // going to guess the transaction size for now - taking an example which has
      // 982 hex digits, would be 491 bytes, convert to kb, 0.479492187.  assuming the fee rate is satoshis per kb
      feeInSatoshis = feeRate / 0.479492187
      feeInBTC = feeInSatoshis / 100000000

      ec.payTo(payToData.recipient, payToData.amount, feeInBTC, 'test', function(err,output) {
        console.log(JSON.stringify(output,null,4))
        let txid;
        if (output.hex) {
          // deserialize to take a look at it
          ec.deserialize(output.hex, function (err, output) {
            const electrumTx = output.result;
            const inputs = electrumTx.inputs.map(
              function(input) {
                const seq = new btcnodejs.Sequence(input.sequence)
                const witness = new btcnodejs.Witness();
                return new btcnodejs.Input(
                  input.prevout_hash, input.prevout_n, btcnodejs.ScriptSig.empty(), seq, witness
                )
              }
            )
            const outputs = electrumTx.outputs.map(
              function(output) {
                const sigPub = btcnodejs.ScriptPubKey.fromHex(output.scriptPubKey);
                return new btcnodejs.Output(output.value, sigPub);
              }
            )
            const tx = new btcnodejs.Transaction(
              electrumTx.version, inputs, outputs, new btcnodejs.Locktime(electrumTx.lockTime), true
            );
            txid = tx.txid;
          })
          console.log(txid);

          var recipients = Object.keys(wallets[currentWallet].cosigners)

          var payment = {
            //walletId: currentWallet,
            key: txid,
            rawTransaction: output.hex,
            // add rate?
            comment:  payToData.comment
          }
          publishMessage(server, 'initiateMmtPaymentTest', payment, recipients)
          // todo: add this as an imcomplete tx and display it
        }
      } )

    })
  }

}

function recieveMemo(server) {
  var recieveMemoData = electronInterface.createRecieveMemo()
  if (recieveMemoData) {
    recieveMemoData.address = wallets[currentWallet].firstUnusedAddress
    // TODO: amount, and expiry fields
    ec.addRequest(0,recieveMemoData.memo, false, function(err,output) {

      ec.getUnusedAddress(function(err,output) {
        wallets[currentWallet].firstUnusedAddress = output
      })

      var recipients = Object.keys(wallets[currentWallet].cosigners)
      publishMessage(server, 'addMmtRecieveCommentTest', recieveMemoData, recipients )

      // display the request
      ec.listRequests(function(err,output){
        if (err) console.error(err)
        //console.log('requests ', JSON.stringify(output,null,4))
        wallets[currentWallet].requests = output
        electronInterface.displayWalletInfo(wallets[currentWallet])
      })
    })
  }
}

function whoAmICallbackCreator(server) {
  return function whoAmICallback(err, msg) {
    if (err) console.error('Error running whoami.', err)

    var me = msg.id

    if(verbose) console.log('whoami: ',me)

    // for now just use the first wallet (we need to let the user choose)
    // TODO: this wont work if there are no wallets yet
    var currentWallet = Object.keys(wallets)[0]

    if (typeof wallets[currentWallet].cosigners === 'undefined') wallets[currentWallet].cosigners = {}
    // todo:  get the name from ssb about message?
    // using ssb-about and maybe avatar,etc
    wallets[currentWallet].cosigners[me] = {
      name: 'alice'
    }
    if (verbose) console.log('-----cosigners:',JSON.stringify(wallets[currentWallet].cosigners,null,4))

    // In order for messages to be encrypted we need to specify recipients
    // there can be a maximum of 7, which means if we wanted more we need multiple
    // messages (todo: implement this with verify recipients.length < 8)

    // uncomment this line to add example data to scuttlebutt
    // note that if this is run multiple times it will create multiple identical entries
    //addExampleData(server)

    // Specify some event handlers.  This needs to be done here where we can
    // pass server.
    $('#recieveMemo').click(function () { recieveMemo(server) } )
    $('#createTransaction').click(function () { createPayTo(server) } )

    // Have scrapped this for now but it was an attempt to automate loading the wallet
    // will only work with unencrypted wallet
    //ec.setupElectrum(walletFile, function (err,output) {

    // TODO: check electrum version
    ec.checkVersion(requiredElectrumVersion, function(err, output) {
      if (err) {
        console.log("Error connecting to electrum")
        $('#notifications').append('Error connecting to electrum.  Is the electrum daemon running, with a wallet loaded?')
      } else {
        if (output) {
          console.log("electrum version ok")
        } else {
          var errmsg = "electrum version" + requiredElectrumVersion + "required"
          console.log(errmsg)
          $('#notifications').append(errmsg)
        }
      }
    })

    // Get master public key and its hash (so that we can store it safely in ssb messages)
    ec.getMpk(function (err,mpk){
      // identify the wallet using the hash of the mpk
      var hashMpk = bitcoin.crypto.sha256(Buffer.from(mpk))
      console.log('-----mpk', mpk)
    } )

    ec.getBalance(function(err,output) {
      if (!err) wallets[currentWallet].balance = parseFloat(output.confirmed)

      electronInterface.displayWalletInfo(wallets[currentWallet])
    })

    ec.listAddresses(function(err,output){
      if (err) console.error(err)
      //console.log('addresses ', JSON.stringify(output,null,4))
      wallets[currentWallet].addresses = output
      // TODO: this should be:  (so that we can add more info about each address)
      // output.forEach(function(address) { wallets[currentWallet].addresses[address] = {} })
    })

    ec.listRequests(function(err,output){
      if (err) console.error(err)
      //console.log('requests ', JSON.stringify(output,null,4))
      wallets[currentWallet].requests = output
      electronInterface.displayWalletInfo(wallets[currentWallet])
    })

    ec.getUnusedAddress(function(err,output) {
      wallets[currentWallet].firstUnusedAddress = output
      // TODO: qr code
      electronInterface.displayWalletInfo(wallets[currentWallet])
    })
    electronInterface.displayWalletInfo(wallets[currentWallet])

    ec.parseHistory(wallets[currentWallet], function(err,output) {
      if (err) console.error(err)
      wallets[currentWallet] = merge(wallets[currentWallet], output, { arrayMerge: dontMerge })

      electronInterface.displayPayments(wallets[currentWallet],currentWallet,server)
    })

    // todo:  run once with live:false, to find wallets.  then present choice of found
    // wallets or 'create new'
    var count = 0
    messageTypes.forEach(function (messageType) {
      // drain lets us process stuff as it comes
      pull(server.messagesByType({ live: false, type: messageType })
        , pull.drain(function (message) {

          try {
            if (message.value)
              if (message.value.content) {
                // attempt to decrypt message
                try {
                  //console.log(JSON.stringify(message,null,4))
                  // todo: we also need to pass the recipients and validate them
                  server.private.unbox(message.value.content, function(err, msg) {
                    processDecryptedMessage(err, msg, message.value.author, message.key,currentWallet,server)
                  })
                } catch(e) {
                  console.error('error while decrypting',e)
                }

              }
          } catch(e) {
            console.error(e)

          }
        }, function(err) {
          if (err) console.error(err)
          // this will only be reached if live = false.  which gives us a chance to tidy
          // things up but then we dont find new messages
          // count++
          // if (count === messageTypes.length) {
          //   writeDbLocally()
          //   // for now just use the first wallet
          //   var walletId = Object.keys(wallets)[0]
          //   if (walletId) electronInterface.displayPayments(wallets[walletId])
          // }
          //server.close()
        }))
    } )
    // } )
  }
}
