const Config = require('ssb-config/inject')
// const Config = require('ssb-config')
const ssbKeys = require('ssb-keys')
const Path = require('path')

const appName = "ssb" // <<< NOTE THIS IS YOUR DEFAULT IDENTITY

// const port = process.env.PORT || 8808
//
// const opts = {
//    port: port
// }
const opts = null

const config = Config(appName, opts)
Object.assign(config, { 
  appName,
  keys: ssbKeys.loadOrCreateSync(Path.join(config.path, 'secret')),

})

// config.remote = `net:127.0.0.1:${config.port}~shs:${config.keys.id.slice(1).replace('.ed25519', '')}`

module.exports = config


