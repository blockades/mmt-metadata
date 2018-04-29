
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
const messageTypes = ['initiateMmtPaymentTest','addMmtPaymentCommentTest']

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

function processMsg(msg,messageType) {

    // todo: we need the author to be passed to this function
    if (verbose) console.log('Found an initiate payment')
    
    $("#putStuffHere").append("<tr><td>" + msg.payment.key + "</td><td>"+msg.payment.description+"</td></tr>")
    
    
    payments = readDbLocally()
    
    // if we've never seen this transaction before, add it
    if (!payments[msg.payment.key]) {
      payments[msg.payment.key] = msg.payment
    } else {
      // what to do here?  this shouldnt happen
    }
    
    writeDbLocally(payments)
}

function processInitiatePayment (msg) {
    // todo: we need the author to be passed to this function
    if (verbose) console.log('Found an initiate payment')
    
    $("#putStuffHere").append("<tr><td>" + msg.payment.key + "</td><td>"+msg.payment.description+"</td></tr>")
    
    
    payments = readDbLocally()
    
    // if we've never seen this transaction before, add it
    if (!payments[msg.payment.key]) {
      payments[msg.payment.key] = msg.payment
    } else {
      // what to do here?  this shouldnt happen
    }
    
    writeDbLocally(payments)
}

function processAddPaymentComment {
    
    // todo get the order from higher up and pass it to this function
    if (verbose) {
      console.log('Found a payment comment')
    }

    payments = readDbLocally()
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

// function initiatePayment(sbot, paymentToAdd, recipients) {
//   // this message will be published when somebody initiates a payment for others to sign
//   sbot.private.publish({ type: 'initiateMmtPaymentTest', payment: paymentToAdd }, recipients, function (err, msg) {
//     if (verbose) {
//       console.log('Added payment:')
//       console.log(JSON.stringify(msg, null, 4)) 
//     }
//   })
//
// }
//
//
// function addPaymentComment(sbot, paymentComment, recipients) {
//
//   sbot.private.publish({ type: 'modifyMmtPaymentTest', paymentComment: paymentComment }, recipients, function (err, msg) {
//     if (verbose) {
//       console.log('Added payment Comment:')
//       console.log(JSON.stringify(msg, null, 4)) 
//     }
//   })
//
// }

function displayPayments() {
  // this would be the place to create a snazzy html table
  
  console.log('payments now looks like this:')
  console.log(JSON.stringify(payments, null, 4))
  
}

function exampleDecryptMessage() {

  // this is an example of decrypting a message that i know worked for me
  // (it wont work for you as its for me but shows the idea)
  sbot.get('%69q4XMVlrwG3GAeykTQLiU/oZlRvF7bRZFAR1CmECIA=.sha256', function(err,msg) {
    if (err) console.error(err)
    sbot.private.unbox(msg.content, function (err,msg) { 
      if (err) console.error(err)
      console.log(msg)
    })
  })

}

function readDbLocally() {
  // for now just use a file as db is not likely to get big
  if (fs.existsSync(localDbFile)) {
    payments = JSON.parse(fs.readFileSync(localDbFile))
  } else {
    payments = {}
  }
  return payments
}



function writeDbLocally(payments) {
  if (verbose) console.log('writing locally')
  fs.writeFileSync(localDbFile,JSON.stringify(payments))
  
}


function ProcessDecryptedMessage(payments, messageType) 
  return function (err, msg) {
  if (msg) {    
    //console.log('decrypted a message')
    //console.log(msg)
    processMsg(msg,messageType)
  }
}
decryptMessage(payments) {
  return function (message){
      try {
        if (message.value.content) { 
          // attempt to decrypt message
          try {
            // todo: how to pass the message author to this callback function?
            sbot.private.unbox(message.value.content, ProcessDecryptedMessage(payments, messageType)) 
          } catch(e) {
            console.error('error while decrypting')
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

    }
}

function drainMessages(payments) {
  return function (messageType) {
    // drain lets us process stuff as it comes
    pull(sbot.messagesByType({ live: true, type: messageType }), pull.drain(decryptMessage(payments)))
  } 
}


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

  // publishMessage(sbot, 'initiateMmtPaymentTest', payment, recipients) 
  
  // an example payment comment to add to the db
  var paymentComment = {

    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    comment: 'this payment was a mistake'
  }
  

  // publishMessage(sbot, 'addMmtPaymentCommentTest', paymentComment, recipients) 
    
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
  

  payments = readDbLocally()
  $("#putStuffHere").append("<table>")
  messageTypes.foreach(drainMessages(payments)) 

  

})
