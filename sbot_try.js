

var pull = require('pull-stream')
var ssbClient = require('ssb-client')

ssbClient(function (err, sbot) {
  console.log('Ready')

  var payment = {weekEnding:'somedate',rate:5000,cosigner1:'ssbpublickey1',cosigner2:'ssbpublickey2',notes:'this is just an example',fee:0.001}

  //addPayment(sbot, payment)

  //pull(sbot.createLogStream({ live: true }), pull.drain(processMsg))
  pull(sbot.messagesByType({ type: 'addMmtPaymentTest', live: true }), pull.drain(processMsg))
  
  sbot.close()  
})

function testPublish() {
  //publish a message
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
      console.log(msg.value.content)
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
        //msgs[0].key == hash(msgs[0].value)
        // msgs[0].value...
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


function modifyPayment(sbot, originalPaymentKey, modifiedPayment) {
  
  sbot.publish({ type: 'modifyMmtPaymentTest', originalPaymentKey, modifiedPayment: modifiedPayment }, function (err, msg) {
    console.log('Adding modified payment:')
    console.log(msg.key) 
    console.log(msg.value.author)
    console.log(msg.value.content)

  })

}
