var os = require("os");

exports.showURL = function(port){
	var interfaces = os.networkInterfaces();
	for (var k in interfaces) {
	    for (var k2 in interfaces[k]) {
	        var address = interfaces[k][k2];
	        if (address.family == 'IPv4' && !address.internal) {
	        	if(port) {
	            	console.log('%s:%s', address.address, port);
	        	} else {
	        		console.log(address.address);
	        	}
	        }
	    }
	}
};
