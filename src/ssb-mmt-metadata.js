
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

}

function map (msg) {

  return {
  }
}


