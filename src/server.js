const Server = require('scuttlebot')
const config = require('./config')

const fs = require('fs')
const Path = require('path')

// Install the plugin
Server
  .use(require('scuttlebot/plugins/master')) // required
//  .use(require('ssb-about'))
  .use(require('ssb-private'))
  // .use(require('ssb-backlinks')) // not required, just an example

// Start the server
const server = Server(config)

const manifest = server.getManifest()
fs.writeFileSync(Path.join(config.path, 'manifest.json'), JSON.stringify(manifest))
