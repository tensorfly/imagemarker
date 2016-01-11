var controls = $(".controls"), img = new Image();
var scene = $(".scene"), 
	dropbox = $('<div></div>').addClass("dropbox").html('<span>拖拽jpg/png/psd文件到此区域</span>'),
	sceneInner = $('<div></div>').addClass("scene-inner hide");
var cvs = $('<canvas></canvas>').appendTo(sceneInner), ctx = cvs[0].getContext("2d"),
	marker_layer = R(sceneInner[0]), marker_layer_svg = $(marker_layer.canvas).addClass('marker_layer'), 
	shadow_layer = $('<div></div>').addClass('shadow-layer').appendTo(sceneInner),
	input_layer = $('<div></div>').addClass('input-layer').appendTo(sceneInner),
	cover= $('<div></div>').addClass('cover').appendTo(sceneInner);

var trace = {
	firstLoad: true,
	mode: null,
	compass: null,
	imgsrc: '',
	imgname: 'download',
};

var stat = {
	imgW: 600,
	imgH: 400,
	moveX: 0,
	moveY: 0,
	scale: 1.0
};

var mark = {}, events_pool = {}, objs = [], shadows = [];

var name2dom = {
	canvas: sceneInner,
	scene: scene
};

var name2evts = {
	canvas: ['mousedown', 'mousemove'],
	scene: ['mousedown', 'mousemove', 'mouseup'] 
};


mark = (function(){
	var _switchMode = function(mode,cb){ 
		mode = trace.mode = mode && parseInt(mode);
		if(!mode) {controls.find('.tool-btn').removeClass('tool-btn-current'); return};
		controls.find('.tool-btn').each(function(_, item){
			var btn = $(item);
			var _mode = parseInt(btn.attr("mode"));

			if(_mode == mode) {
				btn.addClass('tool-btn-current');
			} else {
				btn.removeClass('tool-btn-current');
			}
			cb && cb(events_pool[mode]);
		});
			
		switch(mode) {
		case SELECT_MODE:
			shadow_layer.css({zIndex: 400}).addClass('shadow-layer-select-mode');
			cover.css({zIndex: 300});
			return;
		}
		shadow_layer.css({zIndex: 300}).removeClass('shadow-layer-select-mode');
		cover.css({zIndex: 400});
		return;
	};
	var _tmpSwitchMode = (function(){ 
		var prevMode = trace.mode;
		return function(mode) {
			if(mode == 'back') {
				_switchMode(prevMode);
			} else {
				prevMode = trace.mode;
				_switchMode(mode);				
			}
		}
	})()


	var _ajustScene = function(){
		var W = window.innerWidth, H = window.innerHeight;
		if($.contains(scene[0], dropbox[0])) {
			var boxW = cfg.dropbox_width, boxH = cfg.dropbox_height;
			dropbox.css({
				left: (W - boxW + cfg.leftbar_width)/2 + 'px', top: (H - boxH)/2 + 'px'
			});		
		}
		if($.contains(scene[0], sceneInner[0])) {
			var w = stat.imgW, h = stat.imgH;
			sceneInner.css({
				left: (W - w + cfg.leftbar_width)/2 + 'px',
				top: (H - h + cfg.topbar_height)/2 + 'px'
			});	
		};
	};
	var _transformCanvas = function(opt){
		var opt = opt || {};
		(opt.x != null) && (stat.moveX = opt.x);		
		(opt.y != null) && (stat.moveY = opt.y);
		opt.s && (stat.scale = opt.s);
		if(stat.scale>cfg.max_cvs_scale) {stat.scale = cfg.max_cvs_scale}	
		if(stat.scale<cfg.min_cvs_scale) {stat.scale = cfg.min_cvs_scale}	
		sceneInner.css({
			'-webkit-transform': 'translate(' + stat.moveX + 'px, ' + stat.moveY +'px) scale(' + stat.scale + ')' 
		});	
	};
	var _hack4svgBlur = (function(){ 
		var id = null;
		return function(){
			clearTimeout(id);
			id = setTimeout(function(){
				var z = cover[0].style.zIndex;
				cover[0].style.zIndex -= 101;
				cover.offset();
				cover[0].style.zIndex = z;			
			}, 1000);
		};
	})();
	var _scaleCanvas = function(scale){
		_transformCanvas({s: scale});
		_hack4svgBlur();
	};
	var _refreshCanvas = function(img){
		var w = stat.imgW = img.width; var h = stat.imgH = img.height;
		var W = window.innerWidth, H = window.innerHeight;
		var bareW = W - cfg.leftbar_width, bareH = H - cfg.topbar_height, bareRatio = bareW/bareH;
		if(bareRatio<w/h) {
			var scale =cfg.best_scale = bareW * cfg.init_cvs_area/w;
		} else {
			var scale =cfg.best_scale = bareH * cfg.init_cvs_area/h;
		}
		if(cfg.min_cvs_scale>scale){cfg.min_cvs_scale = scale}
		if(cfg.max_cvs_scale<scale){cfg.max_cvs_scale = scale}

		//$(marker_layer.canvas).empty();
		marker_layer && marker_layer.remove();
		marker_layer = R(sceneInner[0]);

		sceneInner.css({width: w + 'px', height: h + 'px'});
		_transformCanvas({x: 0, y: 0, s: scale});
		cvs.attr({width: w, height: h }).css({width: w + 'px', height: h + 'px'});
		$(marker_layer.setSize(w, h).canvas).css({width: w + 'px', height: h + 'px', zIndex: 100});
		input_layer.addClass('selectable').css({width: w + 'px', height: h + 'px', zIndex: 200});
		shadow_layer.css({width: w + 'px', height: h + 'px', zIndex: 300 });
		cover.css({width: w + 'px', height: h + 'px', zIndex: 400 });
		ctx.drawImage(img, 0,0, w, h);

		shadows.length = objs.length = 0;
		$(shadow_layer).empty();
		$(input_layer).empty();
		for(var key in events_pool) {var m = events_pool[key]; m.newElm = null;}
	};

	var _formalize = function(root){
		for(var key in events_pool) {
			var m = events_pool[key];
			if(m.newElm) {
				m.newElm.rephase('formal', root);
				objs.push(m.newElm);
				shadows.push(m.newElm.shadow[0]);
				m.newElm = null;
			}
		}
	};
	var _getColor = function(x, y) {
		var rgba = ctx.getImageData(x, y, 1, 1).data;
		var r = rgba[0], g = rgba[1], b=rgba[2], a=rgba[3];
        var _r = ("0" + r.toString(16)).slice(-2), 
            _g = ("0" + g.toString(16)).slice(-2),
            _b = ("0" + b.toString(16)).slice(-2);
        return "#" + _r + _g + _b;
    };
    var _removeObj = function(obj) {
		var idx = objs.indexOf(obj);
		var shadow = (idx!=-1) && shadows[idx];
		obj.marker && obj.marker.remove();
		obj.input && obj.input.remove();
		shadow && shadow.remove();
		(idx!=-1) && objs.splice(idx,1);
		(idx!=-1) && shadows.splice(idx,1);
		return true;   	
    };
	return {
		ajustScene: _ajustScene,
		transformCanvas: _transformCanvas,
		scaleCanvas: _scaleCanvas,
		refreshCanvas: _refreshCanvas,
		switchMode: _switchMode,
		tmpSwitchMode: _tmpSwitchMode,
		formalize: _formalize,
		getColor: _getColor,
		removeObj: _removeObj
	}
})();

//var RULER_MODE = 1, COLOR_MODE = 2, POINT_MODE = 3, TEXT_MODE = 4, SELECT_MODE = 5;
events_pool = {
	1: {
		newElm: null,
		canvas: {			
			x0: 0, y0: 0, x: 0, y: 0,
			mousedown: function(e){
				var root = events_pool[RULER_MODE];
				if(!root.newElm) {
					e.stopPropagation();
					var x0 = this.x0 = e.offsetX, y0 = this.y0 = e.offsetY;
					root.newElm = new OBJ.ruler(x0,y0,x0,y0, marker_layer, shadow_layer);
				}
			},
			mousemove: function(e){
				var root = events_pool[RULER_MODE];
				var x = this.x = e.offsetX, y = this.y = e.offsetY;	
				if(cfg.ruler.onGrid) {
					if(Math.abs(x-this.x0)>Math.abs(y-this.y0)) {
						y = this.y = this.y0;
					} else {
						x = this.x = this.x0;
					}
				}
				if(root.newElm) {
					root.newElm.reshape(this.x0, this.y0, x, y);
				}
			}
		},
		scene: {
			mousedown: function(e){
				mark.formalize();
			}
		}
	},
	2: {
		newElm: null,
		canvas: {
			x0: 0, y0: 0, x: 0, y: 0,
			hex: '#000000',
			mousedown: function(e){
				var root = events_pool[COLOR_MODE];
				if(!root.newElm) {
					e.stopPropagation();
					var x0 = this.x0 = e.offsetX, y0 = this.y0 = e.offsetY;
					var hex = mark.getColor(x0, y0);
					root.newElm = new OBJ.color(hex,x0,y0, marker_layer, shadow_layer);
				}
			},
			mousemove: function(e){
				var root = events_pool[COLOR_MODE];
				var x = this.x = e.offsetX, y = this.y = e.offsetY;	
				var hex = mark.getColor(x,y);
				if(root.newElm) {
					root.newElm.locate(hex, x, y);
				}
			}
		},
		scene: {
			mousedown: function(e){
				mark.formalize();
			}
		}		
	},
	3: {
		newElm: null,
		canvas: {
			x0: 0, y0: 0, x: 0, y: 0,
			hex: '#000000',
			mousedown: function(e){
				var root = events_pool[POINT_MODE];
				if(!root.newElm) {
					e.stopPropagation();
					var x0 = this.x0 = e.offsetX, y0 = this.y0 = e.offsetY;
					root.newElm = new OBJ.point(x0,y0, marker_layer, shadow_layer);
				}
			},
			mousemove: function(e){
				var root = events_pool[POINT_MODE];
				var x = this.x = e.offsetX, y = this.y = e.offsetY;	
				if(root.newElm) {
					root.newElm.locate(x, y);
				}
			}
		},
		scene: {
			mousedown: function(e){
				mark.formalize();
			}
		}
	},
	4: {
		newElm: null, createFlag: true,
		canvas: {			
			x0: 0, y0: 0, x: 0, y: 0,
			mousedown: function(e){
				var root = events_pool[TEXT_MODE];
				if( (!root.newElm) && root.createFlag ) {
					e.stopPropagation();
					var x0 = this.x0 = e.offsetX, y0 = this.y0 = e.offsetY;
					root.newElm = new OBJ.textArrow(x0,y0,x0,y0, marker_layer, shadow_layer, input_layer);
					
				}
			},
			mousemove: function(e){
				var root = events_pool[TEXT_MODE];
				var x = this.x = e.offsetX, y = this.y = e.offsetY;
				if(root.newElm) {
					root.newElm.reshape(this.x0, this.y0, x, y);
				}
			}
		},
		scene: {
			mousedown: function(e){
				var root = events_pool[TEXT_MODE];
				mark.formalize(root);
				root.createFlag = false;
			}
		}
	},
	5: {
		box: null, obj: null, 
		x0: 0, y0: 0,
		moveX0: 0, moveY0: 0,
		initX: 0, initY: 0,
		initX1: 0, initY1: 0, initX2: 0, initY2: 0,
		flag: -100, //select: nothing -100, canvas -1, Ruler 0, Ruler anchor1 1, Ruler anchor2 2, Color 3, point 4, text 5
		canvas: {
			mousedown: function(e){
				var root = events_pool[SELECT_MODE];
				var tar = $(e.target);
				var box = tar.closest('.select-box');

				root.box && root.box.removeClass('select-box-active');
				root.x0 = e.pageX; root.y0 = e.pageY;
				if(box[0]) {
					root.box = box.addClass('select-box-active');
					var idx = shadows.indexOf(root.box[0]);
					root.obj =  objs[idx];

					if(root.obj instanceof OBJ.ruler) {
						if(tar && tar.hasClass('select-anchor-1')) {
							this.selectRulerAnchor(e, 1);
						} else if(tar && tar.hasClass('select-anchor-2')) {
							this.selectRulerAnchor(e, 2);
						} else {
							this.selectRulerAnchor(e, 0);
						}
					}
					if(root.obj instanceof OBJ.color) {this.selectColor(e);}
					if(root.obj instanceof OBJ.point) {this.selectPoint(e);}
					if(root.obj instanceof OBJ.textArrow) {this.selectTextArrow(e);}
				} else {
					this.selectCanvas(e);
					root.box = null;
					root.obj = null;
				}


			},
			mousemove: function(e){
				var root = events_pool[SELECT_MODE];
				var x = e.pageX, y = e.pageY;	
			},
			selectCanvas: function(e) {
				var root = events_pool[SELECT_MODE];
				root.moveX0 = stat.moveX; root.moveY0 = stat.moveY; 
				root.flag = -1;
			},
			selectRulerAnchor: function(e, which){
				var root = events_pool[SELECT_MODE], ruler = root.obj;
				root.initX1 = ruler.x1; root.initY1 = ruler.y1; root.initX2 = ruler.x2; root.initY2 = ruler.y2;
				if(which == 0) { root.flag = 0;}
				if(which == 1) { root.flag = 1;}
				if(which == 2) { root.flag = 2;}		
			},
			selectColor: function(e) {
				var root = events_pool[SELECT_MODE], color = root.obj;
				root.initX = color.x; root.initY = color.y;
				root.flag = 3;
			},
			selectPoint: function(e) {
				var root = events_pool[SELECT_MODE], point = root.obj;
				root.initX = point.x; root.initY = point.y;
				root.flag = 4;
			},
			selectTextArrow: function(){
				var root = events_pool[SELECT_MODE], textArrow = root.obj;
				root.initX = textArrow.x2; root.initY = textArrow.y2;
				root.flag = 5;				
			}
		},
		scene: {
			x: 0, y: 0,
			mousemove: function(e){
				var root = events_pool[SELECT_MODE];
				this.x = e.pageX; this.y = e.pageY;	
				// console.log('sceneX: ', this.x);
				switch(root.flag) {
				case -100:
					return;
				case -1:
					this.moveCanvas(e); return;
				case 0:
					this.moveRulerAnchor(e, 0); return;
				case 1:
					this.moveRulerAnchor(e, 1); return;
				case 2:
					this.moveRulerAnchor(e, 2); return;
				case 3:
					this.moveColor(e); return;
				case 4:
					this.movePoint(e); return;
				}
			},
			mouseup: function(e) {
				var root = events_pool[SELECT_MODE];
				root.flag = -100;
			},
			moveCanvas: function(e){
				var root = events_pool[SELECT_MODE];
	        	stat.moveX = root.moveX0 + (this.x-root.x0);
	        	stat.moveY = root.moveY0 + (this.y-root.y0);
	        	mark.transformCanvas();
			},
			moveRulerAnchor: function(e, which) {
				var root = events_pool[SELECT_MODE], ruler = root.obj;
				if(which == 1) {
					var x1 = root.initX1 + Math.floor((this.x - root.x0)/stat.scale), x2 = root.initX2;
					var y1 = root.initY1 + Math.floor((this.y - root.y0)/stat.scale), y2 = root.initY2;
					if(cfg.ruler.onGrid) {
						if(Math.abs(x1-x2)>Math.abs(y1-y2)) {
							y1 = y2;
						} else {
							x1 = x2;
						}						
					}
				} else if(which == 2) {
					var x2 = root.initX2 + Math.floor((this.x - root.x0)/stat.scale), x1 = root.initX1;
					var y2 = root.initY2 + Math.floor((this.y - root.y0)/stat.scale), y1 = root.initY1;
					if(cfg.ruler.onGrid) {
						if(Math.abs(x2-x1)>Math.abs(y2-y1)) {
							y2 = y1;
						} else {
							x2 = x1;
						}						
					}
				} else {
					var x1 = root.initX1 + Math.floor((this.x - root.x0)/stat.scale);
					var y1 = root.initY1 + Math.floor((this.y - root.y0)/stat.scale);
					var x2 = root.initX2 + Math.floor((this.x - root.x0)/stat.scale);
					var y2 = root.initY2 + Math.floor((this.y - root.y0)/stat.scale);
				}
				ruler.reshape(x1,y1,x2,y2);
			},
			moveColor: function(e){
				var root = events_pool[SELECT_MODE], color = root.obj;
	        	var x = root.initX + Math.floor((this.x-root.x0)/stat.scale);
	        	var y = root.initY + Math.floor((this.y-root.y0)/stat.scale);
	        	var hex = mark.getColor(x, y);
	        	color.locate(hex, x, y);
			},
			movePoint: function(e){
				var root = events_pool[SELECT_MODE], point = root.obj;
	        	var x = root.initX + Math.floor((this.x-root.x0)/stat.scale);
	        	var y = root.initY + Math.floor((this.y-root.y0)/stat.scale);
	        	point.locate(x, y);
			}
		}
	}
};


var init = (function(){

	var _browserSupport = function(){
		var reg = /(Chrome|Safari|MSIE 10.0|Firefox)/;
		var support = reg.test(window.navigator.userAgent);
        var tpl = [
        	'<div class="alert fade in">',
            	'<button type="button" class="close" data-dismiss="alert">&times;</button>',
            	'提示：您的浏览器可能不支持本工具需要的部分html5特性，建议您使用',
            	'<a href="http://www.google.cn/intl/zh-CN/chrome/browser/" target="_blank">Chrome</a>, ',
            	'<a href="http://firefox.com.cn/download/" target="_blank">Firefox</a>, 或 ',
            	'<a href="http://windows.microsoft.com/zh-cn/internet-explorer/ie-10-worldwide-languages" target="_blank">IE10</a> ',
            	'浏览器体验html5的未来新世界！',
        	'</div>'
        ].join('');

        // var support = false;
		if(!support) {
			$('.alert-wrapper').html(tpl);
		}
		return support;
	};

	var _fileUpload = function(){
		var reader = new FileReader();
		reader.onload = function(e) {
			var base64 = e.target.result;
			img.src = base64;
		};

		dropbox.css({
			position: 'absolute',
			width: cfg.dropbox_width + 'px', 
			height: cfg.dropbox_height + 'px', 
			lineHeight: (cfg.dropbox_height - 20) + 'px'
		}).appendTo(scene);
		mark.ajustScene();

	    $('#fileupload').fileupload({
	    	url: "http://node.zzzeek.com:3003/mark",
	        type: 'POST', 
	        dataType: 'json', //response type
	        dropZone: $('.dropbox'),
	        pasteZone: null,
	        singleFileUploads: true,
	        sequentialUploads: true,
	        disableImageResize: /Android(?!.*Chrome)|Opera/.test(window.navigator.userAgent),
	        maxFileSize: 5000000,
	        acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
	        add: function(e, data){
			    if (data.autoUpload || (data.autoUpload !== false &&
			            $(this).fileupload('option', 'autoUpload'))) {
			        data.process().done(function () {
			            data.submit();
			        });
			    }
			    //var file = data.files[0];
			    //reader.readAsDataURL(file);
	        },
	        progress: function (e, data) {
	        },
	        done: function (e, data) {
	        	var url = data.result.url;
	        	var name = data.result.name;
	        	trace.imgsrc = url;
	        	trace.imgname = name;

	        	img.src = 'http://node.zzzeek.com:3003/view/mark/' + url;

	        }
		});

		$(document).bind('drop dragover', function (e) {
	        e.preventDefault();
	    });
	};
	var _resize = function(){
		$(window).on('resize', mark.ajustScene);
	};
	var _tooltip = function(){
		$('.have-tip').tooltip({
            // delay: { show: cfg.tooltip_delay, hide: 0},
            //trigger: 'hover'
        });
	}
	var _wheelScale = function(){
		scene.on('mousewheel',function(e, delta){
			e.preventDefault();
			e.stopPropagation();
			if(delta>0) {
				stat.scale += cfg.scale_step;
			} else {
				stat.scale -= cfg.scale_step;
			}
			mark.scaleCanvas(stat.scale);
		})
	};
	var _dblclickInput = function(){
		sceneInner.on('dblclick', '.textarrow-select-box', function(e){
			if(trace.mode != SELECT_MODE) {return}
			var idx = shadows.indexOf(this);
		console.log(idx);
			var textArrow = aaaa = objs[idx];
			console.log(textArrow);

			textArrow.text.hide();
			textArrow.input.show().focus();
			mark.switchMode(TEXT_MODE, function(root) {
				root.createFlag = false;
			});
		});

	};
	var _activeTools = function(){
		controls.on('mousedown', ".tool-btn", function(e){
			e.stopPropagation();
			var btn = $(this);

			var mode = $(this).attr("mode");
			mark.switchMode(mode);		
		});	

		var save = {
			btn: controls.find('.btn-download'),
			url: "http://node.zzzeek.com:3003/marksvg",
			post_to_url: function(path, params, method) {
			    method = method || "post";
			    var form = document.createElement("form");
			    form.setAttribute("method", method);
			    form.setAttribute("action", path);

			    for(var key in params) {
			        if(params.hasOwnProperty(key)) {
			            var hiddenField = document.createElement("input");
			            hiddenField.setAttribute("type", "hidden");
			            hiddenField.setAttribute("name", key);
			            hiddenField.setAttribute("value", params[key]);

			            form.appendChild(hiddenField);
			         }
			    }
			    document.body.appendChild(form);
			    form.submit();
			}
		}; 
		
		save.btn.on('click', function(){
			mark.formalize();
			var svg = marker_layer.canvas.cloneNode(true);
			var str = $('<div></div>').append(svg).html().trim();
			save.post_to_url(save.url, {
				src: trace.imgsrc,
				svg: str,
				name: trace.imgname
			});						
		});

		controls.find('.top-btns').removeClass('hide');	
		save.btn.removeClass('hide');
	};
	var _activeSetting = function(){
		var settingBtn = $('.menu-btn-setting');
		var settingDropdown = settingBtn.parent();

		settingBtn.on('click', function(){
			if(settingDropdown.hasClass('open')){
				settingDropdown.removeClass("open");
			} else {
				settingDropdown.addClass("open");
			}
		});

		sceneInner.on('mousedown', function(e){
			settingDropdown.removeClass("open");
		});

		$('.color-picker').minicolors({
			inline: true,
			defaultValue: DEFAULTS.color,
			change: function(hex, opacity){
				DEFAULTS.color = hex; 
			}
		});

		$('.tmp-color-picker').minicolors({
			inline: true,
			defaultValue: DEFAULTS.tmpColor,
			change: function(hex, opacity){
				DEFAULTS.tmpColor = hex; 
			}
		});

			$('.toggle-grid input').on('change', function(e){
				var checked = this.checked;
				console.log(checked);
				if(checked) {
					cfg.ruler.onGrid = false;
				} else {
					cfg.ruler.onGrid = true;
				}
			})
	};
	var _activeCompass = function(){
		var compass = $('.compass');
		var w = 16, h = 16, cx = 36, cy = 36, r = 20;
		var dist = 40, dotx= 70, doty = 7, dotw = 16, doth = 16;

		var moveBtn_pos =[{
			x: cx - w/2, y: cy - h/2
		}, {
			x: cx - w/2, y: cy - h/2 - r
		}, {
			x: cx - w/2 + r, y: cy - h/2
		}, {
			x: cx - w/2, y: cy - h/2 + r
		}, {
			x: cx - w/2 - r, y: cx - h/2
		}];

		var moveStr = $.map(moveBtn_pos, function(p, i){
			return '<div class="compass-btn compass-btn-' + i + '" style="width:'+ w +'px; height:' + h +'px; left:'+ p.x + 'px; top:' + p.y +'px" ></div>'
		}).join('');

		var scaleStr = [
			'<div class="compass-btn-zoom compass-btn-zoomin" style="width:'+ dotw +'px; height:' + doth +'px; left:'+ dotx + 'px; top:' + doty +'px" ></div>',
			'<div class="compass-btn-zoom compass-btn-zoomout" style="width:'+ dotw +'px; height:' + doth +'px; left:'+ dotx + 'px; top:' + (doty + dist) +'px" ></div>'
		].join('');

		compass.html(moveStr + scaleStr).removeClass('hide');
		$('<div></div>').addClass('toggle-compass').appendTo(compass).on('click', function(){
			if(compass.hasClass('compass-hide')) {
				compass.removeClass('compass-hide');
			} else {
				compass.addClass('compass-hide');
			}
		});

		var zeroBtn = compass.find('.compass-btn-0').on('click', function(){
			mark.transformCanvas({x: 0, y: 0, s:cfg.best_scale});
		});

		$('.compass-btn').add('.compass-btn-zoomin').add('.compass-btn-zoomout').each(function(i){
			if(i==0) {return} 
			$(this).on('mousedown', function(e){
				trace.compass = i;
			}).on('mouseup', function(e){
				trace.compass = null;
			});
		});
	};
	var _activeKeyboards = function(){
		var key = {
			del: 46,
			left: 37,
			up: 38,
			right: 39,
			down:40,
			plus: 187,
			minus: 189,
			0: 48,
			enter: 13,
			esc: 27,
			v: 86, // move
			i: 73, // ink
			t: 84, // text
			s: 83, //ctrl +s save
			l: 76, //length
			p: 80, // position
			o: 79, // ctrl +o open
			1: 49,
			2: 50,
			3: 51,
			4: 52,
			5: 53,
			space: 32
		};

		var _repeatDown = {};

		var _isDown = {};

		$(window).on('keydown', function(e){
			if(trace.mode == TEXT_MODE && events_pool[TEXT_MODE].createFlag == false) {return}
			var code = e.keyCode;
			if(_repeatDown[code]) {

			} else {
				if(!_isDown[code]) {
					_isDown[code] = true;
					switch(code){
					case key[5]:
					case key.v: mark.switchMode(SELECT_MODE); return;
					case key[4]:
					case key.t: mark.switchMode(TEXT_MODE); return;
					case key[3]:
					case key.p: mark.switchMode(POINT_MODE); return;
					case key[2]:
					case key.i: mark.switchMode(COLOR_MODE); return;
					case key[1]:
					case key.l: mark.switchMode(RULER_MODE); return;
					case key.up: trace.compass = 1; return;
					case key.right: trace.compass = 2; return;
					case key.down: trace.compass = 3; return;
					case key.left: trace.compass = 4; return;
					case key.plus: trace.compass = 5; return;
					case key.minus: trace.compass = 6; return;
					case key[0]: mark.transformCanvas({x: 0, y: 0, s:cfg.best_scale}); return; 
					case key.esc:
						console.log('esc');
						$.each(events_pool, function(_, m){
							m.newElm && mark.removeObj(m.newElm) && (m.newElm = null)
						});	return;					
					}
					if(code == key.del) {
						if(trace.mode == SELECT_MODE) {
							var selected = events_pool[SELECT_MODE].obj;
							selected && mark.removeObj(selected);
						}
						return; 	
					}
					if(e.ctrlKey) {
						if(code == key.o) {
							e.preventDefault();
							controls.find('input').trigger('mousedown');
						}
						if(code == key.s) {
							e.preventDefault();
							controls.find('.btn-download').trigger('click');
						} 
						return; 
					}

					if(code == key.space) {
						mark.tmpSwitchMode(SELECT_MODE);
						return;
					}

					console.log('code', code);				
				}
			}
		}).on('keyup', function(e){
			if(trace.mode == TEXT_MODE && events_pool[TEXT_MODE].createFlag == false) {return}
			var code = e.keyCode;
			if(_repeatDown[code]) {

			} else {
				_isDown[code] = false;
				switch(code){
					case key.up:
					case key.right:
					case key.down:
					case key.left:
					case key.plus:
					case key.minus: trace.compass = null; return;
				}
				if(code == key.space) {
					mark.tmpSwitchMode('back');
					return;
				}
			}
		}); 
	};
	var _activeCanvas = function(){
		var pool = events_pool;
		$.each(name2dom, function(name, dom) {
			var evts = name2evts[name];
			evts.forEach(function(evt){
				dom.on(evt, function(e){
					var evt2cb = trace.mode && pool[trace.mode] && pool[trace.mode][name];	
					evt2cb && evt2cb[evt] && evt2cb[evt](e);
				})
			});
		});			
	};
	var _mainloop = function(){
		requestAnimFrame(_mainloop);
		if(!trace.compass) {return} else {
			switch (trace.compass) {
			case 1:
				stat.moveY -= cfg.move_step; mark.transformCanvas(); break;

			case 2:
				stat.moveX += cfg.move_step; mark.transformCanvas(); break;
			case 3:
				stat.moveY += cfg.move_step; mark.transformCanvas(); break;
			case 4:
				stat.moveX -= cfg.move_step; mark.transformCanvas(); break;
			case 5:
				stat.scale += cfg.scale_step; mark.scaleCanvas(); break;
			case 6: 
				stat.scale -= cfg.scale_step; mark.scaleCanvas(); break;
			}
			
		}		
	};
	return {
		browserSupport: _browserSupport,
		resize: _resize,
		tooltip: _tooltip,
		fileUpload: _fileUpload,
		wheelScale: _wheelScale,
		dblclickInput: _dblclickInput,
		activeTools: _activeTools,
		activeCanvas: _activeCanvas,
		activeKeyboards: _activeKeyboards,
		activeSetting: _activeSetting,
		activeCompass: _activeCompass,
		mainloop: _mainloop
	}
})();


$(function(){
	init.fileUpload();
	init.resize();
	init.tooltip();
	if(init.browserSupport()){
		mark.switchMode(RULER_MODE);
		$('.btn-open').tooltip('show');
	}
});

$(img).on('load', function(){
	if(trace.firstLoad) {
		dropbox.remove();
		sceneInner.appendTo(scene);

		init.wheelScale();
		init.dblclickInput();
		init.activeTools();
		init.activeCanvas();
		init.activeSetting();
		init.activeCompass();
		init.mainloop();
		init.activeKeyboards();
		test();
		
		trace.firstLoad = false;
	}
	sceneInner.addClass('hide');

	mark.refreshCanvas(img);
	mark.ajustScene();
	
	sceneInner.removeClass('hide');
});


function test() {

	sceneInner.on('contextmenu', function(e){
		console.log('to be added');
		e.preventDefault();
	});
	// $(window).bind('beforeunload', function(){
 //  		return '当前图片还未下载保存，是否离开？';
	// });

}