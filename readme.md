
## mmt-metadata

Using ssb to record metadata associated with multi-signature bitcoin transactions.  

Multi-sig wallets such as Electrum do not allow us to see cosigners in payment history, or to share payment descriptions and other notes.

What this project should do: (can be separated into smaller modules)

- Use secure-scuttlebutt for sharing information between holders of the wallet 
- Provide shared access to payment meta-data
- Provide a mechanism for sending and viewing partially signed transactions.
- Provide a mechanism for sharing public keys when initiating the wallet.

Currently its a work in progress.

electron front end in a separate branch

* [pull-stream docs](https://pull-stream.github.io/)
* [Scuttlebot API - Scuttlebot](https://scuttlebot.io/apis/scuttlebot/ssb.html)
