
const flumeView = require('flumeview-reduce')
const pull = require('pull-stream')

module.exports = {
  name: 'mmtMetadata',
  version: '1.0.0',
  manifest: {
    get: 'async',
    stream: 'source'
  },
  init: function (ssbServer, config) {

    return ssbServer._flumeUse('mmtMetadata', flumeView(1,reduce,map))

  }
}

function reduce (result,item) {
  if (!result) result = {}
  return result
}

function map (msg) {

  // if (msg.value.content && msg.value.content.type === 'addMmtPaymentCommentTest') {
  //   var content = msg.value.content.content
  //   content.author = msg.value.author
  // } 
  // console.log(JSON.stringify(msg,null,4))
    
  return {
  }
}


