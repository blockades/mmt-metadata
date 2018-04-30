
// todo:
//   make less ugly
//   speed up somehow -scanning messages takes ages making debugging slow
//   electron front end
//   interact with wallet either electrum locally or bitcoin on a server
//   re-write rates tool into node
//   make more modular -split into many tiny node modules

var pull = require('pull-stream')
var ssbClient = require('ssb-client')
var fs = require('fs')

var localDbFile = './localdb.json'

// will also include 'initiateMmtMultisigTest','shareMmtPublicKeyTest'
const messageTypes = ['unsignedMmtPaymentTest','addMmtPaymentCommentTest']

var verbose = true

var cosigners = [
  {
    name: 'alice', // i think theres away to grab this from ssb's 'about'
                  // message.  probably avatar image as well
    // this is my own public key (which one could get using sbot.whoami)
    // or create new ones with ssb-keys
    // you wont be able to decrypt messages made using this script without your
    // own public key
    ssbPubKey: '@vEJe4hdnbHJl549200IytOeA3THbnP0oM+JQtS1u+8o=.ed25519',

  }
  // other cosigners will be added here
]


var payments = {}

function processMsg(msg) {
    // todo: we need the author to be passed to this function
//console.log(JSON.stringify(msg,null,4)
    if (verbose) console.log('Found a ', msg.type)
    
    //payments = readDbLocally()
    switch (msg.type) {
      case 'unsignedMmtPaymentTest':
        // todo: validate that we dont have too many cosigners
        // check if its already been added
        //payments[msg.payment.key].cosigners.push(message.author)
    
        // todo: check if the transaction has already been signed and broadcast 
        // (can we see it already) if not prompt the user to review and sign. 
        // then if there are still more required cosigners, re-publish the 
        // transaction to ssb, if not broadcast transaction.

        if (msg.payment.comment) addPaymentComment(msg) 
        if (msg.payment.rate) payments[msg.payment.key].rate = msg.payment.rate
        
        break
      case 'addMmtPaymentCommentTest':
        addPaymentComment(msg)
      
    } 
    displayPayments()    
}


function addPaymentComment(msg) {
    
    // todo get the order from higher up and pass it to this function

    // todo: check the comment doesnt already exist
    payments[msg.paymentComment.key].comments.push( {
      //author: msg.value.author,
      comment: msg.paymentComment.comment
    } )
}  


function publishMessage(sbot, messageType, content, recipients) {
  sbot.private.publish({ type: messageType, content: content }, recipients, function (err, msg) {
    if (verbose) {
      console.log('Added ', messageType)
      console.log(JSON.stringify(msg, null, 4)) 
    }
  })
}


function displayPayments() {
  // this would be the place to create a snazzy html table
  
  console.log('payments now looks like this:')
  console.log(JSON.stringify(payments, null, 4))
  
}

function readDbLocally() {
  
  // for now just use a file as db is not likely to get big

  var paymentsFromFile = {}

  // actually this should be async
  if (fs.existsSync(localDbFile)) {

    paymentsFromFile = JSON.parse(fs.readFileSync(localDbFile))

    // todo: this wont work, it will clobber arrays of cosigners and comments.
    // this information will need to be parsed the same as the stuff coming from ssb
    Object.keys(paymentsFromFile).forEach(key => result[key] = paymentsFromFile[key]);
    Object.keys(payments).forEach(key => result[key] = payments[key]);

  } 
  return result
}

function writeDbLocally() {
  if (verbose) console.log('writing locally')
  fs.writeFileSync(localDbFile,JSON.stringify(payments))
  
}

// a wrapper to pass on messageType (add author)
function processDecryptedMessage(err, msg) {

    if (msg) {    
      console.log('decrypted a message')
      console.log(msg)
      processMsg(msg)
    }
}


// function decryptMessage (message) {
//
//
// return 
// }



ssbClient(function (err, sbot) {
  if (verbose) console.log('ssb ready.')

  // In order for messages to be encrypted we need to specify recipients
  // there can be a maximum of 7, which means if we wanted more we need multiple 
  // messages
  
  // in most cases we want all cosigners as recipients, but for partially signed 
  // transactions we would want only those who are designated to sign
  var recipients = [cosigners[0].ssbPubKey]
  
  //sbot.whoami( function(err,msg) {
    //console.log('whoami',msg)
  //  recipients = [ msg.id ]
  //})

  // an example payment to add to the db
  var payment = {
    
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

  //publishMessage(sbot, 'initiateMmtPaymentTest', payment, recipients) 
  
  // an example payment comment to add to the db
  var paymentComment = {

    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    comment: 'this payment was a mistake'
  }
  

  //publishMessage(sbot, 'addMmtPaymentCommentTest', paymentComment, recipients) 
    
  //pull(sbot.createLogStream({ live: true }), pull.drain(processMsg))
  
  // collect waits till we have everything then give us an array
  // pull(
  //   sbot.createLogStream(),
  //   pull.collect(function (err, msgs) {
  //     msgs.forEach( function (item,index) {
  //       decryptAndProcess(sbot,item)
  //     } )
  //   })
  // )
  

  //payments = readDbLocally()
  //$("#putStuffHere").append("<table>")

  messageTypes.forEach(function (messageType) {
    // drain lets us process stuff as it comes
    console.log(messageType)
    pull(sbot.messagesByType({ live: true, type: messageType }), pull.drain(function (message) {
  console.log(JSON.stringify(message,null,4))
      try {
        if (message.value.content) { 
          // attempt to decrypt message
          try {
            console.log(message.value.content)
            // todo: how to pass the message author to this callback function?
            sbot.private.unbox(message.value.content, processDecryptedMessage) 
          } catch(e) {
            console.error('error while decrypting',e)
          }

        }
      } catch(e) {
        //displayPayments()
        //writeDbLocally()    

         // $("#putStuffHere").append("<p class='payment'> finished</p>")
        //sbot.close()
        // why?
        return false
      }
}))
  } )
  

})
