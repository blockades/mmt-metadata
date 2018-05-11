
var electronInterface = module.exports = {}

electronInterface.displayPayments = function(wallet) {
  // this would be the place to create a snazzy html table
  if (wallet.payments) {
    var payments = wallet.payments
    
    $("#paymentsTbody").html($(".unfilled").clone()) 

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

      $(".unfilled").clone()
        .find(".date").text(dateDisplay).end()
        .find(".cosigners").text("").end()
        .find(".comment").html(commentList).end()
        .find(".rate").text(payments[index].rate).end()
        .find(".amount").text(payments[index].amount).end()
        // TODO: make a thingy that goes from red to green with under 6 confimations
        .find(".confirmations").text(payments[index].confirmations).end()
        .find(".recipients").text("recipeintsFromBlockchain").end()
        //.find(".options").find(".details")   .end() //change onclick attribute
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
