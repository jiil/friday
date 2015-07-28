var fs = require('fs');
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
            generatePlugs,
            setupPlugins,
            setupExtensions
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
     * plugin dir
     * /-
     *   - *.plugin.yaml
     *   - plugin.js
     *
     * - PLUGIN 구조는 다음과 같다.
     * PLUGIN_NAME: string
     * DESCRIPTION: string
     * DEPENDENCIES: PLUGIN_NAME
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
     * TYPE: string boolean|string|number|object|function
     *
     * - EXTENSION 의 구조는 다음과 같다.
     * POINT_NAME: string
     * POINT_VERSION: string [number][number]*(.[number][number]*)*
     * EXTENSION_TYPE: string
     * DESCRIPTION: string
     * RESOURCE: RESOURCE object
     *
     * - RESOURCE that defined from STRUCTURES
     *
     * - in memory structure
     * {
     *      plugins:
     *          PLUGIN_NAME:
     *              DESCRIPTION:
     *              MODULE:
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
     *      extensions:
     *          POINT_NAME#POINT_VERSION:
     *              EXTENSION_TYPE:
     *                  PLUGIN_NAME:
     *                  DESCRIPTION:
     *                  RESOURCE:
     * }
     *
     */

    function generatePlugs(yamls, callback) {
        var plugs = {
            plugins: {},
            points: {},
            extensions: {},
        };
        var usablePlugins = _.filter(yamls, isPluginUsable);

        // set plugin
        _.each(usablePlugins, function(plugin) {
            // set plugins
            plugs.plugins[plugin.PLUGIN_NAME] = {
                DESCRIPTION: (plugin.DESCRIPTION) ? plugin.DESCRIPTION : '',
                DEPENDENCIES: (plugin.DEPENDENCIES) ? plugin.DEPENDENCIES : [],
                PLUGIN_PATH: plugin.PLUGIN_PATH
            };

            // set points
            _.each(plugin.POINTS, function(point) {
                var pointIdx = point.NAME + '#' + point.VERSION;
                plugs.points[pointIdx] = {
                    PLUGIN_NAME: plugin.PLUGIN_NAME,
                    DESCRIPTION: (point.DESCRIPTION) ? point.DESCRIPTION : '',
                    ARGUMENTS: (point.ARGUMENTS) ? point.ARGUMENTS : '',
                    STRUCTURES: point.STRUCTURES
                };
            });

            // set extensions
            _.each(plugin.EXTENSIONS, function(extension) {
                var pointIdx = extension.POINT_NAME + '#' + extension.POINT_VERSION;
                if (!plugs.extensions[pointIdx]) {
                    plugs.extensions[pointIdx] = {};
                }

                if (plugs.extensions[pointIdx][extension.EXTENSION_TYPE]) {
                    console.log('PLUG ERROR : ' + pointIdx + '.' + extension.EXTENSION_TYPE + 'is overwrited!');
                    console.log(plugs.extensions[pointIdx][extension.EXTENSION_TYPE]);
                }

                plugs.extensions[pointIdx][extension.EXTENSION_TYPE] = {
                    PLUGIN_NAME: plugin.PLUGIN_NAME,
                    DESCRIPTION: (extension.DESCRIPTION) ? extension.DESCRIPTION : '',
                    RESOURCE: extension.RESOURCE
                };
            });
        });

        callback(null, plugs);
    }

    //check olny requirement not validate
    function isPluginUsable(yaml) {

        // plugin path check 
        if (typeof yaml.PLUGIN_PATH !== 'string') {
            console.log('PLUG ERROR : invalid format of PLUGIN_PATH');
            console.log(yaml);
            return false;
        }

        // plugin name check
        if (typeof yaml.PLUGIN_NAME !== 'string' || !isValidKey(yaml.PLUGIN_NAME)) {
            console.log('PLUG ERROR : PLUGIN_NAME type format is invalid. NAME format is => /[a-zA-Z0-9._-]+/ see :' + yaml.PLUGIN_PATH);
            console.log(yaml.PLUGIN_NAME);
            return false;
        }

        // plugin dependencies check
        if (yaml.DEPENDENCIES) {
            if (typeof yaml.DEPENDENCIES !== 'object' ||
                !_.isArray(yaml.DEPENDENCIES)
            ) {
                console.log('PLUG ERROR : DEPENDENCIES must be dependency list. see :' + yaml.PLUGIN_PATH);
                console.log(yaml.DEPENDENCIES);
                return false;
            }
            if (!_.every(yaml.DEPENDENCIES, isDependencyUsable)) {
                console.log('PLUG ERROR : dependency of DEPENDENCIES is invalid. see :' + yaml.PLUGIN_PATH);
                return false;
            }
        }

        // plugin points check
        if (yaml.POINTS) {
            if (typeof yaml.POINTS !== 'object' ||
                !_.isArray(yaml.POINTS)
            ) {
                console.log('PLUG ERROR : POINTS must be potnt list. see :' + yaml.PLUGIN_PATH);
                return false;
            }
            if (!_.every(yaml.POINTS, isPointUsable)) {
                console.log('PLUG ERROR : point of POINTS is invalid. see :' + yaml.PLUGIN_PATH);
                return false;
            }
        }

        // plugin extensions check
        if (yaml.EXTENSIONS) {
            if (typeof yaml.EXTENSIONS !== 'object' ||
                !_.isArray(yaml.EXTENSIONS)
            ) {
                console.log('PLUG ERROR : EXTENSIONS must be extension list. sed :' + yaml.PLUGIN_PATH);
                console.log(yaml.EXTENSIONS);
                return false;
            }
            if (!_.every(yaml.EXTENSIONS, isExtensionUsable)) {
                console.log('PLUG ERROR : extension of EXTENSIONS is invalid. see :' + yaml.PLUGIN_PATH);
                return false;
            }
        }

        return true;
    }

    function isDependencyUsable(dependency) {

        // dependency check
        if (typeof dependency !== 'string' ||
            !dependency.match(/^[^# \t\n]+$/)
        ) {
            console.log('dependency format is invalid. dependency does not include white space');
            console.log(dependency);
            return false;
        }

        return true;
    }

    function isPointUsable(point) {

        //name check 
        if (typeof point.NAME !== 'string' || !isValidKey(point.NAME)) {
            console.log('point NAME format is invalid. NAME format is => /[a-zA-Z0-9._-]+');
            console.log(point.NAME);
            return false;
        }

        //version check
        if (typeof point.VERSION === 'number') {
            point.VERSION = '' + point.VERSION;
        }

        if (typeof point.VERSION !== 'string' ||
            !point.VERSION.match(/^[0-9]+(\.[0-9]+)*$/)
        ) {
            console.log('point VERSION format is invalid. VERSION format is => /^[0-9]+(\\.[0-9]+)*$/');
            console.log(point.VERSION);
            return false;
        }

        //structures check
        if (typeof point.STRUCTURES !== 'object' ||
            !_.isArray(point.STRUCTURES)
        ) {
            console.log('point STRUCTURES is not structure list.');
            console.log(point.STRUCTURES);
            return false;
        }

        if (!_.every(point.STRUCTURES, isStructureUsable)) {
            console.log('structure of STRUCTURES is invalid formatted.');
            console.log(point.STRUCTURES);
            return false;
        }

        return true;
    }

    function isStructureUsable(structure) {

        // structure name check
        if (typeof structure.NAME !== 'string' || !isValidKey(structure.NAME)) {
            console.log('structure NAME format is invalid. NAME format is => /[a-zA-Z0-9._-]+');
            console.log(structure.NAME);
            return false;
        }

        // structure type check
        if (typeof structure.TYPE !== 'string' || _.indexOf(['string', 'boolean', 'number', 'object', 'function'], structure.TYPE) === -1) {
            console.log('structure TYPE can be \'string\' or \'boolean\' or \'number\' or \'object\' or \'function\'.');
            console.log(structure.TYPE);
            return false;
        }

        return true;
    }

    function isExtensionUsable(extension) {

        //extension point name check 
        if (typeof extension.POINT_NAME !== 'string' || !isValidKey(extension.POINT_NAME)) {
            console.log('extension POINT_NAME format is invalid. POINT_NAME format is => /[a-zA-Z0-9._-]+');
            console.log(extension.POINT_NAME);
            return false;
        }

        if (typeof extension.POINT_VERSION === 'number') {
            extension.POINT_VERSION = '' + extension.POINT_VERSION;
        }

        //extension point version check 
        if (typeof extension.POINT_VERSION !== 'string' ||
            !extension.POINT_VERSION.match(/^[0-9]+(\.[0-9]+)*$/)
        ) {
            console.log('extension POINT_VERSION format is invalid. POINT_VERSION format is => /^[0-9]+(\\.[0-9]+)*$/');
            console.log(extension.POINT_VERSION);
            return false;
        }

        if (typeof extension.RESOURCE !== 'object') {
            console.log('extension RESOURCE is must be object.');
            console.log(extension.RESOURCE);
            return false;
        }

        return true;
    }

    function isValidKey(string) {
        return string.match(/^[a-zA-Z0-9._-]+$/);
    }

    /**
     * setup plugins 
     */
    function setupPlugins(plugs, callback){
        Async.forEachOf(plugs.plugins, function(plugin, name, fcb){
            var modulePath = Path.join(Path.dirname(plugin.PLUGIN_PATH), 'plugin.js');
            fs.exists(modulePath, function(exist){
                if(exist){
                    var newModule = null;
                    try{
                        newModule = require(modulePath);
                        plugs.plugins[name].MODULE = newModule;
                    }catch(e){
                        console.log('Can\'t read '+ name + ' plugin module : ' + modulePath);
                        console.log(e);
                        newModule = null;
                        plugs.plugins[name].MODULE = newModule;
                    }
                }else{
                    plugs.plugins[name].MODULE = null;
                }
                fcb(null);
            });
        },function(err){
            callback(err, plugs);
        });
    }

    /** 
     * setup extension resources
     */
    function setupExtensions(plugs, callback) {
        var newExtensions = {};
        var pointNameList = _.keys(plugs.points);

        _.each(pointNameList, function(pointName){
            var extensionTypeNameList = _.keys(plugs.extensions[pointName]);
            _.each(extensionTypeNameList, function(typeName){
                var newResource = getValidExtension(plugs.points[pointName].STRUCTURES, plugs.extensions[pointName][typeName].RESOURCE, plugs.plugins[plugs.extensions[pointName][typeName].PLUGIN_NAME]);
                if (!newExtensions[pointName]) {
                    newExtensions[pointName] = {};
                }
                newExtensions[pointName][typeName] = {
                    PLUGIN_NAME: plugs.extensions[pointName][typeName].PLUGIN_NAME,
                    DESCRIPTION: plugs.extensions[pointName][typeName].DESCRIPTION,
                    RESOURCE: newResource
                };
            });
        });

        plugs.extensions = newExtensions;
        callback(null, plugs);
    }

    function getValidExtension(resourceStructures, resource, plugin) {
        var newResource = {};
        var allPassed = _.every(resourceStructures, function(structure){
            switch (structure.TYPE) {
                case 'string':
                case 'boolean':
                case 'number':
                case 'object':
                    if (typeof resource[structure.NAME] !== structure.TYPE) {
                        console.log(structure.NAME + ' is not (a/an) ' + structure.TYPE);
                    } else {
                        newResource[structure.NAME] = resource[structure.NAME];
                        return true;
                    }
                    break;
                case 'function':
                    if (typeof resource[structure.NAME] === 'string') {
                        if(plugin.MODULE){
                            if(typeof plugin.MODULE[resource[structure.NAME]] === 'function'){
                                newResource[structure.NAME] = plugin.MODULE[resource[structure.NAME]];
                                return true;
                            }else{
                                console.log('plugin has no function name ' + resource[structure.NAME]);
                            }
                        }else{
                            console.log('plugin has no module');
                        }
                    } else {
                        console.log(structure.NAME + ' is not a function name format: ' + resource[structure.NAME]);
                    }
                    break;
                default:
                        console.log('Not support ' + structure.NAME + ' of structure type as ' + structure.TYPE);
                    break;
            }
            return false
        });

        if(allPassed){
            return newResource;
        }else{
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
