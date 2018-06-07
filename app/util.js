
const messageTypes = [
  'initiateMmtMultisigTest',
  'shareMmtPublicKeyTest',
  'initiateMmtPaymentTest',
  'signMmtPaymentTest',
  'addMmtPaymentCommentTest',
  'addMmtRecieveCommentTest',
];

function identifyWallet(allWallets,mpk) {
  return Object.keys(allWallets).find ( function (aWallet){
    return Object.keys(allWallets[aWallet].xpub).indexOf(mpk) > -1
  } )
}

// todo: should this query be done within the ssb plugin?
function findIncompleteWallets(AllWallets) {
  var incompleteWallets = []
  Object.keys(allWallets).forEach( function (aWallet) {
    if (Object.keys(allWallets[aWallet].xpub).length < allWallets[aWallet].numCosigners)
      IncompleteWallets.push(aWallet)
  } )  
  return incompleteWallets
}

function concatArrays(objValue, srcValue) {
  if (objValue && objValue.constructor === Array)
    return objValue.concat(srcValue);
}

module.exports = { identifyWallet, findIncompleteWallets, messageTypes, concatArrays }
