var Fs = require('fs');
var Async = require('async');
var Utils = require('../utils/utils.js');

(function() {
    'use strict';
    var pluginManager = {};
    var root = this;
    var PLUGINDIR = process.env.HOME + '/.friday/plugins';
    //var PLUGINDIR = process.env.HOME ;

    pluginManager.upgrade = function() {};

    pluginManager.load = function(callback) {
        Async.waterfall([
            Async.apply(Utils.mkdirfp, PLUGINDIR),
            Async.apply(Fs.readdir, PLUGINDIR),
            Async.asyncify(console.log)
            ],callback);
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
