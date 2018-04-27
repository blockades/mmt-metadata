
// todo:
//   make less ugly
//   speed up somehow -scanning messages takes ages making debugging slow
//   electron front end
//   interact with wallet either electrum locally or bitcoin on a server
//   re-write rates tool into node
//   make more modular -split into many tiny node modules

var pull = require('pull-stream')
var ssbClient = require('ssb-client')
var fs = require('fs');

var localDbFile = './localdb.json'
// will hold current payments
// yes i know global variables bad im gonna tidy it up
var payments = {}

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
    // this will be an array of bitcoin addresses, which we will pop off and not reuse.
    addresses: ['bc1sdfljsdl','bc1ldskfjsdfl']

  }
  // other cosigners will be added here
]




function testPublish() {
  //publish a test message
  sbot.publish({ type: 'testtype', text: 'hello, scuttleverse' }, function (err, msg) {
    if (verbose) { 
      console.log(msg.key) 
      console.log(msg.value.author)
      console.log(msg.value.content)
    }
  })
}



function processMsg (msg) {
  // process an unencrypted message  
  switch(msg.type) {
  
    case 'addMmtPaymentTest':
      if (verbose) { 
        console.log('Found a payment:')
        //console.log(msg)
      }

      // if we've never seen this transaction before, add it
      if (!payments[msg.payment.key]) {
        payments[msg.payment.key] = msg.payment
      } else {
        // what to do here?
      }
      break
    
    case 'modifyMmtPaymentTest':
      if (verbose) {
        console.log('Found a payment comment:')
      }
      payments[msg.paymentComment.key].comments.push( {
        // todo get the order from higher up and pass it to this function
        //author: msg.value.author,
        comment: msg.paymentComment.comment
      } )
  }  
}

function pullWithFeedStream() {
  // not using this right now
  pull(
      sbot.createFeedStream(),
      pull.collect(function (err, msgs) {
        console.log(msgs[1].key)
        console.log(msgs[1].value)

      })
    )
}




function addPayment(sbot, paymentToAdd, recipients) {
  
  sbot.private.publish({ type: 'addMmtPaymentTest', payment: paymentToAdd }, recipients, function (err, msg) {
    if (verbose) {
      console.log('Added payment:')
      console.log(JSON.stringify(msg, null, 4)) 
    }
  })

}


function addPaymentComment(sbot, paymentComment, recipients) {

  sbot.private.publish({ type: 'modifyMmtPaymentTest', paymentComment: paymentComment }, recipients, function (err, msg) {
    if (verbose) {
      console.log('Added payment Comment:')
      console.log(JSON.stringify(msg, null, 4)) 
    }
  })

}

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
  fs.readFile(localDbFile,function(err,content){
    if(err) {  return {}
    } else { 
      if (verbose) console.log('read locally: ',JSON.stringify(JSON.parse(content),null,4))
      return JSON.parse(content) }
  
  })
}

function writeDbLocally() {
  if (verbose) console.log('writing locally')
  fs.writeFile(localDbFile,JSON.stringify(payments),function(err){
    if(err) throw err
  })
}

payments = readDbLocally()
// if the file didnt exist yet (sort this out)
if (typeof(payments) === 'undefined') payments = {}

ssbClient(function (err, sbot) {
  if (verbose) console.log('ssb ready.')

  // In order for messages to be encrypted we need to specify recipients
  // there can be a maximum of 7, which means if we wanted more we need multiple 
  // messages
  
  // in most cases we want all cosigners as recipients, but for partially signed 
  // transactions we would want only those who are designated to sign
  var recipients = [cosigners[0].ssbPubkey]
  sbot.whoami( function(err,msg) {
    //console.log('whoami',msg)
    var recipients = msg.id
  })
  //var recipients = sbot.whoami

  // an example payment to add to the db
  var payment = {
    
    // the 'key' would be a bitcoin transaction id
    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    // the actual metadata
    // note - no date, amounts or recieve addresses - for this we have a better 
    // source of truth
    rate:           5000,
    cosigners:      ['ssbpublickey1', 'ssbpublickey2'],
    description:    'this is just an example',
    comments:       []
  }

  // addPayment(sbot, payment, recipients)

  // an example payment comment to add to the db
  var paymentComment = {

    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    comment: 'this payment was a mistake'
  }
  

  // addPaymentComment(sbot, paymentComment, recipients)
    
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
  
  // drain lets us process stuff as it comes
  pull(sbot.createLogStream({ live: true }), pull.drain(function (message){
    try {
      if (message.value.content) { 
        // attempt to decrypt message
        try {
          sbot.private.unbox(message.value.content, function (err, msg) {
            if (msg) {    
              //console.log('decrypted a message')
              //console.log(msg)
              processMsg(msg)
            }
            //console.log('eer: ', err)
          })
        } catch(e) {
          console.log('error while decrypting')
        }

      }
    } catch(e) {
      displayPayments()
      writeDbLocally()    

      sbot.close()
      // why?
      return false
    }

  }))
  

})
