var _ = require('underscore');
var express = require('express');
var app = express();
var pluginLoader = require('./pluginManager/pluginLoader.js');


pluginLoader.load(function(err, plugs) {

    app.get('/plugins',function(req, res){
        res.json(plugs);
    });

    _.each(plugs.extensions['WAITER.ROUTER.GET#0'], function(extension, route) {
        app.get(route, extension.RESOURCE.getFunction);
    });

    app.listen('8080');
});

