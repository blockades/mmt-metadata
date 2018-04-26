

var pull = require('pull-stream')
var ssbClient = require('ssb-client')

// will hold current payments
var payments = {}

ssbClient(function (err, sbot) {
  console.log('ssb ready.')


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

  //addPayment(sbot, payment)

  var paymentComment = {

    key: 'd5f2a6a8cd1e8c35466cfec16551', 

    comment: 'this payment was a mistake'
  }

  //addPaymentComment(sbot, paymentComment)
  
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
   // is this the right way to handle the end of the message stream?
  try {
    if (msg) 
      switch(msg.value.content.type) {
        
        case 'addMmtPaymentTest':
          console.log('Found a payment:')
          console.log(msg.value.content)

          // if we've never seen this transaction before, add it
          if (!payments[msg.value.content.payment.key]) {
            payments[msg.value.content.payment.key] = msg.value.content.payment
          } else {
            // what to do here?
          }
          break
        case 'modifyMmtPaymentTest':
          console.log('Found a payment comment:')
          console.log(msg.value.content)
          payments[msg.value.content.paymentComment.key].comments.push( {
            author: msg.value.author,
            comment: msg.value.content.paymentComment.comment
          } )
           
      }

  } catch(e) {
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




function addPayment(sbot, paymentToAdd) {
  
  sbot.publish({ type: 'addMmtPaymentTest', payment: paymentToAdd }, function (err, msg) {
    console.log('Adding payment:')
    console.log(msg.key) 
    console.log(msg.value.author)
    console.log(msg.value.content)

  })

}


function addPaymentComment(sbot, paymentComment) {

  sbot.publish({ type: 'modifyMmtPaymentTest', paymentComment: paymentComment }, function (err, msg) {
    console.log('Adding payment Comment:')
    console.log(msg.key) 
    console.log(msg.value.author)
    console.log(msg.value.content)

  })

}

function displayPayments() {

  console.log('payments now looks like this:')
  console.log(payments)

}
