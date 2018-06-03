var verbose = true
var ssbClient = require('ssb-client')

ssbClient(function (err, sbot) {
  if (verbose) console.log('ssb ready.')


  // this assumes we already have an ssb identity.
  // if not we need to create one wiht ssb-keys (todo)

  if (sbot) {
    sbot.whoami(function (err,output){
      if (err) console.error(err)
      console.log(JSON.stringify(output,null,4))
      var me= output.id
      sbot.about.get(function (err,output){
        console.log(JSON.stringify(output[me],null,4))
      })
    })
  }
  else
    console.error('Unable to connect to sbot.  Is sbot running?')


})
