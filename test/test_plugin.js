
var Client = require('ssb-client')
var config = require('./config')()

Client(config.keys, config, (err, server) => {
  if (err) return console.error(err)
  server.whoami(function (err,msg) {
    console.log(msg)
  })
  //server.mmtMetadata.get(function(err, dataFromSsb) {
})

