var Async = require('async');
var pluginManager = require('./pluginManager/pluginLoader.js');
var dnode = require('dnode');

var server = null;
Async.waterfall([
    Async.apply(pluginManager.load),
    function(plugins, cb) {
        'use strict';

	var eventTypes = plugins.extensions['serverEvent#0'];
        server = dnode({
		event : function (serverId, eventName, eventOptions, callback){
			if(eventTypes && eventTypes[eventName]){
				eventTypes[eventName].event(serverId, eventOptions, plugins);
				callback(null);
			}else{
				callback(new Error('there is no event as :' + eventName));
			}
			
		}
        });
	cb(null);
    }
], function(err) {
    if (err) {
        console.log(err);
    }
});

server.listen(5004);

function emit (eventName, eventOptions){
        'use strict';
	var d =	dnode.connect(5004);
	d.on('remote',function(remote){
		remote.event(,eventName,eventOptions,function(err){
		});
	});
}
