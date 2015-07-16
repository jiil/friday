var Path = require('path');
var Async = require('async');
var Utils = require('../utils/utils.js');
var _ = require('underscore');

(function() {
    'use strict';
    var pluginManager = {};
    var root = this;
    //var CONFIGDIR = Path.join(process.env.HOME ,'.friday','plugins');
    var SRCDIR = Path.join(__dirname, '..');
    var PLUGINDIR = Path.join(SRCDIR, 'plugins');

    pluginManager.upgrade = function() {};

    pluginManager.load = function(callback) {
        Async.waterfall([
            Async.apply(readPluginDir, PLUGINDIR),
            generatePlugins
        ], function(err, plugins) {
            callback(err, plugins);
        });
    };

    function readPluginDir(pluginDir, callback) {
        var yamls = [];
        Async.waterfall([
            //TODO NO CONFIG NOW : Async.apply(Utils.mkdirfp, CONFIGDIR),
            Async.apply(Utils.mkdirFP, pluginDir),
            Async.apply(Utils.readdirR, pluginDir),
            function(files, cb) {
                Async.each(files, function(file, ecb) {
                    if (file.match(/\.plugin\.yaml$/)) {
                        Utils.readYaml(Path.join(pluginDir, file), function(err, plugin) {
                            if (err) {
                                console.log(err);
                                ecb(err);
                            } else {
                                plugin.PLUGIN_PATH = Path.join(pluginDir, file);
                                yamls.push(plugin);
                                ecb(err);
                            }
                        });
                    } else {
                        ecb(null);
                    }
                }, function(err) {
                    cb(err);
                });
            }
        ], function(err) {
            callback(err, yamls);
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
     * STRUCTURES: STRUCTURE list 
     *
     * - STRUCTURE 의 구조는 다음과 같다. 
     * NAME: string
     * TYPE: string string|number|object|module|method
     * MANDATORY_KEY_LIST : string list (use only for object)
     * MODULE_PATH: string (used only for module and method)
     * METHOD_NAME: string (used only for module)
     *
     * - EXTENSION 의 구조는 다음과 같다.  
     * POINT_NAME: string
     * POINT_VERSION: string [number][number]*(.[number][number]*)*
     * EXTENSION_TYPE: string
     * DESCRIPTION: string
     * RESOURCES: RESOURCE list
     *
     * - RESOURCE that defined from STRUCTURES
     *
     * - in memory structure
     * {
     *      
     *      plugins:
     *          PLUGIN_NAME:
     *              DESCRIPTION:
     *              DEPENDENCIES:
     *              PLUGIN_PATH:
     *      points:
     *          NAME#VERSION:
     *              DESCRIPTION:
     *              ARGUMENTS:
     *              STRUCTURES:
     *                  - NAME:
     *                    TYPE:
     *                    option:
     *      extensions:
     *          POINT_NAME#VERSION: 
     *              EXTENSION_TYPE:
     *              DESCRIPTION:
     *              RESOURCES:
     * }
     *
     */

    function generatePlugins(yamls, callback){
        var plugins = {};
        var points = {};
        var extensions = {};
        _.each(yamls, function(yaml) {
            var plugin = getPlugin(yaml);
            if (plugin) {
                plugins[plugin.PLUGIN_NAME] = plugin;
            }
            if (yaml.POINTS && !_.isEmpty(yaml.POINTS)) {
                _.each(yaml.POINTS, function(point) {
                    var newPoint = getPoint(point);
                    if(newPoint){
                        newPoint.PLUGIN_NAME = plugin.PLUGIN_NAME;
                        points[newPoint.NAME] = newPoint;
                    }
                });
            }
            if (yaml.EXTENSIONS && !_.isEmpty(yaml.EXTENSIONS)) {
                _.each(yaml.EXTENSIONS, function(extension) {
                    var newExtension = getExtension(extension);
                    if(newExtension){
                        newExtension.PLUGIN_NAME = plugin.PLUGIN_NAME;
                        newExtension.PLUGIN_PATH = plugin.PLUGIN_PATH;
                        extensions[newExtension.POINT_NAME] = newExtension;
                    }
                });
            }
        });

        var err = null;
        callback(err, plugins);
    }

    function getExtension(extension) {
        if (extension.POINT_NAME && extension.POINT_VERSION && extension.EXTENSION_TYPE && extension.RESOURCES && !_.isEmpty(extension.RESOURCES)){
            var newExtension = {};
            newExtension.POINT_NAME = extension.POINT_NAME;
            newExtension.POINT_VERSION = extension.POINT_VERSION;
            newExtension.EXTENSION_TYPE = extension.EXTENSION_TYPE;
            newExtension.RESOURCES = extension.RESOURCES;
            return extension;
        }else{
            return null;
        }
    }

    function getPoint(point) {
        if (point.NAME && point.VERSION && point.STRUCTURES && !_.isEmpty(point.STRUCTURES)) {
            var structures = _.map(point.STRUCTURES, getStructure);
            if (_.every(structures, _.identity)) {
                var newPoint = {};
                newPoint.NAME = point.NAME;
                newPoint.VERSION = point.VERSION;
                newPoint.STRUCTURES = structures;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    function getStructure(structure) {
        if (structure.NAME && structure.TYPE) {
            var newStructure = {
                NAME: structure.NAME,
                TYPE: structure.TYPE
            };
            switch (structure.TYPE) {
                case 'command':
                    newStructure.ARGUMENT_LIST = (structure.ARGUMENT_LIST) ? structure.ARGUMENT_LIST : [];
                    if (structure.PROGRAM_NAME) {
                        newStructure.PROGRAM_NAME = structure.PROGRAM_NAME;
                    } else {
                        newStructure = null;
                    }
                    break;
                case 'method':
                    if (structure.METHOD_NAME && structure.MODULE_PATH) {
                        newStructure.METHOD_NAME = structure.METHOD_NAME;
                        newStructure.MODULE_PATH = structure.MODULE_PATH;
                    } else {
                        newStructure = null;
                    }
                    break;
                case 'moudule':
                    if (structure.MODULE_PATH) {
                        newStructure.MODULE_PATH = structure.MODULE_PATH;
                    } else {
                        newStructure = null;
                    }
                    break;
                case 'object':
                    newStructure.MANDATORY_KEY_LIST = (structure.MANDATORY_KEY_LIST) ? structure.MANDATORY_KEY_LIST : [];
                    break;
                case 'number':
                case 'string':
                    break;
                default:
                    newStructure = null;
                    break;
            }
            return newStructure;
        } else {
            return null;
        }
    }

    function getPlugin(plugin) {
        if (plugin.PLUGIN_NAME && plugin.PLUGIN_PATH) {
            var newPlugin = {};
            newPlugin.PLUGIN_NAME = plugin.PLUGIN_NAME;
            newPlugin.PLUGIN_PATH = plugin.PLUGIN_PATH;
            newPlugin.DESCRIPTION = (plugin.DESCRIPTION) ? plugin.DESCRIPTION : '';
            newPlugin.DEPENDENCIES = (plugin.DEPENDENCIES) ? plugin.DESCRIPTION : [];
            return newPlugin;
        } else {
            return null;
        }
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
