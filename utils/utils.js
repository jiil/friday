var Fs = require('fs');
var Async = require('async');
var Path = require('path');

(function() {
    'use strict';
    var utils = {};
    var root = this;

    utils.mkdirfp = mkdirfp;

    function mkdirfp(path, callback) {
        var dirname = Path.dirname(path);
        Fs.exists(dirname, function(exists) {
            if (exists) {
                mkdirf(path, callback);
            } else {
                mkdirfp(dirname, function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        mkdirf(path, callback);
                    }
                });
            }
        });
    }

    utils.mkdirf = mkdirfp;

    function mkdirf(path, callback) {
        Fs.exists(path, function(exists) {
            if (exists) {
                Fs.stat(path, function(err, status) {
                    if (status.isDirectory()) {
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
