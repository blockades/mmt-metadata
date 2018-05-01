
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

var localDbFile = './localdb.json'

// will also include 'initiateMmtMultisigTest','shareMmtPublicKeyTest'
const messageTypes = ['unsignedMmtPaymentTest','addMmtPaymentCommentTest']

var verbose = true

var cosigners = {

    // this is my own public key (which one could get using sbot.whoami)
    // or create new ones with ssb-keys
    // you wont be able to decrypt messages made using this script without your
    // own public key

    '@vEJe4hdnbHJl549200IytOeA3THbnP0oM+JQtS1u+8o=.ed25519': {
      name: 'alice'
    }
}


var payments = {}




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
  
  // theres gotta be a better way to do this
  // this is really ugly and doesnt work properly
  $("#putStuffHere").html('<table class = "table">\n<tr>\n<th> Date </th>\n<th> Description and comments </th>\n<th> Rate </th>\n<th> Amount </th>\n<th> Recipient(s) </th>\n</tr>\n')
  
  Object.keys(payments).forEach(function( index) {

    $("#putStuffHere").append("<tr>")
    $("#putStuffHere").append("<td>somedate</td>")
    
    $("#putStuffHere").append("<td>")
    payments[index].comments.forEach(function(comment){

      $("#putStuffHere").append(comment.comment)
    })

    $("#putStuffHere").append("</td>")
    $("#putStuffHere").append("<td>" + payments[index].rate + "</td>")
    $("#putStuffHere").append("<td>someamount</td>")
    $("#putStuffHere").append("<td>somerecipients</td>")
    $("#putStuffHere").append("</tr>")
  } )

  $("#putStuffHere").append("</table>")

  if (verbose) {
    console.log('payments now looks like this:')
    console.log(JSON.stringify(payments, null, 4))
  } 
}

function readDbLocally() {
  
  // for now just use a file as db is not likely to get big

  var paymentsFromFile = {}

  // actually this should be async
  if (fs.existsSync(localDbFile)) {

    paymentsFromFile = JSON.parse(fs.readFileSync(localDbFile))

    // todo: this wont work, it will clobber arrays of cosigners and comments.
    // this information will need to be parsed the same as the stuff coming from ssb
    Object.keys(paymentsFromFile).forEach(function(key) {
      payments[key] = paymentsFromFile[key]
    } )

    //Object.keys(payments).forEach(key => result[key] = payments[key]);

  } 
  return result
}

function writeDbLocally() {
  if (verbose) console.log('writing locally')
  fs.writeFileSync(localDbFile,JSON.stringify(payments))
  
}

function processDecryptedMessage(err, msg,author) {

    if (msg) {    
    
      if (verbose) console.log('Found a ', msg.type)
      
      console.log(JSON.stringify(msg,null,4))
      switch (msg.type) {
        case 'unsignedMmtPaymentTest':
          // todo: validate that we dont have too many cosigners
          // check if its already been added
          //payments[msg.payment.key].cosigners.push(message.author)
      
          // todo: check if the transaction has already been signed and broadcast 
          // (can we see it already) if not prompt the user to review and sign. 
          // then if there are still more required cosigners, re-publish the 
          // transaction to ssb, if not broadcast transaction.
          
          if (typeof payments[msg.content.key] === 'undefined') payments[msg.content.key] = {}

          if (msg.content.comment) addPaymentComment(msg,author) 
          if (msg.content.rate) payments[msg.content.key].rate = msg.content.rate
          
          break
        
        case 'addMmtPaymentCommentTest':
          addPaymentComment(msg,author)
        
      } 
      displayPayments()    
    }
}

function addPaymentComment(msg, author) {
    
    // if we dont yet have this entry, define it
    if (typeof payments[msg.content.key] === 'undefined') payments[msg.content.key] = {}
    if (typeof payments[msg.content.key].comments === 'undefined')  payments[msg.content.key].comments = []
    
    // todo: check the comment doesnt already exist
    payments[msg.content.key].comments.push( {
      author: author,
      comment: msg.content.comment
    } )
}  

function addExampleData(sbot, recipients) {

  // an example to initiate a wallet.  Note that the recipients for this message 
  // should be the recipients for all future messages associated with this wallet

  var initWallet {
    walletName: 'the groovy gang wallet',
    requiredCosigners: 2,
    numberofCosigners: 6,
    xpub: 'xpubblahblah....'
  }

  publishMessage(sbot, 'initiateMmtMultisigTest', initWallet, recipients)

  // an example of sharing a public key to initiate a wallet   
  
  var pubKey {
    keyOfInitMessageMmtTest: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
    xpub: 'xpubblahblah.....'
  }

  publishMessage(sbot, 'shareMmtPublicKeyTest', pubKey, recipients)

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

  publishMessage(sbot, 'unsignedMmtPaymentTest', payment, recipients) 
  
  // an example payment comment to add to the db
  var paymentComment = {

    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    comment: 'this payment was a mistake'
  }
  

  publishMessage(sbot, 'addMmtPaymentCommentTest', paymentComment, recipients) 

}

ssbClient(function (err, sbot) {
  if (verbose) console.log('ssb ready.')

  // In order for messages to be encrypted we need to specify recipients
  // there can be a maximum of 7, which means if we wanted more we need multiple 
  // messages
  
  var recipients = Object.keys(cosigners)
 
  // todo: sort out this callback function
  //sbot.whoami( function(err,msg) {
    //console.log('whoami',msg)
  //  recipients = [ msg.id ]
  //})


  // uncomment this line to add example data to scuttlebutt 
  // note that if this is run multiple times it will create multiply identical entries
  //addExampleData(sbot, recipients)
  
  //payments = readDbLocally()

  messageTypes.forEach(function (messageType) {
    // drain lets us process stuff as it comes
    pull(sbot.messagesByType({ live: true, type: messageType }), pull.drain(function (message) {
      try {
        if (message.value.content) { 
          // attempt to decrypt message
          try {
            sbot.private.unbox(message.value.content, function(err,msg) {
              processDecryptedMessage(err,msg,message.value.author)
            }) 
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
