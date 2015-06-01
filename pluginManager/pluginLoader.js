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
        fs.exists(PLUGINDIR, function(exists) {
            if (exists) {
                async.waterfall([
                        async.apply(fs.stat, PLUGINDIR),

                        function(status, cb) {
                            if (status.isDirectory()) {
                                fs.readdir(PLUGINDIR, cb);
                            } else {
                                async.waterfall([
                                    async.apply(fs.unlink, PLUGINDIR),
                                    async.apply(fs.mkdir, PLUGINDIR)
                                ], function(err) {
                                    cb(err, []);
                                });
                            }
                        }
                    ],
                    function(err, files) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(files);
                        }
                    });
            } else {
                fs.mkdir(PLUGINDIR, function(err) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        });
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
