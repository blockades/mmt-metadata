const bitcoinUtils = require("./bitcoin-utils");
const electronInterface = (module.exports = {});
const util = require("./util");

electronInterface.displayWalletInfo = function(wallet) {
  if (wallet.walletName) $("#walletName").text(wallet.walletName);
  if (wallet.requiredCosigners)
    $("#requiredCosigners").text(wallet.requiredCosigners);
  if (wallet.cosigners)
    $("#numberCosigners").text(Object.keys(wallet.cosigners).length);
  if (wallet.balance) $(".balance").text(wallet.balance);

  // TODO: names and avatars of cosigners

  if (wallet.addresses) {
    $("#addressesTbody").html($(".addressesUnfilled").clone());

    // TODO: amount and comments
    wallet.addresses.forEach(function(address) {
      $(".addressesUnfilled")
        .clone()
        .find(".address")
        .text(address)
        .end()
        .find(".amount")
        .text("-")
        .end()
        .attr("class", "filled")
        .insertAfter(".addressesUnfilled");
    });
  }

  if (wallet.requests) {
    $("#requestsTbody").html($(".requestsUnfilled").clone());
    wallet.requests.forEach(function(request) {
      $(".requestsUnfilled")
        .clone()
        .find(".address")
        .text(request.address)
        .end()
        // TODO: add author
        .find(".memo")
        .text(request.memo)
        .end()
        .attr("class", "filled")
        .insertAfter(".requestsUnfilled");
    });
  }

  if (wallet.firstUnusedAddress)
    $("#recieveAddress").text(wallet.firstUnusedAddress);
};

electronInterface.displayPayments = function(
  wallet,
  server,
  callback
) {
  // this would be the place to create a snazzy html table
  if (wallet.transactions) {
    var payments = wallet.transactions;

    $("#paymentsTbody").html($(".paymentsUnfilled").clone());
    $("#incompleteTbody").html($(".incompleteUnfilled").clone());

    Object.keys(payments).forEach(function(index) {
      var commentList = "";

      if (typeof payments[index].comments === "undefined")
        payments[index].comments = [];
      if (typeof payments[index].amount === "undefined")
        payments[index].amount = "Unknown";

      if (typeof payments[index].initiatedBy === "undefined")
        payments[index].initiatedBy = "";
      if (typeof payments[index].signedBy === "undefined")
        payments[index].signedBy = "";

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

        $(".paymentsUnfilled")
          .clone()
          .find(".date")
          .text(dateDisplay)
          .end()
          .find(".cosigners")
          .text("")
          .end()
          .find(".comment")
          .html(commentList)
          .end()
          .find(".rate")
          .text(payments[index].rate)
          .end()
          .find(".amount")
          .text(payments[index].amount)
          .end()
          // TODO: make a thingy that goes from red to green with under 6 confimations
          .find(".confirmations")
          .text(payments[index].confirmations)
          .end()
          .find(".recipients")
          .text("recipeintsFromBlockchain")
          .end()
          .find(".options")
          .find(".details")
          .click(function() {
            $("#txid").text(index);
            // TODO: add more transaction details from the deserialised transaction
            $("#transactionDetailsAmount").text(payments[index].amount);

            // this should be wallet.cosigners[payments[index].initiatedBy].name
            $("#initiatedBy").text(payments[index].initiatedBy);
            $("#signedBy").text(payments[index].signedBy);
            //"outputs"
            $("#comments").html(commentList);

            $("#addComment").click();

            $("#addComment").click(
              addCommentFunctionCreator(
                server,
                wallet,
                index,
                function(err, updatedData) {
                  callback(err, updatedData);
                }
              )
            );
            
            $("#transactionTables").attr("class", "invisible");
            $("#transactionDetails").attr("class", "visible");
          })
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
          .text(payments[index].initiatedBy)
          .end()
          .find(".cosigners")
          .text(payments[index].signedBy)
          .end()
          .find(".comment")
          .html(commentList)
          .end()
          .find(".rate")
          .text(payments[index].rate)
          .end()
          .find(".amount")
          .text(payments[index].amount)
          .end()
          .find(".recipients")
          .text("recipeintsFromBlockchain")
          .end()
          .find(".options")
          .find(".details")
          .click(function() {
            $("#txid").text(index);
            // TODO: add more transaction details from the deserialised transaction
            $("#transactionDetailsAmount").text(payments[index].amount);
            //"initiatedBy"
            //"signedBy"
            //"outputs"
            $("#comments").html(commentList);

            $("#addComment").click(
              addCommentFunctionCreator(
                server,
                wallet,
                index,
                function(err, updatedData) {
                  callback(err, updatedData);
                }
              )
            );

            $("#transactionTables").attr("class", "invisible");
            $("#transactionDetails").attr("class", "visible");
          })
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

  return { memo: memo };
};

function addCommentFunctionCreator(
  server,
  wallet,
  index,
  callback
) {
  if (wallet.walletId)
    return function() {
      var transactionComment = $("input#addTransactionComment").val();

      $("input#addTransactionComment").val("");

      var paymentComment = {
        walletId: wallet.walletId,
        key: index,
        comment: transactionComment
      };
      console.log(JSON.stringify(wallet.cosigners, null, 4));
      var recipients = Object.keys(wallet.cosigners);
      util.publishMessage(
        server,
        "addMmtPaymentCommentTest",
        paymentComment,
        recipients,
        function(err, updatedData) {
          callback(err, updatedData);
        }
      );
    };
}
