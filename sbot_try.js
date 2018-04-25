

var pull = require('pull-stream')
var ssbClient = require('ssb-client')

// will hold current payments
var payments = {}

ssbClient(function (err, sbot) {
  console.log('Ready')


  var payment = {
    
    // the 'key' would be a bitcoin transaction id
    key: 'd5f2a6a8cd1e8c35466cfec16551', 
    // this would be msg.key of the last 'version' of this entry that we know of
    // in this case its the first that we know of
    lastKnownModification: 'root', 

    // the actual metadata
    // note - no date, amounts or recieve addresses - for this we have a better 
    // source of truth
    rate:           5000,
    cosigners:      ['ssbpublickey1', 'ssbpublickey2']
    description:    'this is just an example',
  }

  //addPayment(sbot, payment)

  var paymentModification {

    key: 'd5f2a6a8cd1e8c35466cfec16551', 
    lastKnownModification = 'ssbkey',

    description = 'actually i wanted to write this'
  }

  //addPayment(sbot, paymentModification)
  
  pull(sbot.createLogStream({ live: true }), pull.drain(processMsg))
  //pull(sbot.messagesByType({ type: 'addMmtPaymentTest', live: true }), pull.drain(processMsg))
  
  sbot.close()  
})

function testPublish() {
  //publish a test message
  sbot.publish({ type: 'testtype', text: 'hello, scuttleverse' }, function (err, msg) {
    console.log(msg.key) 
    console.log(msg.value.author)
    console.log(msg.value.content)

  })
}
 
function processMsg (msg) {
   // process a message from the drain 
   // is this the right way to handle no more messages?
  try {
    if (msg) 
      switch(msg.value.content.type) {
        
        case 'addMmtPaymentTest':
          console.log('Adding:')
          console.log(msg.value.content)

          // if we've never seen this transaction before, add it
          if (!payments[msg.value.content.payment.key]) {
            payments[msg.value.content.payment.key] = msg.value.content.payment
          } else {
            // what to do here?
            // suppose two people add different descriptions of a payment... 
          }
          break
        // case 'modifyMmtPaymentTest':
        //    console.log('Modifying:')
           
      }

  } catch(e) {
    console.error('no more messages')
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




function addPayment(sbot, paymentToAdd) {
  
  sbot.publish({ type: 'addMmtPaymentTest', payment: paymentToAdd }, function (err, msg) {
    console.log('Adding payment:')
    console.log(msg.key) 
    console.log(msg.value.author)
    console.log(msg.value.content)

  })

}


// function modifyPayment(sbot, modifiedPayment) {
//   
//   sbot.publish({ type: 'modifyMmtPaymentTest', modifiedPayment: modifiedPayment }, function (err, msg) {
//     console.log('Adding modified payment:')
//     console.log(msg.key) 
//     console.log(msg.value.author)
//     console.log(msg.value.content)
//
//   })
//
// }
