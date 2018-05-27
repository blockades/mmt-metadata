
var bitcoinUtils = require('../src/bitcoin-utils')
var electronInterface = module.exports = {}


electronInterface.displayWalletInfo = function(wallet) {
  if (wallet.name) $("#walletName").text(wallet.name)
  if (wallet.requiredCosigners) $("#requiredCosigners").text(wallet.requiredCosigners)
  if (wallet.publicKeys) $("#numberCosigners").text(wallet.publicKeys.length)
  if (wallet.balance) $(".balance").text(wallet.balance)
  
  // TODO: names and avatars of cosigners 


  if (wallet.addresses) {
    $("#addressesTbody").html($(".addressesUnfilled").clone()) 
    wallet.addresses.forEach( function(address) {
      $(".addressesUnfilled").clone()
        .find(".address").text(address).end()
        .find(".amount").text("-").end()
        .attr("class","filled")
      .insertAfter(".addressesUnfilled")
    } ) 
  }


  if (wallet.requests) {

    $("#requestsTbody").html($(".requestsUnfilled").clone()) 
    wallet.requests.forEach( function(request) {
      $(".requestsUnfilled").clone()
        .find(".address").text(request.address).end()
        .find(".memo").text(request.memo).end()
        .attr("class","filled")
      .insertAfter(".requestsUnfilled")
    } ) 
  }

  if (wallet.firstUnusedAddress) 
    $("#recieveAddress").text(wallet.firstUnusedAddress)
}

electronInterface.displayPayments = function(wallet) {
  // this would be the place to create a snazzy html table
  if (wallet.payments) {
    var payments = wallet.payments
    
    $("#paymentsTbody").html($(".paymentsUnfilled").clone()) 

    Object.keys(payments).forEach(function( index) {
    
      var commentList = "" 

      if (typeof payments[index].comments === 'undefined') payments[index].comments = []
      if (typeof payments[index].amount === 'undefined') payments[index].amount = 'unknown'
      if (typeof payments[index].confirmations === 'undefined') payments[index].confirmations = 'unknown'
      if (typeof payments[index].timestamp === 'undefined') 
        var dateDisplay = payments[index].timestamp = 'unknown'
      else {
        var dateDisplay = new Date(payments[index].timestamp)
        dateDisplay = dateDisplay.toUTCString()
      }  
      payments[index].comments.forEach(function(comment){    
          // todo: resolve alias for comment.author and add it here
          // possibly with avatar image 
          commentList += "<p>"
          commentList += comment.comment 
          commentList += "</p>"
      })

      $(".paymentsUnfilled").clone()
        .find(".date").text(dateDisplay).end()
        .find(".cosigners").text("").end()
        .find(".comment").html(commentList).end()
        .find(".rate").text(payments[index].rate).end()
        .find(".amount").text(payments[index].amount).end()
        // TODO: make a thingy that goes from red to green with under 6 confimations
        .find(".confirmations").text(payments[index].confirmations).end()
        .find(".recipients").text("recipeintsFromBlockchain").end()
        //.find(".options").find(".details")   .end() //change onclick attribute
        .attr("class","filled")
      .insertAfter(".paymentsUnfilled")
    } )


    if (verbose) {
      console.log('payments now looks like this:')
      console.log(JSON.stringify(payments, null, 4))
    }
  } else {
    console.error('cant display payments as no payments associated with wallet')
  }
}

electronInterface.createTransaction = function() {
  $("#sendVerifyErrors").text("")

  var sendAmount = parseFloat($("input#sendAmount").val())
  var payTo = $("input#payTo").val()
  
  if ((!sendAmount) || (sendAmount < 0)) {
    $("#sendVerifyErrors").text("Invalid amount. ")
    // todo: compare with balance
    return false
  } else if (!bitcoinUtils.validAddress(payTo)) { 
    $("#sendVerifyErrors").append("Invalid BTC address. ")
    return false
  } else {
    $("input#payTo").val("")
    $("input#sendAmount").val("")
    // payTo(payTo,sendAmount)
    return {"recipient": payTo, "amount": sendAmount}
  }
}


electronInterface.createRecieveMemo = function() {

  var memo = $("input#memo").val()
  
  $("input#memo").val("")
  
  // TODO: get new unused address, update display

  return {"memo": memo} 
  
}
