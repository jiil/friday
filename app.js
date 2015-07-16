var Async = require('async');
var pluginManager = require('./pluginManager/pluginLoader.js');

Async.waterfall([
    Async.apply(pluginManager.load),
    function(plugins, cb) {
        console.log(JSON.stringify(plugins));
        cb(null);
    }
], function(err) {
    if(err){console.log(err);}
});
