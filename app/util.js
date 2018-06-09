
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
function findIncompleteWallets(allWallets) {
  var incompleteWallets = []
  console.log('allWallets', JSON.stringify(allWallets,null,4))
  Object.keys(allWallets).forEach( function (aWallet) {
    //TODO: should we do validation of correct keys here?
    if (Object.keys(allWallets[aWallet].xpub).length < allWallets[aWallet].cosigners.length)
      incompleteWallets.push(aWallet)
  } ) 
  return incompleteWallets
}

function concatArrays(objValue, srcValue) {
  if (objValue && objValue.constructor === Array)
    return objValue.concat(srcValue);
}

module.exports = { identifyWallet, findIncompleteWallets, messageTypes, concatArrays }
