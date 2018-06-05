
const flumeView = require('flumeview-reduce')
const pull = require('pull-stream')

const messageTypes = [
  'initiateMmtMultisigTest',
  'shareMmtPublicKeyTest',
  'initiateMmtPaymentTest',
  'signMmtPaymentTest',
  'addMmtPaymentCommentTest',
  'addMmtRecieveCommentTest'
]

module.exports = {
  name: 'mmtMetadata',
  version: '1.0.0',
  manifest: {
    get: 'async',
    stream: 'source'
  },
  init: function (ssbServer, config) {
    console.log('*** Loading mmtMetadata ***')
    return ssbServer._flumeUse('mmtMetadata', flumeView(1.9,reduce,map))

  }
}

function reduce (result,item) {
  if (!result) result = {}

  if (Object.keys(item).length > 0) {

  // console.log('!!!!!!! item', JSON.stringify(item,null,4))
  // console.log('!!!!!!! result', JSON.stringify(result,null,4))
    Object.keys(item).forEach(function (i){
      result[i] = item[i]
      // this should be a deep merge which concatonates arrays
    })
  } 
  return result
}

function map (msg) {
  if (msg.value.content && messageTypes.indexOf(msg.value.content.type) > -1) {
    var toReturn = {}
    const content = msg.value.content.content
    const author = msg.value.author
    var wallet = {}
    var key = ''
    if (content.walletId) { 
      key = content.walletId
      delete content.walletId
    }

    switch (msg.value.content.type) {
      case 'initiateMmtMultisigTest':
        key = msg.key
        // todo: can we set cosigners to the other recipients of this message?
        wallet = content
        wallet.xpub = { [wallet.xpub]: author  } 

        break

      case 'shareMmtPublicKeyTest':
        wallet = content
        wallet.xpub = { [ wallet.xpub ]: author }

        break

      case 'initiateMmtPaymentTest':
        const txid = content.key
        delete content.key
        content.initiatedBy = author
        content.initialComment = content.comment
        delete content.comment
        wallet.transactions[txid] = content  
        break

      case 'signMmtPaymentTest':
        const txid = content.key
        delete content.key
        content.signedBy = [ author ]
        content.comments = [ {author, comment: content.comment } ]
        delete content.comment
        wallet.transactions[txid] = content  
        break

      case 'addMmtPaymentCommentTest':
        wallet.transactions[content.key].comments = [ { author, comment: content.comment } ]
        break
      case 'addMmtRecieveCommentTest':
        const address = content.address
        delete content.address
        content.author = author
        wallet.recieveAddress[content.address] = [ content ]
    }
    toReturn = { [key]: wallet }
  } 
  return toReturn
}


