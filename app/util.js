const messageTypes = [
  "initiateMmtMultisigTest",
  "shareMmtPublicKeyTest",
  "initiateMmtPaymentTest",
  "signMmtPaymentTest",
  "addMmtPaymentCommentTest",
  "addMmtRecieveCommentTest"
];

function publishMessage(server, type, content, recipients,currentWallet,callback) {
  // publish an encrypted message
  // recipients are embedded in 'content'
  server.private.publish(
    { type, content, recipients },
    recipients,
    (err, msg) => {
      if (err) console.error(err);
      console.log("Published: ", type);
      console.log(JSON.stringify(msg, null, 4));
      // re-call plugin to get the updated data
      server.mmtMetadata.get(function(err, dataFromSsb) {
        if (err) return callback(err, null)
        callback(null,dataFromSsb[currentWallet])
      } )
    }
  );
}

function identifyWallet(allWallets, mpk) {
  return Object.keys(allWallets).find(function(aWallet) {
    return Object.keys(allWallets[aWallet].xpub).indexOf(mpk) > -1;
  });
}

// todo: should this query be done within the ssb plugin?
function findIncompleteWallets(allWallets) {
  var incompleteWallets = [];
  console.log("allWallets", JSON.stringify(allWallets, null, 4));
  Object.keys(allWallets).forEach(function(aWallet) {
    //TODO: should we do validation of correct keys here?
    if (
      Object.keys(allWallets[aWallet].xpub).length <
      allWallets[aWallet].cosigners.length
    )
      incompleteWallets.push(aWallet);
  });
  return incompleteWallets;
}

function concatArrays(objValue, srcValue) {
  if (objValue && objValue.constructor === Array)
    // concatonate only unique values
    if (objValue.indexOf(srcValue) < -1)
      return objValue.concat(srcValue);
}

module.exports = {
  publishMessage,
  identifyWallet,
  findIncompleteWallets,
  messageTypes,
  concatArrays
};
