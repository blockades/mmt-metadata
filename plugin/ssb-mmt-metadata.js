const flumeView = require('flumeview-reduce');
const pull = require('pull-stream');

const mergeWith = require('lodash.mergewith');

const ec = require("./electrum-client");
const util = require("./util");
const messageTypes = util.messageTypes;

module.exports = {
  name: 'mmtMetadata',
  version: '1.0.0',
  manifest: {
    get: 'async',
    stream: 'source',
    getTransactions: 'async'
  },
  init: function(ssbServer, config) {
    console.log('*** Loading mmtMetadata ***');
    var view = ssbServer._flumeUse('mmtMetadata', flumeView(2.6, reduce, map,null,{}));
    return { 
      get: view.get,
      stream: view.stream,
      getTransactions: function (walletId, cb) {
        view.get(function (err,data) {
          if (err) return cb(err)
          var transactions = data[walletId].transactions
          
          cb(null,transactions)
        })
      }
    }
  },
};

function reduce(result, item) {

  if (Object.keys(item).length > 0) {
    // console.log('!!!!!!! item', JSON.stringify(item, null, 4));
    // console.log('!!!!!!! result', JSON.stringify(result, null, 4));
    mergeWith(result, item, util.concatArrays);
  }
  return result;
}

function map(msg) {
  if (!msg.value.content || messageTypes.indexOf(msg.value.content.type) === -1) return
  var toReturn = {};
  const content = msg.value.content.content;
  const author = msg.value.author;
  var wallet = {};
  var key = '';
  if (content.walletId) {
    key = content.walletId;
    delete content.walletId;
  }
  
  // TODO: somewhere we need to make sure that all messages about each wallet
  // have exactly the same recipients
  wallet.cosigners = msg.value.content.recipients 

  // console.log('!!!!!!! ', JSON.stringify(msg, null, 4));
  switch (msg.value.content.type) {
    case 'initiateMmtMultisigTest':
      key = msg.key;
      // todo: can we set cosigners to the other recipients of this message?
      wallet = content;
      wallet.xpub = {[wallet.xpub]: author};

      break;

    case 'shareMmtPublicKeyTest':
      wallet = content;
      wallet.xpub = {[wallet.xpub]: author};

      break;

    case 'initiateMmtPaymentTest':
      var txid = content.key;
      delete content.key;
      content.initiatedBy = author;
      content.initialComment = content.comment;
      delete content.comment;
      wallet.transactions = {[txid]: content};
      break;

    case 'signMmtPaymentTest':
      var txid = content.key;
      delete content.key;
      content.signedBy = [author];
      content.comments = [{author, comment: content.comment}];
      delete content.comment;
      wallet.transactions = {[txid]: content};
      break;

    case 'addMmtPaymentCommentTest':
      wallet.transactions = {
        [content.key]: {comments: [{author, comment: content.comment}]},
      };
      break;
    case 'addMmtRecieveCommentTest':
      const address = content.address;
      delete content.address;
      content.author = author;
      wallet.recieveAddress = {[content.address]: [content]};
  }

  // deserialize all transactions
  for (transaction in wallet.transactions) {
    if (transaction.rawTransaction)
      ec.extractDataFromTx(transaction.rawTransaction, function(err, transactionData) {
        mergeWith(transaction,transactionData,util.concatArrays)
      } )
  }

  toReturn = {[key]: wallet};
  return toReturn;
}

