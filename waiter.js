var http = require('http');
var url = require('url');
var plugins = require('./pluginManager/pluginLoader.js');

function handleRequest(req, res){
    'use strict';
    res.end('it works !! path hit: ' + req.url);
    console.log(url.parse(req.url, true));
}

var server = http.createServer(handleRequest);

server.listen(8080, function(){
    'use strict';
    console.log('server listeneing on : http://localhost:%s', 8080);
});
