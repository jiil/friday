var _ = require('underscore');
var express = require('express');
var app = express();
var pluginLoader = require('./pluginManager/pluginLoader.js');


pluginLoader.load(function(err, plugs) {
    'use strict';
    _.each(plugs.extensions['WAITER.ROUTER.GET#0'], function(extension, key) {
        app.get(key, extension.RESOURCE.module[extension.RESOURCE.getFunction]);
    });

    app.listen('8080');
});
