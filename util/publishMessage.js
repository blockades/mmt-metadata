function publishMessage (sbot, messageType, content, recipients, verbose = false) {
  // publish an encrypted message

  content.type = messageType
  content.recipients = recipients
  
  // const opts = { type: messageType, content, recipients}
  // recipients are embedded in 'content'
  sbot.private.publish(content, recipients, function (err, msg) {
    if (verbose) {
      console.log('Published: ', messageType)
      console.log(JSON.stringify(msg, null, 4))
    }
  })

  // todo: should we also update db in memory and write to file when doing this?
}

module.exports = publishMessage

