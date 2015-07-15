var Path = require('path');
var Async = require('async');
var Utils = require('../utils/utils.js');

(function() {
    'use strict';
    var pluginManager = {};
    var root = this;
    //var CONFIGDIR = Path.join(process.env.HOME ,'.friday','plugins');
    var SRCDIR = Path.join(__dirname, '..');
    var PLUGINDIR = Path.join(SRCDIR, 'plugins');

    pluginManager.upgrade = function() {};

    pluginManager.load = function(callback) {
        var plug = {
            points: {},
            plugins: {}
        };
        Async.waterfall([
            //TODO NO CONFIG NOW : Async.apply(Utils.mkdirfp, CONFIGDIR),
            Async.apply(Utils.mkdirFP, PLUGINDIR),
            Async.apply(Utils.readdirR, PLUGINDIR),
            function(files, cb) {
                Async.each(files, function(file, ecb) {
                    if (file.match(/\.plugin\.yaml$/)) {
                        console.log(file);
                        Utils.readYaml(Path.join(PLUGINDIR, file), function(err, plugin) {
                            plug.plugins[plugin.plugin_name] = plugin;
                            ecb(err);
                        });
                    } else {
                        ecb(null);
                    }
                }, function(err) {
                    cb(err);
                });
            }
        ], function(err) {
            callback(err, plug);
        });
    };
    /**
     * - plugin 구조는 다음과 같다.
     * PLUGIN_NAME: string
     * DESCRIPTION: string
     * DEPENDENCIES: PLUGIN_NAME:PLUGIN_VERSION list
     * POINTS: POINT list
     * EXTENSIONS: EXTENSION list
     *
     * - POINT 구조는 다음과 같다.
     * NAME: string
     * VERSION: int
     * DESCRIPTION: string
     * SCHEMAS: SCHEMA list 
     *
     *
     * - SCHEMA 의 구조는 다음과 같다. 
     *
     * - EXTENSION 의 구조는 다음과 같다.  
     *
     *
     */
    function validatePoint(points, callback){
        callback(err, points);
    }


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
