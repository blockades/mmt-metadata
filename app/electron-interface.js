const bitcoinUtils = require("./bitcoin-utils");
const electronInterface = (module.exports = {});
const util = require("./util");
const ec = require("./electrum-client");

function getAddressComments(address, wallet) {
  var commentList = "";
  if (typeof address.comments === "undefined") return;

  address.comments.forEach(function(comment) {
    // possibly with avatar image
    commentList += "<p>";
    if (typeof wallet.cosigners[comment.author] != "undefined")
      if (typeof wallet.cosigners[comment.author].name != "undefined") {
        commentList += "<b>";
        commentList += wallet.cosigners[comment.author].name;
        commentList += ":</b> ";
      }
    commentList += comment.comment;
    commentList += "</p>";
  });
  return commentList;
}

electronInterface.displayWalletInfo = function(wallet) {
  if (wallet.walletName) $("#walletName").text(wallet.walletName);
  if (wallet.requiredCosigners)
    $("#requiredCosigners").text(wallet.requiredCosigners);
  if (wallet.cosigners) {
    $("#numberCosigners").text(Object.keys(wallet.cosigners).length);
    // TODO: names and avatars of cosigners
    var cosignerList = "";
    // should this be for...in?
    Object.keys(wallet.cosigners).forEach(function(cosigner) {
      cosignerList += wallet.cosigners[cosigner].name;
      cosignerList += " ";
    });
  }
  if (wallet.balance) $(".balance").text(wallet.balance);

  if (wallet.addresses) {
    $("#addressesTbody").html($(".addressesUnfilled").clone());

    Object.keys(wallet.addresses).forEach(function(address) {
      if (typeof wallet.addresses[address].amount === "undefined")
        wallet.addresses[address].amount = "";

      $(".addressesUnfilled")
        .clone()
        .find(".address")
        .text(address)
        .end()
        .find(".amount")
        .text(wallet.addresses[address].amount)
        .end()
        .find(".comments")
        .html(getAddressComments(wallet.addresses[address], wallet))
        .end()
        .attr("class", "filled")
        .insertAfter(".addressesUnfilled");
    });

    $("#requestsTbody").html($(".requestsUnfilled").clone());
    Object.keys(wallet.addresses).forEach(function(address) {
      if (wallet.addresses[address].comments) {
        $(".requestsUnfilled")
          // TODO: theres more info that could be added here
          .clone()
          .find(".address")
          .text(address)
          .end()
          .find(".memo")
          .html(getAddressComments(wallet.addresses[address], wallet))
          .end()
          .attr("class", "filled")
          .insertAfter(".requestsUnfilled");
      }
    });
  }

  if (wallet.firstUnusedAddress)
    $("#recieveAddress").text(wallet.firstUnusedAddress);
};

electronInterface.displayPayments = function(wallet, server, callback) {
  // this would be the place to create a snazzy html table
  if (wallet.transactions) {
    var payments = wallet.transactions;

    $("#paymentsTbody").html($(".paymentsUnfilled").clone());
    $("#incompleteTbody").html($(".incompleteUnfilled").clone());

    Object.keys(payments).forEach(function(index) {
      var commentList = "";

      if (typeof payments[index].comments === "undefined")
        payments[index].comments = [];
      if (typeof payments[index].amount === "undefined") {
        var displayAmount = "";
      } else {
        var displayAmount = payments[index].amount;
      }

      if (typeof payments[index].initiatedBy === "undefined") {
        var initiatedBy = "";
      } else {
        var initiatedBy = wallet.cosigners[payments[index].initiatedBy].name;
      }

      // TODO: this is wrong.  signedBy should be an array.
      //if (typeof payments[index].signedBy === "undefined")
      var signedBy = "";
      // } else {
      //   var signedBy = wallets.cosigners[payments[index].signedBy].name
      // }

      if (typeof payments[index].initialComment != "undefined") {
        commentList += "<b>";
        commentList += payments[index].initialComment;
        commentList += "</b>";
      }
      payments[index].comments.forEach(function(comment) {
        // possibly with avatar image
        commentList += "<p>";
        if (typeof wallet.cosigners[comment.author] != "undefined")
          if (typeof wallet.cosigners[comment.author].name != "undefined") {
            commentList += "<b>";
            commentList += wallet.cosigners[comment.author].name;
            commentList += ":</b> ";
          }

        commentList += comment.comment;
        commentList += "</p>";
      });

      if (payments[index].broadcast) {
        if (typeof payments[index].confirmations === "undefined")
          payments[index].confirmations = "unknown";
        if (typeof payments[index].timestamp === "undefined")
          var dateDisplay = (payments[index].timestamp = "unknown");
        else {
          var dateDisplay = new Date(payments[index].timestamp);
          dateDisplay = dateDisplay.toUTCString();
        }
        // TODO: this looks ugly with my indenting formatter
        $(".paymentsUnfilled")
          .clone()
          .find(".date")
          .text(dateDisplay)
          .end()
          .find(".cosigners")
          .text("") // TODO
          .end()
          .find(".comment")
          .html(commentList)
          .end()
          .find(".rate")
          .text(payments[index].rate)
          .end()
          .find(".amount")
          .text(displayAmount)
          .end()
          // TODO: make a thingy that goes from red to green with under 6 confimations
          .find(".confirmations")
          .text(payments[index].confirmations)
          .end()
          .find(".recipients")
          .text("")
          .end()
          .find(".options")
          .find(".details")
          .click(
            detailsFunctioncreator(server, wallet, index, payments, commentList,callback)
          )
          .end()
          .end()
          .attr("class", "filled")
          .insertAfter(".paymentsUnfilled");
      } else {
        // TODO: Dont Repeat Yourself
        $(".incompleteUnfilled")
          .clone()
          .find(".date")
          .text(dateDisplay)
          .end()
          .find(".initiatedBy")
          .text(initiatedBy)
          .end()
          .find(".cosigners")
          .html(signedBy)
          .end()
          .find(".comment")
          .html(commentList)
          .end()
          .find(".rate")
          .text(payments[index].rate)
          .end()
          .find(".amount")
          .text(displayAmount)
          .end()
          .find(".recipients")
          .text("")
          .end()
          .find(".options")
          .find(".details")
          .click(
            detailsFunctioncreator(server, wallet, index, payments, commentList,callback)
          )
          .end()
          .end()
          .attr("class", "filled")
          .insertAfter(".incompleteUnfilled");
      }
    });
  } else {
    console.log("no payments associated with wallet");
  }
};

electronInterface.createTransaction = function(wallet) {
  $("#sendVerifyErrors").text("");
  console.log("------balance", typeof wallet.balance, wallet.balance);
  var sendAmount = parseFloat($("input#sendAmount").val());
  console.log("------sendAmount", typeof sendAmount, sendAmount);
  var payTo = $("input#payTo").val();
  var comment = $("input#sendComment").val();

  if (!sendAmount || sendAmount < 0) {
    $("#sendVerifyErrors").text("Invalid amount. ");
    return false;
  } else if (sendAmount > wallet.balance) {
    $("#sendVerifyErrors").text("Not enough funds in wallet. ");
    return false;
  } else if (!bitcoinUtils.validAddress(payTo)) {
    $("#sendVerifyErrors").append("Invalid BTC address. ");
    return false;
  } else if (!comment || comment == "") {
    $("#sendVerifyErrors").append(
      "Please enter a description so your co-signers can see what the payment is for. "
    );
    return false;
  } else {
    $("input#payTo").val("");
    $("input#sendAmount").val("");
    $("input#sendComment").val("");
    // payTo(payTo,sendAmount)
    return { recipient: payTo, amount: sendAmount, comment: comment };
  }
};

electronInterface.createRecieveMemo = function() {
  var memo = $("input#memo").val();

  $("input#memo").val("");

  // TODO: get new unused address, update display

  return { comment: memo };
};

function addCommentFunctionCreator(server, wallet, index, callback) {
  if (wallet.walletId)
    return function() {
      var transactionComment = $("input#addTransactionComment").val();

      $("input#addTransactionComment").val("");

      var paymentComment = {
        walletId: wallet.walletId,
        key: index,
        comment: transactionComment
      };
      var recipients = Object.keys(wallet.cosigners);

      util.publishMessage(
        server,
        "addMmtPaymentCommentTest",
        paymentComment,
        recipients,
        wallet.walletId,
        function(err, updatedData) {
          callback(err, updatedData);
        }
      );
    };
}

function signFunctionCreator(server, wallet, index, callback) {
  if (wallet.walletId)
    return function() {
      var signComment = $("input#addTransactionComment").val();

      $("input#addTransactionComment").val("");
      // TODO: password
      var password = "test";

      ec.signTransaction(
        wallet.transactions[index].rawTransaction,
        password,
        function(err, output) {
          console.log(
            "Output from signTransaction",
            JSON.stringify(output, null, 4)
          );

          // Should we broadcast?
          // signTransaction gives us two boolean outputs,
          // 'complete' and 'final'.  Im gonna guess that
          // 'complete' is what we want here.
          if (output.complete) {
            // TODO: should we ask the user if they want to broadcast?
            ec.broadcast(output.hex, function(err, output) {
              console.log(
                "Output from broadcast ",
                JSON.stringify(output, null, 4)
              );
            });
          }

          var signPaymentData = {
            walletId: wallet.walletId,
            key: index,
            rawTransaction: output.hex,
            comment: signComment
          };

          var recipients = Object.keys(wallet.cosigners);

          util.publishMessage(
            server,
            "signMmtPaymentCommentTest",
            signPaymentData,
            recipients,
            wallet.walletId,
            function(err, updatedData) {
              callback(err, updatedData);
            }
          );
        }
      );
    };
}

function detailsFunctioncreator(server, wallet, index, payments, commentList,callback) {
  return function() {
    var payment = payments[index];
    $("#txid").text(index);

    // TODO: add more transaction details from the deserialised transaction
    $("#transactionDetailsAmount").text(payment.amount);
    // TODO: DRY
    if (typeof payments[index].initiatedBy === "undefined") {
      var intitatedBy = "";
    } else {
      var initiatedBy = wallet.cosigners[payments[index].initiatedBy].name;
    }
    var status = "";
    if (payment.broadcast) {
      status = "Complete and broadcast, ";
      status += payment.confirmations;
      status += " confirmations.";

      // get rid of sign button
      $("#signButton").html("");
    } else {
      status = "Incomplete. ";
      if (typeof payment.signatures != "undefined") {
        //TODO: for sure there is a handy lodash function that strips
        //      falsey values from arrays
        var numSigs = 0;
        payment.signatures.forEach(function(sig) {
          if (sig) numSigs += 1;
        });
        status += numSigs;
        status += " of ";
        status += wallet.requiredCosigners;
        status += " required signatures.";
      }
      // make sign button visible
      $("#signButton").html('<button id="theSignButton">Sign</button>');
      $("#theSignButton").click(
        signFunctionCreator(server, wallet, index, function(err, updatedData) {
          callback(err, updatedData);
        })
      );
      // add sign function here
      // if we are the last required signer, broadcast
    }
    $("#status").text(status);
    $("#initiatedBy").text(initiatedBy);
    // $("#signedBy").text(payments[index].signedBy);
    var outputs = "";
    if (typeof payment.outputs != "undefined") {
      payment.outputs.forEach(function(anOutput) {
        outputs += "<p>";
        outputs += anOutput.address; // check isMine?
        if (Object.keys(wallet.addresses).indexOf(anOutput.address) > -1) {
          outputs += " (Change address)";
        }
        outputs += ", ";
        outputs += anOutput.value / 10000000; // convert to BTC
        outputs += " BTC</p>";
      });
    }
    $("#outputs").html(outputs);
    $("#comments").html(commentList);

    $("#addComment").click(
      addCommentFunctionCreator(server, wallet, index, function(
        err,
        updatedData
      ) {
        callback(err, updatedData);
      })
    );

    $("#transactionTables").attr("class", "invisible");
    $("#transactionDetails").attr("class", "visible");
  };
}
