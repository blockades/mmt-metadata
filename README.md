
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

This will be published one time per wallet by the person who initiates the wallet and will contain a name for the wallet `walletName`, the number of required cosigners `requiredCosigners` and one bitcoin public key `xpub`.  The list of recipients for this message will remain the same for all future messages related to this wallet, and also defines the number of cosigners.
Example:
```
content: {
  walletName: 'the groovy gang wallet',
  requiredCosigners: 2,
  xpub: 'xpubblahblah111....'
}
```

#### `shareMmtPublicKeyTest`

This will be published once per remaining group member to initiate the wallet.  It will contain the ssb message key of the relevant `initiateMmtMultisigTest` message `walletId`, as well as one bitcoin public key `xpub`.
Example:
```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  xpub: 'xpubblahblah222.....'
}
```


#### `initiateMmtPaymentTest`

This will be published once each time an outgoing payment is initiated.  It will contain a bitcoin transaction id, the raw transaction in hex, optionally the rate in another currency at the time of initiating, and a description of the payment. 

```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  // is the transaction id needed?  it can also be derived from the transaction data
  key: 'd5f2a6a8cd1e8c35466cfec16551', 
  rawTransaction: 'a294b83........',
  rate:           { value: 5000, currency: 'GBP' } 
  comment:       'bought a new pencil sharpener'
}
```

#### `signMmtPaymentTest`


This will be published each additional time a transaction is signed.  It will contain a bitcoin transaction id, the raw transaction in hex, and optionally a comment about the payment.
```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  // is the transaction id needed?  it can also be derived from the transaction data
  key: 'd5f2a6a8cd1e8c35466cfec16551',
  rawTransaction: 'a294b83........',
  comment:       'ive signed this but i dont see why we need a new pencil sharpener'
}
```

#### `addMmtPaymentCommentTest`

This will be published any number of times to add notes and comments to payments.  This can also be extended to add extra functionality for specific use cases.  For example a payroll system could add the pay period dates and days worked.  It will contain: a link the `initiateMmtMultisigTest` ssb message `walletId`, a bitcoin transaction id `key`, a comment `comment`, and optional extra information.

Example:
```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  key: 'd5f2a6a8cd1e8c35466cfec16551',
  comment: 'this payment was a mistake'
}
```


#### `addMmtRecieveCommentTest`

This will be published any number of times to add a comment to a recieve address.  This will be used to create something like an invoice for a specific recieve address, to reserve that address for a particular payment.  This helps avoid address reuse and makes it easy to check if a particular payment has been recieved. It will contain a recieve address, a comment, and optionally a requested amount and an expiry date for the request.

Example:

```
content: {
  walletId: '%9t2AsdffVfrt9+PygOipJP6COtTUy7igJt/SjNWkYnR8=.sha256',
  address: 'bc15f2a6a8cd1e8c3dfjhg873hk', 
  comment: 'Invoice for that job we did'
  amount: '0.0184'
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
electrum --testnet setconfig dynamic_fees True
electrum --testnet setconfig fee_level 3
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
* [mixmix/ssb-server-plugin-intro](https://github.com/mixmix/ssb-server-plugin-intro)
