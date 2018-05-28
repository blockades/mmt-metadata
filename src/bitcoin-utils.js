var bitcoin = require('bitcoinjs-lib')
let bip32 = require('bip32')
var bip39 = require('bip39')

function validAddress(address) {
  try {
    return bitcoin.address.toOutputScript(address, bitcoin.networks.testnet)
  } catch (e) { return false }
}


function bip32xpub() {
 // var mnemonic = bip39.generateMnemonic()
  var mnemonic = 'praise you muffin lion enable neck grocery crumble super myself license ghost'
  var seed = bip39.mnemonicToSeed(mnemonic)
  var node = bip32.fromSeed(seed)
  return node.neutered().toBase58()
}

module.exports = { validAddress, bip32xpub }
