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
            generatePlugs
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
     * DEPENDENCIES: PLUGIN_NAME#PLUGIN_VERSION list
     * POINTS: POINT list
     * EXTENSIONS: EXTENSION list
     *
     * - POINT 구조는 다음과 같다.
     * NAME: string
     * VERSION: string [number]+(.[number]+)*
     * DESCRIPTION: string
     * ARGUMENTS: string
     * STRUCTURES: STRUCTURE list 
     *
     * - STRUCTURE 의 구조는 다음과 같다. 
     * NAME: string
     * TYPE: string string|number|object|module
     * MANDATORY_KEY_LIST : string list (use only for object)
     * MODULE_PATH: string (used only for module and method)
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
     *      plugins:
     *          PLUGIN_NAME:
     *              DESCRIPTION:
     *              DEPENDENCIES:
     *              PLUGIN_PATH:
     *      points:
     *          NAME#VERSION:
     *              PLUGIN_NAME:
     *              DESCRIPTION:
     *              ARGUMENTS:
     *              STRUCTURES:
     *                  - NAME:
     *                    TYPE:
     *                    option:
     *      extensions:
     *          POINT_NAME#VERSION:
     *              PLUGIN_NAME:
     *              EXTENSION_TYPE:
     *              DESCRIPTION:
     *              RESOURCES:
     * }
     *
     */

    
    function generatePlugs(yamls, callback){
        var plugs = {
            plugins: {},
            points: {},
            extensions: {},
        };
        var usablePlugins = _.filter(yamls, isPluginUsable);
        _.each(usablePlugins, function(plugin){
            plugs.plugins[plugin.PLUGIN_NAME] = {
                DESCRIPTON : (plugin.DESCRIPTION)? plugin.DESCRIPTION : "",
                DEPENDENCIES : (plugin.DEPENDENCIES)? plugin.DEPENDENCIES : [],
                PLUGIN_PATH : plugin.PLUGIN_PATH
            }

        });

        callback(null, plugs);
    }

    //check olny requirement not validate
    function isPluginUsable(yaml){
        if (typeof yaml.PLUGIN_PATH !== 'string') {
            console.log("PLUG ERROR : invalid format of PLUGIN_PATH");
            console.log(yaml);
            return false;
        }

        if (typeof yaml.PLUGIN_NAME !== 'string') {
            console.log("PLUG ERROR : invalid format of PLUGIN_NAME");
            console.log(yaml);
            return false;
        }

        if (yaml.DEPENDENCIES) {
            if (typeof yaml.DEPENDENCIES !== 'object' ||
                !_.isArray(yaml.DEPENDENCIES) ||
                !_.every(yaml.DEPENDENCIES, isDependencyUsable)
            ) {
                console.log("PLUG ERROR : invalid format of DEPENDENCIES");
                console.log(yaml);
                return false
            }
        }

        if (yaml.POINTS) {
            if (typeof yaml.POINTS !== 'object' ||
                !_.isArray(yaml.POINTS) ||
                !_.every(yaml.POINTS, isPointUsable)
            ) {
                console.log("PLUG ERROR : invalid format of POINTS");
                console.log(yaml);
                return false
            }
        }

        if (yaml.EXTENSIONS) {
            if (typeof yaml.EXTENSIONS !== 'object' ||
                !_.isArray(yaml.EXTENSIONS) ||
                !_.every(yaml.EXTENSIONS, isExtensionUsable)
            ) {
                console.log("PLUG ERROR : invalid format of EXTENSIONS");
                console.log(yaml);
                return false;
            }
        }

        return true;
    }

    function isDependencyUsable(dependency) {
        return (typeof dependency === 'string' &&
            dependency.match(/[^# \t]+#[0-9.]+/));
    }

    function isPointUsable(point) {
        if(typeof point.VERSION === 'number'){
            point.VERSION = "" + point.VERSION;
        }
        return (typeof point.NAME === 'string' &&
            typeof point.VERSION === 'string' &&
            point.VERSION.match(/^[0-9]+(\.[0-9]+)*$/) &&
            typeof point.STRUCTURES === 'object' &&
            _.isArray(point.STRUCTURES) &&
            _.every(point.STRUCTURES, isStructureUsable)
        )
    }

    function isStructureUsable(structure) {
        return (typeof structure.NAME === 'string' &&
            typeof structure.type === 'string')
    }

    function isExtensionUsable(extension) {
        if(typeof extension.POINT_VERSION === 'number'){
            extension.POINT_VERSION = "" + extension.POINT_VERSION;
        }
        return (typeof extension.POINT_NAME === 'string' &&
            typeof extension.POINT_VERSION === 'string' &&
            extension.POINT_VERSION.match(/^[0-9]+(\.[0-9]+)*$/) &&
            typeof extension.RESOURCES === 'object' &&
            _.isArray(extension.RESOURCES));
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
