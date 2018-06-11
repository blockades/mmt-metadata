const ec = require('../app/electrum-client.js')

ec.parseHistory(function(err,output) {
  console.log(JSON.stringify(output,null,4))
})
