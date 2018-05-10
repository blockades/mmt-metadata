
## mmt-metadata

Using ssb to record metadata associated with multi-signature bitcoin transactions.  

Currently it is a work in progress.

### Motivation

Wallet software with multi-signature functionality such as Electrum do not allow us to see cosigners in payment history, or to share payment descriptions and other notes.  This project will provide these features using secure-scuttlebutt as a communication protocol.

### What this project should do: (can be separated into smaller modules)

- Use secure-scuttlebutt for sharing information between holders of the wallet. 
- Provide shared access to payment meta-data.
- Provide a mechanism for sending and viewing partially signed transactions.
- Provide a mechanism for sharing public keys when initiating the wallet.
- Potentially integrate with a seed sharding backup system....
- Have a front end using electron, potentially with mythical language and pictures relating to keys, seeds and shards.

### Proposed ssb message types:

This is only a proposal!  Its all subject to discussion and change...

- All type names will be appended with 'test' to stop test types from later interfering.
- All messages will be encrypted.
- No main-net transaction data will be published until we have agreed it is secure.

#### `initiateMmtMultisigTest` 

This will be published one time per wallet by the person who initiates the wallet and will contain a name for the wallet, the number of required cosigners and one bitcoin public key.  The list of recipients for this message will remain the same for all future messages related to this wallet, and also defines the number of cosigners.
Example:
```
content: {
  walletName: 'the groovy gang wallet',
  requiredCosigners: 2,
  xpub: 'xpubblahblah....'
}
```

#### `shareMmtPublicKeyTest`

This will be published once per remaining group member to initiate the wallet.  It will contain the ssb message key of the relevant `initiateMmtMultisigTest` message, as well as one bitcoin public key.
Example:
```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  xpub: 'xpubblahblah.....'
}
```

#### `unsignedMmtPaymentTest`

This will be published each time an outgoing payment needs to be signed.  In the case of only two signatures being required it will be published once per outgoing payment. It will contain a bitcoin transaction id, the raw unsigned transaction in hex, optionally the rate in another currency at the time of initiating, and optionally a description. 

Potentially an alias or unique indentifier could be associated with each receive address, but im not sure how to do this in a reliable way.

It could possibly also contain an identifier of the wallet, but it should be possible to derive this from the transaction data.

```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  // is the transaction id needed?  it can also be derived from the transaction data
  key: 'd5f2a6a8cd1e8c35466cfec16551', 
  rawTransaction: 'a294b83........',
  rate:           5000,
  comment:       'bought a new pencil sharpener'
}
```

#### `addMmtPaymentCommentTest`

This will be published any number of times to add notes and comments to payments.  This can also be extended to add extra functionality for specific use cases.  For example a payroll system could add the pay period dates and days worked.  It will contain a bitcoin transaction id, a comment, and optional extra information.

Example:
```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  key: 'd5f2a6a8cd1e8c35466cfec16551', 
  comment: 'this payment was a mistake'
}
```

### Installation and dependencies

```
npm install
```
sbot must be running.  Either you will need to be running an ssb client with sbot embedded such as Patchwork, or install sbot and run `sbot server`

To run:
```
npm start
```

### Integration with electrum

Setting up electrum is not yet automated, we will need to do:

```
electrum --testnet setconfig rpcport 8888
electrum --testnet setconfig rpcuser spinach
electrum --testnet setconfig rpcpassword test
electrum --testnet daemon start 
electrum --testnet -w ~/.electrum/testnet/wallets/walletfile daemon load_wallet 
```
and not to forget afterwards
```
electrum --testnet daemon stop 
```

### Relevant resources

* [scuttlebot api docs](https://github.com/ssbc/scuttlebot/blob/master/api.md)
* [pull-stream docs](https://pull-stream.github.io/)
* [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)
* [electrum json rpc interface](http://docs.electrum.org/en/latest/merchant.html#jsonrpc-interface)
* [live.blockcypher.com/btc-testnet](https://live.blockcypher.com/btc-testnet/) - this is the testnet explorer im using.  If you know a better one, post it here
