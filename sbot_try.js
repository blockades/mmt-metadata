// require('sbot')
var pull = require('pull-stream')
var ssbClient = require('ssb-client')

ssbClient(function (err, sbot) {
  console.log('Ready')

  var payment = {weekEnding:'somedate',rate:5000,cosigner1:'ssbpublickey1',cosigner2:'ssbpublickey2',notes:'this is just an example',fee:0.001}



  //pull(sbot.createLogStream({ live: true }), pull.drain(processMsg))
  pull(sbot.messagesByType({ type: 'addMmtPaymentTest', live: true }), pull.drain(processMsg))

  
})

function testPublish() {
  //publish a message
  sbot.publish({ type: 'testtype', text: 'hello, scuttleverse' }, function (err, msg) {
    console.log(msg.key) 
    console.log(msg.value.author)
    console.log(msg.value.content)

    // msg.key           == hash(msg.value)
    // msg.value.author  == your id
    // msg.value.content == { type: 'post', text: 'My First Post!' }
    // ...
  })
}
 

function processMsg (msg) {
    try {
      if (msg) 
        console.log(msg.value.content)
    } catch(e) {
        console.error('no more messages')
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



function addPayment(paymentToAdd) {
  
  sbot.publish({ type: 'addMmtPaymentTest', payment: paymentToAdd }, function (err, msg) {
    console.log('Adding payment:')
    console.log(msg.key) 
    console.log(msg.value.author)
    console.log(msg.value.content)

  })

}
