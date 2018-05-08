
// functions for talking to electrum via http

const request = require('request');


function electrumRequest (method, params, callback) {

  // username and pw should be read from config file
  // note: this is not the actual password which the wallet is encrypted
  //       with, its just for basic http authentication on a local machine
  // TODO: 8888 is not the default port
  var options = {  
      method: 'POST',
      json: {"id":"curltext","method":method,"params": params},
      url: 'http://127.0.0.1:8888',
      auth: {
          username: 'spinach',
          password: 'test'
      }
  }

  request(options, function(err,response,body) {
    if (err) console.error(err)
    callback(body)
  })

}

// an example request for history with no parameters
electrumRequest("history",[], function (output) {
  console.log(JSON.stringify(output,null,4))
})
