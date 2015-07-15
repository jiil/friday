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
        readPluginDir(PLUGINDIR, callback);
    };

    function readPluginDir(pluginDir, callback){
        var plugins = [];
        Async.waterfall([
            //TODO NO CONFIG NOW : Async.apply(Utils.mkdirfp, CONFIGDIR),
            Async.apply(Utils.mkdirFP, pluginDir),
            Async.apply(Utils.readdirR, pluginDir),
            function(files, cb) {
                Async.each(files, function(file, ecb) {
                    if (file.match(/\.plugin\.yaml$/)) {
                        console.log(file);
                        Utils.readYaml(Path.join(pluginDir, file), function(err, plugin) {
                            plugin.PLUGIN_PATH = Path.join(pluginDir, file);
                            plugins.push(plugin);
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
            callback(err, plugins);
        });
    }

    /**
     * - PLUGIN 구조는 다음과 같다.
     * PLUGIN_NAME: string
     * DESCRIPTION: string
     * DEPENDENCIES: PLUGIN_NAME:PLUGIN_VERSION list
     * POINTS: POINT list
     * EXTENSIONS: EXTENSION list
     *
     * - POINT 구조는 다음과 같다.
     * NAME: string
     * VERSION: string [number][number]*(.[number][number]*)*
     * DESCRIPTION: string
     * ARGUMENTS: string
     * RESOURCE_STRUCTURES: RESOURCE_STRUCTURE list 
     *
     * - RESOURCE_STRUCTURE 의 구조는 다음과 같다. 
     * NAME: string
     * TYPE: string string|number|object|module|command
     * MANDATORY_KEY_LIST : string list (use only for object)
     * METHOD_NAME: string (used only for module)
     * PROGRAM_NAME: string (used only for command)
     * ARGUMENT_LIST: string list (used only for command)
     *
     * - EXTENSION 의 구조는 다음과 같다.  
     * POINT_NAME: string
     * POINT_VERSION: string [number][number]*(.[number][number]*)*
     * EXTENSION_TYPE: string
     * DESCRIPTION: string
     * RESOURCES: RESOURCE list
     *
     * - RESOURCE that defined from RESOURCE_STRUCTURES
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
