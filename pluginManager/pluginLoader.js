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
     * TYPE: string boolean|string|number|object|module
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
     *      extensions:
     *          POINT_NAME#POINT_VERSION:
     *              EXTENSION_TYPE:
     *                  PLUGIN_NAME:
     *                  DESCRIPTION:
     *                  RESOURCES:
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

        // set plugin
        _.each(usablePlugins, function(plugin){
            // set plugins
            plugs.plugins[plugin.PLUGIN_NAME] = {
                DESCRIPTION : (plugin.DESCRIPTION)? plugin.DESCRIPTION : '',
                DEPENDENCIES : (plugin.DEPENDENCIES)? plugin.DEPENDENCIES : [],
                PLUGIN_PATH : plugin.PLUGIN_PATH
            }

            // set points
            _.each(plugin.POINTS, function(point){
                var pointIdx = point.NAME + '#' + point.VERSION;
                if (!plugs.points[pointIdx]){ 
                    plugs.points[pointIdx] = [];
                }
                plugs.points[pointIdx].push( { 
                    PLUGIN_NAME : plugin.PLUGIN_NAME,
                    DESCRIPTION : (point.DESCRIPTION)? point.DESCRIPTION : '',
                    ARGUMENTS : (point.ARGUMENTS)? point.ARGUMENTS : '',
                    STRUCTURES : point.STRUCTURES
                });
            });

            // set extensions
            _.each(plugin.EXTENSIONS, function(extension){
                var pointIdx = extension.POINT_NAME + '#' + extension.POINT_VERSION;
                if (!plugs.extensions[pointIdx]){ 
                    plugs.extensions[pointIdx] = {};
                }

                if (plugs.extensions[pointIdx][extension.EXTENSION_TYPE]){
                    console.log('PLUG ERROR : '+ pointIdx + '.' + extension.EXTENSION_TYPE + 'is overwrited!');
                    console.log(plugs.extensions[pointIdx][extension.EXTENSION_TYPE]);
                }

                plugs.extensions[pointIdx][extension.EXTENSION_TYPE] = { 
                    PLUGIN_NAME : plugin.PLUGIN_NAME,
                    DESCRIPTION : (extension.DESCRIPTION)? extension.DESCRIPTION : '',
                    RESOURCES : extension.RESOURCES
                };
            });
        });

        callback(null, plugs);
    }

    //check olny requirement not validate
    function isPluginUsable(yaml){

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
                return false
            }
            if ( !_.every(yaml.DEPENDENCIES, isDependencyUsable)){
                console.log('PLUG ERROR : dependency of DEPENDENCIES is invalid. see :' + yaml.PLUGIN_PATH);
                return false
            }
        }

        // plugin points check
        if (yaml.POINTS) {
            if (typeof yaml.POINTS !== 'object' ||
                !_.isArray(yaml.POINTS)
            ) {
                console.log('PLUG ERROR : POINTS must be potnt list. see :' + yaml.PLUGIN_PATH);
                return false
            }
            if ( !_.every(yaml.POINTS, isPointUsable)){
                console.log('PLUG ERROR : point of POINTS is invalid. see :' + yaml.PLUGIN_PATH);
                return false
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
            if ( !_.every(yaml.EXTENSIONS, isExtensionUsable)){
                console.log('PLUG ERROR : extension of EXTENSIONS is invalid. see :' + yaml.PLUGIN_PATH);
                return false
            }
        }

        return true;
    }

    function isDependencyUsable(dependency) {

        // dependency check
        if (typeof dependency !== 'string' ||
            !dependency.match(/^[^# \t]+#[0-9]+(\.[0-9]+)*$/)
        ) {
            console.log('dependency format is invalid. dependency format is => /^PLUGIN_NAME#PLUGIN_VERSION$/');
            console.log(dependency);
            return false;
        }

        return true
    }

    function isPointUsable(point) {

        //name check 
        if(typeof point.NAME !== 'string' || !isValidKey(point.NAME)){
            console.log('point NAME format is invalid. NAME format is => /[a-zA-Z0-9._-]+');
            console.log(point.NAME);
            return false;
        }

        //version check
        if(typeof point.VERSION === 'number'){
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

        if ( !_.every(point.STRUCTURES, isStructureUsable)){
            console.log('structure of STRUCTURES is invalid formatted.');
            console.log(point.STRUCTURES);
            return false;
        }

        return true;
    }

    function isStructureUsable(structure) {

        // structure name check
        if (typeof structure.NAME !== 'string' || !isValidKey(structure.NAME)){
            console.log('structure NAME format is invalid. NAME format is => /[a-zA-Z0-9._-]+');
            console.log(structure.NAME);
            return false;
        }

        // structure type check
        if (typeof structure.TYPE !== 'string' || _.indexOf(['string', 'boolean', 'number', 'object', 'module'],structure.TYPE) === -1){
            console.log('structure TYPE can be \'string\' or \'boolean\' or \'number\' or \'object\' or \'module\'.');
            console.log(structure.TYPE);
            return false;
        }

        return true;
    }

    function isExtensionUsable(extension) {

        //extension point name check 
        if(typeof extension.POINT_NAME !== 'string' || !isValidKey(extension.POINT_NAME)){
            console.log('extension POINT_NAME format is invalid. POINT_NAME format is => /[a-zA-Z0-9._-]+');
            console.log(extension.POINT_NAME);
            return false;
        }

        if(typeof extension.POINT_VERSION === 'number'){
            extension.POINT_VERSION = '' + extension.POINT_VERSION;
        }

        //extension point version check 
        if ( typeof extension.POINT_VERSION !== 'string' ||
            !extension.POINT_VERSION.match(/^[0-9]+(\.[0-9]+)*$/)
        ) {
            console.log('extension POINT_VERSION format is invalid. POINT_VERSION format is => /^[0-9]+(\\.[0-9]+)*$/');
            console.log(extension.POINT_VERSION);
            return false;
        }

        if (typeof extension.RESOURCES !== 'object' ||
            !_.isArray(extension.RESOURCES)
        ) {
            console.log('extension RESOURCES is not resource list.');
            console.log(extension.RESOURCES);
            return false;
        }

        return true;
    }

    function isValidKey(string){
        return string.match(/^[a-zA-Z0-9._-]+$/)
    }

    /** 
     * setup extension resources
     */
    function setupExtensions(plugs, callback){
        var invalidList = {};
        var pointNameList = _.keys(plugs.points);
        _.each(pointNameList, function(pointName){
            _.each(plugs.extensions[pointName], function(extension, key){
                _.each(plugs.points[pointName].STRUCTURES, function(structure){
                    switch(structure.TYPE){
                        case 'string':
                        case 'boolean':
                        case 'number':
                        case 'object':
                            if( typeof extension.RESOURCES[structure.NAME] !== structure.TYPE){
                                console.log('PLUG ERROR : extension of '+ pointName + ' is invalid. see : ' + plugs.plugins[extension.PLUGIN_NAME].PLUGIN_PATH);
                                console.log('resource ' + structure.NAME + ' type must be ' + structure.TYPE);
                                if(invalidList[pointName]){
                                    invalidList[pointName].push(key);
                                }else{
                                    invalidList[pointName] = [key];
                                }
                            }
                            break;
                        case 'module':
                            if( typeof extension.RESOURCES[structure.NAME] !== 'string'){
                                //error 
                            }
                            //make path list
                            //filter exist path
                            // if path exist -> require('path')
                            // else error
                            break;
                        default:
                                console.log('PLUG ERROR : extension of '+ pointName + ' is invalid. see : ' + plugs.plugins[extension.PLUGIN_NAME].PLUGIN_PATH);
                                console.log('resource ' + structure.NAME + ' type unknown : ' + structure.TYPE);
                                if(invalidList[pointName]){
                                    invalidList[pointName].push(key);
                                }else{
                                    invalidList[pointName] = [key];
                                }
                            break;
                    }
                });
            });
        });
        console.log(pointNameList);
        callback(null, plugs);
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
