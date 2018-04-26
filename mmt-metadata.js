
// todo:
//   electron front end
//   encrypt messages
//   interact with wallet
//   re-write rates tool into node

var pull = require('pull-stream')
var ssbClient = require('ssb-client')

var count = 0

// will hold current payments
var payments = {}

var verbose = true

ssbClient(function (err, sbot) {
  if (verbose) console.log('ssb ready.')

  // In order for messages to be encrypted we need to specify recipients
  // there can be a maximum of 7, which means if we wanted more we need multiple 
  // messages
  //
  // in order to use this script you need to set this to your own public key
  // or make new one for test perposes
  var recipients = ['@vEJe4hdnbHJl549200IytOeA3THbnP0oM+JQtS1u+8o=.ed25519']

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

  var paymentComment = {

    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    comment: 'this payment was a mistake'
  }

  // addPaymentComment(sbot, paymentComment, recipients)
  
  //pull(sbot.createLogStream({ live: true }), pull.drain(processMsg))

  pull(
    sbot.createLogStream(),
    pull.collect(function (err, msgs) {
      msgs.forEach( function (item,index) {
        decryptAndProcess(sbot,item)
      } )
    })
  )
  //pull(sbot.messagesByType({ type: 'addMmtPaymentTest', live: true }), pull.drain(processMsg))
  

  sbot.close()  
})

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


function decryptAndProcess (sbot,msg){
      sbot.private.unbox(msg, function (err, msg) { 
        if (msg) {       
          switch(msg.value.content.type) {
          
            case 'addMmtPaymentTest':
              if (verbose) { 
                console.log('Found a payment:')
                console.log(msg.value.content)
              }

              // if we've never seen this transaction before, add it
              if (!payments[msg.value.content.payment.key]) {
                payments[msg.value.content.payment.key] = msg.value.content.payment
              } else {
                // what to do here?
              }
              break
            
            case 'modifyMmtPaymentTest':
              if (verbose) {
                console.log('Found a payment comment:')
                console.log(msg.value.content)
              }
              payments[msg.value.content.paymentComment.key].comments.push( {
                author: msg.value.author,
                comment: msg.value.content.paymentComment.comment
              } )
          }  
        } 
      })
}

function processMsg (message) {
   // process a message from the drain 
   // is this the right way to handle the end of the message stream?
  try {
    count++
    console.log(count)
    if (message)
      console.log(message)
      // attempt to decrypt message 
      sbot.private.unbox(message, function (err, msg) { 
        if (msg) {       
          switch(msg.value.content.type) {
          
            case 'addMmtPaymentTest':
              if (verbose) { 
                console.log('Found a payment:')
                console.log(msg.value.content)
              }

              // if we've never seen this transaction before, add it
              if (!payments[msg.value.content.payment.key]) {
                payments[msg.value.content.payment.key] = msg.value.content.payment
              } else {
                // what to do here?
              }
              break
            
            case 'modifyMmtPaymentTest':
              if (verbose) {
                console.log('Found a payment comment:')
                console.log(msg.value.content)
              }
              payments[msg.value.content.paymentComment.key].comments.push( {
                author: msg.value.author,
                comment: msg.value.content.paymentComment.comment
              } )
          }  
        } 
      })
  } catch(e) {
    // when we've processed all messagese
    displayPayments()
    return false
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
      console.log('Adding payment:')
      console.log(JSON.stringify(msg, null, 4)) 
    }
  })

}


function addPaymentComment(sbot, paymentComment, recipients) {

  sbot.private.publish({ type: 'modifyMmtPaymentTest', paymentComment: paymentComment }, recipients, function (err, msg) {
    if (verbose) {
      console.log('Adding payment Comment:')
      console.log(JSON.stringify(msg, null, 4)) 
    }
  })

}

function displayPayments() {

  console.log('payments now looks like this:')
  console.log(JSON.stringify(payments, null, 4))

}
