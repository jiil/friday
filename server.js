var http = require('http');

/**
 * Description
 * @method handleRequest
 * @param {} req
 * @param {} res
 * @return 
 */
function handleRequest(req, res){
    res.end("it works !! path hit: " + req.url);
}

var server = http.createServer(handleRequest);

server.listen(8080, function(){
    console.log("server listeneing on : http://localhost:%s", 8080);
});
