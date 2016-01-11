var express = require('express'),
    sys = require('sys'),
    path = require('path'),
    fs = require('fs'),
    app = express(),
    helper = require('./helper.js'),
    formidable = require('formidable'),
    exec = require('child_process').exec, 
    util = require('util'),
    server = require('http').createServer(app);

 var cfg = {
 	tmpFolder: __dirname + '/tmp',
    mockUploadFolder: __dirname + '/upload/mock',
    mockDownloadFolder: __dirname + '/public/download/mock',
    markUploadFolder: __dirname + '/upload/mark',
    markDownloadFolder: __dirname + '/public/download/mark',
    acceptFileTypes: /.+/i,
    maxPostSize: 11000000000, // 11 GB
	accessControl: {
		allowOrigin: '*',
		allowMethods: 'GET, POST',
		allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
	}
 }

app.use(function(req, res, next){
	sys.print(' ' + req.method + ' ' + req.url + '\n');
	next();
});

app.use(express.compress());
app.use('/marksvg', express.bodyParser());

app.all(/^\/(mock|mark|marksvg)$/, function(req, res, next) {
    res.header("Access-Control-Allow-Origin", cfg.accessControl.allowOrigin);
    res.header("Access-Control-Allow-Methods", cfg.accessControl.allowMethods);
    res.header("Access-Control-Allow-Headers", cfg.accessControl.allowHeaders);
    if ('OPTIONS' == req.method) return res.send(200);
    next();
 });

app.post('/mock', function(req, res, next){
    handleUploadReqest(req, res, cfg.mockUploadFolder, function(io){
        var srcPath = io.input.srcPath;
        var randomName = io.input.tarname;
        var extname = io.input.extname;

        if(/\.(jpe?g|png)$/i.test(extname)) {
            io.input.counter += 1;
            var targetName = randomName + extname;
            var targetPath = cfg.mockDownloadFolder + '/' + targetName;
            var targetStream = fs.createWriteStream(targetPath);
            fs.createReadStream(srcPath).pipe(targetStream);
            io.output.url = targetName;
            var counter = io.input.counter -= 1;
            if(!counter) {
                res.send(io.output);
            }

        } else if(/\.(psd|gif)$/i.test(extname)) {
            io.input.counter += 1;

            var targetName = randomName + '.png';
            var targetPath = cfg.mockDownloadFolder + '/' + targetName;
            var cmd = 'convert "' + srcPath + '[0]" "' + targetPath +'"';
            exec(cmd, function (error, stdout, stderr) {
                if(error) {console.log(error)};   
                
                io.output.url = targetName;
                var counter = io.input.counter -= 1;
                if(!counter) {
                    res.send(io.output);
                }
                             
            });
        } else {
            io.output.url = null;
        }
    });
});

app.post('/mark', function(req, res, next){
    handleUploadReqest(req, res, cfg.markUploadFolder, function(io){
        var srcPath = io.input.srcPath;
        var randomName = io.input.tarname;
        var extname = io.input.extname;
        var barename = io.input.barename;

        if(/\.(jpe?g|png)$/i.test(extname)) {
            io.input.counter += 1;
            var targetName = randomName + extname;
            var targetPath = cfg.markDownloadFolder + '/' + targetName;
            var targetStream = fs.createWriteStream(targetPath);
            fs.createReadStream(srcPath).pipe(targetStream);
            io.output.url = targetName;
            var counter = io.input.counter -= 1;
            if(!counter) {
                res.send(io.output);
            }

        } else if(/\.(psd|gif)$/i.test(extname)) {
            io.input.counter += 1;

            var targetName = randomName + '.png';
            var targetPath = cfg.markDownloadFolder + '/' + targetName;
            var cmd = 'convert "' + srcPath + '[0]" "' + targetPath +'"';
            exec(cmd, function (error, stdout, stderr) {
                if(error) {console.log(error)};   
                
                io.output.url = targetName;
                var counter = io.input.counter -= 1;
                if(!counter) {
                    res.send(io.output);
                }
                             
            });
        } else {
            io.output.url = null;
        }
    });
});
app.post('/marksvg', function(req, res, next){
    var src = req.body.src, barename = src.replace(/\.(jpe?g|png)$/i, '');
    var svg = req.body.svg, name = req.body.name;
    var srcPath = __dirname + '/public/download/mark/' + src;
    var svgPath = __dirname + '/public/download/mark/svg/' + barename + '.svg';
    var tarPath = __dirname + '/public/download/mark/marked/' + name + '.png';
    fs.writeFile(svgPath, svg, 'utf8', function(err){
        var cmd = 'convert "' + srcPath +'" -background none "' + svgPath + '" -geometry +0+0 -composite "' + tarPath + '"';
        console.log(cmd);
        exec(cmd, function(err, stdout, stderr){
            res.download(tarPath);
        })
    });
});

function handleUploadReqest(req,res,uploadFolder, cb){
    var form = new formidable.IncomingForm();
    form.uploadDir = cfg.tmpFolder;
    var map = {},
        tmpFiles = [],
        processIO = {
            input: {
                counter:1,
                srcPath: '',
                extname: '',
                tarname: '',
                barename: ''
            },
            output: {}
        };
        _finish = function () {
            var counter = processIO.input.counter -= 1;
            if (!counter) {
                res.send(processIO.output);
            }
        };
    form.on('fileBegin', function(name, file){
        var fileInfo = new FileInfo(file);
        processIO.output.name = fileInfo.name.replace(/\.(jpe?g|png|psd|gif)$/i, '');
        fileInfo.safeName();
        map[path.basename(file.path)] = fileInfo;
        tmpFiles.push(file.path);
    }).on('file', function(name, file){
        var randomName = path.basename(file.path);
        var fileInfo = map[randomName];
        fileInfo.size = file.size;
        if(!fileInfo.validate()){
            try{fs.unlink(file.path)}catch(e){};
            return;
        }
        // Prevent overwriting existing files:
        while (fs.existsSync(uploadFolder + '/' + fileInfo.name)) {
            fileInfo.name = fileInfo.name.replace(FileInfo.nameCountRegexp, FileInfo.nameCountFunc);
        }
        // move file from tmp Folder to target Folder
        var uploadPath = uploadFolder + '/' + fileInfo.name;
        fs.renameSync(file.path, uploadPath);
        
        var extname = path.extname(fileInfo.name);

        processIO.input.srcPath = uploadPath;
        processIO.input.tarname = randomName;
        processIO.input.extname = extname;
        cb && cb(processIO);

    }).on('aborted', function () {
        tmpFiles.forEach(function (file) {
            fs.unlink(file);
        });
    }).on('error', function (e) {
        console.log(e);
    }).on('progress', function (bytesReceived, bytesExpected) {
        if (bytesReceived > cfg.maxPostSize) {
            req.connection.destroy();
        }
    }).on('end', _finish).parse(req);
    return;
}

function FileInfo(file) {
    this.name = file.name;
    this.size = file.size;
    this.type = file.type;
};
FileInfo.nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/;
FileInfo.nameCountFunc = function (s, index, ext) {
    return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
};
FileInfo.prototype.safeName = function () {
    // Prevent directory traversal and creating hidden system files:
    this.name = path.basename(this.name).replace(/^\.+/, '');
    // Prevent overwriting existing files:
    while (fs.existsSync(cfg.tmpFolder + '/' + this.name)) {
        this.name = this.name.replace(FileInfo.nameCountRegexp, FileInfo.nameCountFunc);
    }
};
FileInfo.prototype.validate = function () {
    if (cfg.minFileSize && cfg.minFileSize > this.size) {
        this.error = 'File is too small';
    } else if (cfg.maxFileSize && cfg.maxFileSize < this.size) {
        this.error = 'File is too big';
    } else if (!cfg.acceptFileTypes.test(this.name)) {
        this.error = 'Filetype not allowed';
    }
    return !this.error;
};

(function(port){
  server.listen(port, function(){
    console.log('app init...');
    helper.showURL(port);    	
  })
})(3003);