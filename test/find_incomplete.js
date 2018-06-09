const test = require("tape");
const util = require("../app/util")


test("findIncompleteWallets should return an array of wallet ids which dont have the required amount of public keys", function(t) {
  var allWallets = {
    'wallet1': {
      numCosigners: 3,
      xpub: {
        bar: 6,
        another: 7
      }
    },
    'wallet2': {
      numCosigners: 2,
      xpub: {
        bar: 6,
        myKey: 7
      }
    }
  };
    
  t.equal(['wallet1'], util.findIncompleteWallets(allWallets)); // make this test pass by completing the add function!
  t.end();
});


