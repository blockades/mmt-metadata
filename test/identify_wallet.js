const test = require("tape");

// my first go at writing a test with tape

function identifyWallet(wallets, mpk) {
  return Object.keys(wallets).find(function(wallet) {
    return Object.keys(wallets[wallet].xpub).indexOf(mpk) > -1;
  });
}

test("indentifyWallet should return the wallet key of the wallet containing the desired xpub", function(t) {
  var wallets = {
    blah: {
      foo: 5,
      xpub: {
        bar: 6,
        noKey: 7
      }
    },
    theone: {
      foo: 5,
      xpub: {
        bar: 6,
        myKey: 7
      }
    }
  };
  
  t.equal('theone', identifyWallet(wallets, 'myKey')); // make this test pass by completing the add function!
  t.end();
});


test("indentifyWallet should return undefined if no wallet contains the desired xpub", function(t) {
  var wallets = {
    blah: {
      foo: 5,
      xpub: {
        bar: 6,
        noKey: 7
      }
    },
    theone: {
      foo: 5,
      xpub: {
        bar: 6,
        myKey: 7
      }
    }
  };
  
  t.false(identifyWallet(wallets, 'thisKeyDoesntExist')); // make this test pass by completing the add function!
  t.end();
});

