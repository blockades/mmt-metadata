const Server = require('scuttlebot')
const fs = require('fs')
const Path = require('path')
const { ipcRenderer } = require('electron')

Server
  .use(require('scuttlebot/plugins/master'))
  .use(require('ssb-private'))
  .use(require('ssb-about'))

const Config = require('./config')
var config = Config()
console.log("*** Configuration ***", "\n")
console.log(config, "\n")

const server = Server(config)
console.log("*** Server ***", "\n")
console.log(server, "\n")

const manifest = server.getManifest()

fs.writeFileSync(Path.join(config.path, 'manifest.json'), JSON.stringify(manifest))
ipcRenderer.send('server-started')

