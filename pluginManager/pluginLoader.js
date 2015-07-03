var fs = require('fs');
var async = require('async');
(function() {
    'use strict';
    var pluginManager = {};
    var root = this;
    var PLUGINDIR = process.env.HOME + '/.friday/plugins';
    //var PLUGINDIR = process.env.HOME ;

    pluginManager.upgrade = function() {};

    pluginManager.load = function() {
    };

    pluginManager.validate = function() {};

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = pluginManager;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function() {
            return pluginManager;
        });
    }
    // included directly via <script> tag
    else {
        root.pluginManager = pluginManager;
    }

}());

function mkdirf(path, callback) {
    fs.exists(path, function(exists) {
        if (exists) {
            fs.stat(path, function(err, status) {
                if (status.isDirectory()) {
                    callback(null);
                } else {
                    async.series([
                        async.apply(fs.unlink, path),
                        async.apply(fs.mkdir, path)
                    ], callback);
                }
            });
        } else {
            fs.mkdir(path, callback);
        }
    });
}
