
// todo:
//   make less ugly
//   error handling
//   validation
//   electron front end
//   interact with wallet either electrum locally or bitcoin on a server
//   re-write rates tool into node
//   make more modular -split into many tiny node modules

var pull = require('pull-stream')
var ssbClient = require('ssb-client')
var fs = require('fs')
var bitcoin = require('bitcoinjs-lib')
var merge = require('deepmerge')
const dontMerge = (destination, source) => source

var ec = require("./electrum-client")
var electronInterface = require("./electron-interface")

const localDbFile = './localdb.json'
var wallets = require(localDbFile)

const messageTypes = [
  'initiateMmtMultisigTest',
  'shareMmtPublicKeyTest', 
  'unsignedMmtPaymentTest',
  'addMmtPaymentCommentTest'
]

var verbose = true

// this is temporary
var walletFile = '~/.electrum/testnet/wallets/default_wallet'


function publishMessage (sbot, messageType, content, recipients) {
  
  // publish an encrypted message
 
  // recipients are embedded in 'content'
  sbot.private.publish({ type: messageType, content: content, recipients: recipients }
    , recipients, function (err, msg) {
    if (verbose) {
      console.log('Published: ', messageType)
      console.log(JSON.stringify(msg, null, 4)) 
    }
  })

  // todo: should we also update db in memory and write to file when doing this?
}

function writeDbLocally() {
  if (verbose) console.log('writing to local file')
  
  // should use deepmerge
  fs.writeFileSync(localDbFile,JSON.stringify(wallets,null,4))
  
}

function processDecryptedMessage(err, msg,author, ssbKey,currentWallet) {

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
        case 'unsignedMmtPaymentTest':
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
          
          break
        
        case 'addMmtPaymentCommentTest':
          if (typeof wallets[walletId].payments === 'undefined') 
            wallets[walletId].payments = {}
          addPaymentComment(msg,author,walletId)
          break

        case 'initiateMmtMultisigTest':

          if (typeof wallets[ssbKey] === 'undefined') {
            // TODO:
            // this wallet we dont yet know of, but we are invited to join
            // since we are a recipient.  so this is the place do choose to
            // accept the inivitation, generate a public key and publish it
            wallets[ssbKey] = {}
          }
          wallets[ssbKey].name = msg.content.walletName
          
          wallets[ssbKey].cosigners = msg.recipients
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
      } 
      
      electronInterface.displayPayments(wallets[currentWallet])    
      writeDbLocally() 
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
      wallets[walletId].payments[msg.content.key] = {}
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

function addExampleData(sbot,me) {

  // todo: could we get the name from ssb about message?
  // using ssb-about? and maybe avatar,etc
  var cosigners = {}
  cosigners[me] = {
    name: 'alice'
  }

  // In order for messages to be encrypted we need to specify recipients
  // there can be a maximum of 7, which means if we wanted more we need multiple 
  // messages (todo: implement this of verify recipients.length < 8)
  var recipients = Object.keys(cosigners)
  
  // an example to initiate a wallet.  Note that the recipients for this message 
  // should be the recipients for all future messages associated with this wallet

  var initWallet = {
    walletName: 'the groovy gang wallet',
    requiredCosigners: 2,
    xpub: 'xpubblahblah....'
  }

  //publishMessage(sbot, 'initiateMmtMultisigTest', initWallet, recipients)

  // an example of sharing a public key to initiate a wallet   
  
  var pubKey = {
    // walletId is the key of the initiateMmtMultisig message as above

    walletId: '%2idi0F1cCzjhHKSh8gymzvP+LDiXbB/dv2x7mt47n5Q=.sha256',
    xpub: 'xpubblahblah.....'
  }

  //publishMessage(sbot, 'shareMmtPublicKeyTest', pubKey, recipients)

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

  publishMessage(sbot, 'unsignedMmtPaymentTest', payment, recipients) 
  
  // an example payment comment to add to the db
  var paymentComment = {
    // not sure if wallet id is needed here but will keep it for now
    walletId: '%2idi0F1cCzjhHKSh8gymzvP+LDiXbB/dv2x7mt47n5Q=.sha256',
    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    comment: 'this payment was a mistake'
  }
  

  publishMessage(sbot, 'addMmtPaymentCommentTest', paymentComment, recipients) 

}



ssbClient(function (err, sbot) {
  if (verbose) console.log('ssb ready.')

  
  // this assumes we already have an ssb identity. 
  // if not we need to create one wiht ssb-keys (todo)
  if (sbot) 
    sbot.whoami( function(err,msg) {
      if (err) console.error('Error running whoami.', err)

      var me = msg.id  
    
      if (verbose) console.log('whoami: ',me)


      // uncomment this line to add example data to scuttlebutt 
      // note that if this is run multiple times it will create multiply identical entries
      //addExampleData(sbot, me)
      
      //wallets = readDbLocally()

      // for now just use the first wallet (we need to let the user choose)
      currentWallet = Object.keys(wallets)[0]

      //ec.setupElectrum(walletFile, function (err,output) {
        ec.getBalance(function(err,output) {
          if (err) console.log(err)
          else wallets[currentWallet].balance = output.confirmed
          electronInterface.displayWalletInfo(wallets[currentWallet])
        })
        ec.listAddresses(function(err,output){
          if (err) console.error(err)
          //console.log('addresses ', JSON.stringify(output,null,4))
          wallets[currentWallet].addresses = output
        })
        ec.getUnusedAddress(function(err,output) {
          wallets[currentWallet].firstUnusedAddress = output
          // TODO: qr code
        })        
      electronInterface.displayWalletInfo(wallets[currentWallet])

        ec.parseHistory(wallets[currentWallet], function(err,output) {
          if (err) console.error(err)
          wallets[currentWallet] = merge(wallets[currentWallet], output, { arrayMerge: dontMerge })
        })
         
        // todo:  run once with live:false, to find wallets.  then present choice of found 
        // wallets or 'create new'
        var count = 0
        messageTypes.forEach(function (messageType) {
          // drain lets us process stuff as it comes
          pull(sbot.messagesByType({ live: false, type: messageType })
            , pull.drain(function (message) {
            
            try {
                if (message.value)
                  if (message.value.content) { 
                    // attempt to decrypt message
                    try {
                      //console.log(JSON.stringify(message,null,4))
                      // todo: we also need to pass the recipients and validate them
                      sbot.private.unbox(message.value.content, function(err, msg) {
                        processDecryptedMessage(err, msg, message.value.author, message.key,currentWallet)
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
            //sbot.close()
          }))
       } )
     // } )
    } )
  else 
    console.error('Unable to connect to sbot.  Is sbot running?')
})
