var express = require('express'),
    sys = require('sys'),
    app = express(),
    helper = require('./helper.js'),
    server = require('http').createServer(app);

 var cfg = {
  uploadRoot: __dirname + '/public/upload',
  accessControl: {
    allowOrigin: '*',
    allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
    allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
  }
 };

app.use(function(req, res, next){
	sys.print(' ' + req.method + ' ' + req.url + '\n');
	next();
});

app.use(express.compress());
app.use(express.bodyParser());

// app.use(function(req, res, next){
//     res.setHeader(
//         'Access-Control-Allow-Origin',
//         cfg.accessControl.allowOrigin
//     );
//     res.setHeader(
//         'Access-Control-Allow-Methods',
//         cfg.accessControl.allowMethods
//     );
//     res.setHeader(
//         'Access-Control-Allow-Headers',
//         cfg.accessControl.allowHeaders
//     );
//     next();
// });

app.get('/', function(req,res){
    res.setHeader(
        'Access-Control-Allow-Origin',
        cfg.accessControl.allowOrigin
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        cfg.accessControl.allowMethods
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        cfg.accessControl.allowHeaders
    );
    console.log('ok');
    res.sendfile(__dirname + '/public/index.html');
})

app.use(express.static(__dirname + '/public'));

app.get('/favicon.ico', function(req, res) {
    res.sendfile(__dirname + '/public/img/favicon.ico');
});


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


(function(port){
  server.listen(port, function(){
    console.log('app init...');
    helper.showURL(port);    	
  })
})(3000);



