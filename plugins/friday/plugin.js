var PluginManager = require('../../pluginManager/pluginLoader.js');

module.exports.get = function(req, res) {
	PluginManager.load(function(err, plugins){
    res.send(plugins);
	});
};

module.exports.getHello = function(req, res) {
    res.send("hello how are you");
};
