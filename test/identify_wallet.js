
var wallets = {
  'blah': {
     foo: 5,
     xpub: {
       'bar': 6,
       'noKey': 7
     }
   },
   'theone': {

     foo: 5,
     xpub: {
       'bar': 6,
       'myKey': 7
     }
   }
}

function indentifyWallet(mpk) {
  return Object.keys(wallets).find ( function (wallet){
    return Object.keys(wallets[wallet].xpub).indexOf(mpk) > -1
  } )
} 

console.log(indentifyWallet('myxKey'))
