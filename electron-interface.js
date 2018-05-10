
var electronInterface = module.exports = {}

electronInterface.displayPayments = function(wallet) {
  // this would be the place to create a snazzy html table
  if (wallet.payments) {
    var payments = wallet.payments
    
    $("#paymentsTbody").html($(".unfilled").clone()) 

    Object.keys(payments).forEach(function( index) {
    
      var commentList = ""  
      payments[index].comments.forEach(function(comment){    
          // todo: resolve alias for comment.author and add it here
          commentList += "<p>"
          commentList += comment.comment 
          commentList += "</p>"
      })

      $(".unfilled").clone()
        .find(".date").text("dateFromBlockchain").end()
        .find(".comment").html(commentList).end()
        .find(".rate").text(payments[index].rate).end()
        .find(".amount").text("amountFromBlockchain").end()
        .find(".recipients").text("recipeintsFromBlockchain").end()
        .attr("class","index")
      .insertAfter(".unfilled")
    } )


    if (verbose) {
      console.log('payments now looks like this:')
      console.log(JSON.stringify(payments, null, 4))
    }
  } else {
    console.error('cant display payments as no payments associated with wallet')
  }
}
