var Fs = require('fs');
var Async = require('async');
var Path = require('path');
var _ = require('underscore');
var Yaml = require('js-yaml');

/**
 * @class Utils
 */
(function() {
    'use strict';
    var utils = {};
    var root = this;

    utils.mkdirFP = mkdirFP;

    /**
     * Description
     * @method mkdirFP 
     * @param {string} path
     * @param {callback(err)} callback
     * @return fucntion(err)
     */
    function mkdirFP(path, callback) {
        var dirname = Path.dirname(path);
        Fs.exists(dirname, function(exists) {
            if (exists) {
                mkdirF(path, callback);
            } else {
                Async.series([
                    Async.apply(mkdirFP, dirname),
                    Async.apply(mkdirF, path),
                ], callback);
            }
        });
    }

    utils.mkdirF = mkdirF;

    /**
     * Description
     * @method mkdirF
     * @param {} path
     * @param {} callback
     * @return 
     */
    function mkdirF(path, callback) {
        Fs.exists(path, function(exists) {
            if (exists) {
                Fs.stat(path, function(err, stat) {
                    if (err) {
                        callback(err);
                    } else if (stat.isDirectory()) {
                        callback(null);
                    } else {
                        Async.series([
                            Async.apply(Fs.unlink, path),
                            Async.apply(Fs.mkdir, path)
                        ], callback);
                    }
                });
            } else {
                Fs.mkdir(path, callback);
            }
        });
    }
    

    utils.readdirR = readdirR;

    /**
     * Description
     * @method readdirR
     * @param {} path
     * @param {} callback
     * @return 
     */
    function readdirR(path, callback){
        Async.waterfall([
                Async.apply(Fs.readdir, path),
                function(dirs, cb){
                    Async.map(dirs, function(dir, mcb){
                        Fs.stat(Path.join(path, dir), function(err, stat){
                            if(stat.isDirectory()){
                                readdirR(Path.join(path, dir), function(err, sdirs){
                                    mcb(err, _.map(sdirs, function(sdir){ return Path.join(dir, sdir)}));
                                });
                            }
                            else{
                                mcb(null, dir);
                            }
                        });
                    }, cb);
                }
                ], function(err, dirs){
                    if(err){
                        callback(err, null);
                    }
                    else{
                        callback(err, _.flatten(dirs));
                    }
                });
    }

    utils.readYaml = readYaml;

    /**
     * Description
     * @method readYaml
     * @param {} path
     * @param {} callback
     * @return 
     */
    function readYaml(path, callback) {
        Async.waterfall([
            Async.apply(Fs.readFile, path, 'utf8'),
            function(data, cb) {
                try {
                    var obj = Yaml.safeLoad(data);
                    cb(null, obj);
                } catch (e) {
                    cb(e, null);
                }
            }
        ], callback);
    }

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = utils;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function() {
            return utils;
        });
    }
    // included directly via <script> tag
    else {
        root.utils = utils;
    }

}());
