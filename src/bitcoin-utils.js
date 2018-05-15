var bitcoin = require('bitcoinjs-lib')

function validAddress(address) {
  try {
    return bitcoin.address.toOutputScript(address, bitcoin.networks.testnet)
  } catch (e) { return false }
}

module.exports = { validAddress }
