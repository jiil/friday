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

    /**
     * Description
     * @method upgrade
     * @return 
     */
    pluginManager.upgrade = function() {};

    /**
     * Description
     * @method load
     * @param {} callback
     * @return 
     */
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
                    if (file.match(/\.point\.yaml$/)) {
                        console.log(file);
                        Utils.readYaml(Path.join(PLUGINDIR, file), function(err, point) {
                            plug.points[point.point_name] = point;
                            ecb(err);
                        });
                    } else if (file.match(/\.plugin\.yaml$/)) {
                        console.log(file);
                        Utils.readYaml(Path.join(PLUGINDIR, file), function(err, plugin) {
                            plug.plugins[plugin.plugin_name] = plugin;
                            ecb(err);
                        });
                    } else {
                        ecb(null);
                    }
                }, function(err) {
                    cb(err)
                });
            }
        ], function(err) {
            callback(err, plug)
        });
    };

    /**
     * Description
     * @method validate
     * @return 
     */
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
