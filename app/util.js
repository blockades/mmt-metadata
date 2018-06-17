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
        if (currentWallet) callback(null,dataFromSsb[currentWallet])
        else callback(null,dataFromSsb)
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
  // should this better be an object, not array?
  var incompleteWallets = [];
  // console.log("allWallets", JSON.stringify(allWallets, null, 4));
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


// todo: should this query be done within the ssb plugin?
function findWalletsNotSignedBy(me,allWallets) {
  // should this better be an object, not array?
  var unsignedWallets = [];
  Object.keys(allWallets).forEach(function(aWallet) {
    // Check its incomplete
    if (
      Object.keys(allWallets[aWallet].xpub).length <
      allWallets[aWallet].cosigners.length
    )  
      if (Object.values(allWallets[aWallet].xpub).indexOf(me) < 0)
        unsignedWallets.push(aWallet);
  });
  return unsignedWallets;
}

function concatArrays(objValue, srcValue) {
  if (objValue && objValue.constructor === Array)
    // concatonate only unique values
    if (objValue.indexOf(srcValue) < -1)
      return objValue.concat(srcValue);
}

function cosignerInfo(wallet,ssbAbout) {
    Object.keys(wallet.cosigners).forEach(function(cosigner) {
      // not sure if this is the most reliable way to get self-identified name but works for me
      wallet.cosigners[cosigner].name = ssbAbout[cosigner].name[cosigner][0];
      wallet.cosigners[cosigner].image = ssbAbout[cosigner].image[cosigner][0];
      // TODO: this gives image location, we still need to actually get the image from ssb
  });
  return wallet;
}
module.exports = {
  publishMessage,
  identifyWallet,
  findIncompleteWallets,
  findWalletsNotSignedBy,
  messageTypes,
  cosignerInfo,
  concatArrays
};
