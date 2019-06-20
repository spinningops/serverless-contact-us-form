const fs = require('fs')
const path = require('path')
var http = require('http')

http.createServer(function (req, res) {
  fs.readFile(path.join(__dirname, req.url), function (err, data) {
    if (err) {
      res.writeHead(404)
      res.end(JSON.stringify(err))
      return
    }
    res.writeHead(200)
    res.end(data)
  })
}).listen(1337)
