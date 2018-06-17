var bitcoin = require('bitcoinjs-lib')
let bip32 = require('bip32')
var bip39 = require('bip39')
const btcnodejs = require('btcnodejs');

btcnodejs.network.setup('testnet');

function validAddress(address) {
  try {
    return bitcoin.address.toOutputScript(address, bitcoin.networks.testnet)
  } catch (e) { return false }
}

function getSeed() {
 return bip39.generateMnemonic()
}

function bip32xpub(mnemonic) {
  // var mnemonic = 'praise you muffin lion enable neck grocery crumble super myself license ghost'
  var seed = bip39.mnemonicToSeed(mnemonic)
  var node = bip32.fromSeed(seed)
  return node.neutered().toBase58()
}


function getTransactionId(electrumTx) {
  const inputs = electrumTx.inputs.map(function(input) {
    const seq = new btcnodejs.Sequence(input.sequence);
    const witness = new btcnodejs.Witness();
    return new btcnodejs.Input(
      input.prevout_hash,
      input.prevout_n,
      btcnodejs.ScriptSig.empty(),
      seq,
      witness,
    );
  });
  const outputs = electrumTx.outputs.map(function(output) {
    const sigPub = btcnodejs.ScriptPubKey.fromHex(
      output.scriptPubKey,
    );
    return new btcnodejs.Output(output.value, sigPub);
  });
  const tx = new btcnodejs.Transaction(
    electrumTx.version,
    inputs,
    outputs,
    new btcnodejs.Locktime(electrumTx.lockTime),
    true,
  );
  
  return tx.txid;
}

module.exports = { validAddress, getSeed, bip32xpub, getTransactionId }
