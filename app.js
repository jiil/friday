var Async = require('async');
var pluginManager = require("./pluginManager/pluginLoader.js");

/**
 * @callback errCallback
 * @param {err} Error object
 */

Async.waterfall([
    Async.apply(pluginManager.load),
    function(plugins, cb) {
        console.log(plugins);
        cb(null);
    }
], function(err) {
    if(err){console.log(err);}
});
