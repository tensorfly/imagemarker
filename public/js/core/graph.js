var RULER_MODE = 1, COLOR_MODE = 2, POINT_MODE = 3, TEXT_MODE = 4, SELECT_MODE = 5;

var DEFAULTS = {
	color: '#000000',
	tmpColor: '#0000ff'
};


var cfg = {
	dropbox_width: 500,
	dropbox_height: 250,
	leftbar_width: 42,
	topbar_height: 40,
	init_cvs_area: 0.8,
	min_cvs_scale: 0.4,
	max_cvs_scale: 10,
	best_scale: 1.0,
	scale_step: 0.2,
	move_step: 20,
	ruler: {
		onGrid: true,
		critical_length: 20,
		arrow_radius: 8,
		extend_length: 20,
		half_bar_height: 6,
		fontSize: 14,
		pendingArrow: false,
		formalColor: DEFAULTS.color,
		formalArrow: false,
		arrowStrokeWdith: 1.5,
		padding4anchor: 14
	},
	note: {
        pendingBoxColor: 'rgba(0,255,255, 0.4)',
        pendingDotColor: '#999',
        formalBoxColor: 'rgba(255, 255, 255, 0.4)',
        formalDotColor: '#000000',
        formalTextColor: '#000000',
        box_width: 50,
        box_height: 30
	},
	focus: {
		focusLineLength: 40,
		textOffsetX: 28,
		textOffsetY: -10
	},
	textArrow: {
		half_arrow_height: 4,
		arrow_length: 8,
		input_width: 140,
		input_height: 80
	},
	defaultColor: DEFAULTS.color,
	defaultbgColor: '#ffffff',
	defaultStrokeWidth: 1,
	tooltip_delay: 1000
};


window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();
window.cancelAnimFrame = (function(){
  return  window.cancelAnimationFrame       ||
          window.webkitCancelAnimationFrame ||
          window.mozCancelAnimationFrame    ||
          window.oCancelAnimationFrame      ||
          window.msCancelAnimationFrame     ||
          function(id){
            window.clearTimeout(id);
          };
})();



window.R = Raphael;
window.OBJ = {};


R.fn.Line = function(x1,y1,x2,y2, opt) {
	var x1 = x1 || 0, y1 = y1 || 0, x2 = x2 || 0, y2 = y2 || 0;
	var opt = opt || {}, 
	    w = opt.strokeWidth || cfg.defaultStrokeWidth,
	    s = opt.startArrow || false,
	    e = opt.endArrow || false,
	    color =opt.color || cfg.defaultColor;
	return this.path( [["M", x1, y1], ["L", x2, y2]] ).attr({
	  "stroke-width": w,
	  "arrow-start": s?"block-wide-long":"none",
	  "arrow-end": e?"block-wide-long":"none",
	  "stroke": color
	});
};

R.fn.Label = function(text, x, y, opt) {
	var text = text || '', x = x || 0, y = y || 0;
	var opt = opt || {}, color = opt.color || cfg.defaultColor;
	return this.text(x, y, text).attr({
	  "font-size": cfg.ruler.fontSize,
	  fill: color
	})
};

R.fn.Triangle = function(x1,y1,x2,y2, x3, y3, opt) {
	var x1 = x1 || 0, y1 = y1 || 0, x2 = x2 || 0, y2 = y2 || 0, x3 = x3 || 0, y3 = y3 || 0;
	var opt = opt || {},
	    color =opt.color || cfg.defaultColor;
	return this.path( [["M", x1, y1], ["L", x2, y2], ["L", x3, y3], ["Z"]] ).attr({
	  "stroke": "none",
	  "fill": color
	});
};
R.fn.Ruler = function(x1, y1, x2, y2, opt) {
	var opt = opt || {}, noArrow = opt.noArrow, noBar = opt.noBar;

    var line = null, label = null, bar1 = null, bar2 = null, startArrow = null, endArrow = null;

	line = this.Line(); label = this.Label();
	if(!noArrow) {
		startArrow = this.Line(0, 0, 0, 10, {strokeWidth: cfg.ruler.arrowStrokeWdith, endArrow: true });
		endArrow = this.Line(0, 0, 0, 10, {strokeWidth: cfg.ruler.arrowStrokeWdith, endArrow: true });
	}    	
    if(!noBar) {
      bar1 = this.Line(); bar2 = this.Line();
    }
    var rst = this.set([line, label, bar1, bar2, startArrow, endArrow]);
    rst.restyleRuler(opt);
    rst.reshapeRuler(x1, y1, x2, y2);
    return rst;
};

R.fn.Note = function(str, x, y, opt) {
	var opt = opt || {};
	var box = this.rect(0,0,1,1), dot = this.circle(0,0,1), text = this.text(0,0,'');
	var rst = this.set([box, dot, text]);
	rst.restyleNote(opt);
	rst.reshapeNote(str,x,y);
	return rst;
};

R.fn.Focus = function(str, x, y, opt){
	var opt = opt || {};
	var hbar = this.path([["M", 0, 0], ["L", 0, 0]]), 
		vbar = this.path([["M", 0, 0], ["L", 0, 0]]), 
		text = this.text(0,0,'');
	var rst = this.set([hbar, vbar, text]);
	rst.restyleFocus(opt);
	rst.reshapeFocus(str,x,y);
	return rst;
};

R.fn.TextArrow = function(x1, y1, x2, y2, opt) {
	var opt = opt || {}, noArrow = opt.noArrow, noBar = opt.noBar;

    var line = this.Line(), arrow = this.Triangle();

    var rst = this.set([line, arrow]);
    rst.restyleTextArrow(opt);
    rst.reshapeTextArrow(x1, y1, x2, y2);
    return rst;
}

R.st.restyleRuler = function(opt) {
    var opt = opt || {}, color = opt.color || DEFAULTS.color;
    var line = this[0], label = this[1], bar1 = this[2], bar2 = this[3], startArrow = this[4], endArrow = this[5];
    if(color) {
      line.attr('stroke', color);
      label.attr('fill', color);
      bar1 && bar1.attr('stroke', color);
      bar2 && bar2.attr('stroke', color);
      startArrow && startArrow.attr('stroke', color);
      endArrow && endArrow.attr('stroke', color);
    }
}

R.st.reshapeRuler = function(x1, y1, x2, y2) {
	var c = cfg.ruler.critical_length, 
		r = cfg.ruler.arrow_radius, 
		ext = cfg.ruler.extend_length,
		bar = cfg.ruler.half_bar_height;
    var line = this[0], label = this[1], bar1 = this[2], bar2 = this[3], startArrow = this[4], endArrow = this[5];
    var dx = x2-x1; dy = y2-y1;
    var d = Math.sqrt(dx*dx+dy*dy), d_text = cfg.ruler.onGrid?d:d.toFixed(2);
    var deg = R.angle(x1,y1, x2, y2);   
    var arc=deg*Math.PI/180, cos = Math.cos(arc), sin=Math.sin(arc);
    var midX = (x1 + x2)/2, midY = (y1 + y2)/2;	
     
    if(d<=c) {
      var x1_extend = x1 + ext*cos;
      var y1_extend = y1 + ext*sin;
      var x2_extend = x2 - ext*cos;
      var y2_extend = y2 - ext*sin;

      line.attr({path: [["M", x1_extend, y1_extend], ["L", x2_extend, y2_extend]]});

      if(startArrow) {
        var x1_butt = x1 + r*cos;
        var y1_butt = y1 + r*sin;
        startArrow.attr({path: [["M", x1_butt, y1_butt], ["L", x1, y1]]});
      }
      if(endArrow) {
        var x2_butt = x2 - r*cos;
        var y2_butt = y2 - r*sin;  
        endArrow.attr({path: [["M", x2_butt, y2_butt], ["L", x2, y2]]});
      }
    } else {
      line.attr({path: [["M", x1, y1], ["L", x2, y2]]});
      if(startArrow) {
        var x1_butt = x1 - r*cos;
        var y1_butt = y1 - r*sin;
        startArrow.attr({path: [["M", x1_butt, y1_butt], ["L", x1, y1]]});
      }
      if(endArrow) {
        var x2_butt = x2 + r*cos;
        var y2_butt = y2 + r*sin; 
        endArrow.attr({path: [["M", x2_butt, y2_butt], ["L", x2, y2]]});
      }
    }
    if(bar1) {
      var bar1_x1 = x1 - bar*sin;
      var bar1_y1 = y1 + bar*cos;
      var bar1_x2 = x1 + bar*sin;
      var bar1_y2 = y1 - bar*cos;
      bar1.attr({path: [["M", bar1_x1, bar1_y1], ["L", bar1_x2, bar1_y2]]});     
    }
    if(bar2) {
      var bar2_x1 = x2 - bar*sin;
      var bar2_y1 = y2 + bar*cos;
      var bar2_x2 = x2 + bar*sin;
      var bar2_y2 = y2 - bar*cos;
      bar2.attr({path: [["M", bar2_x1, bar2_y1], ["L", bar2_x2, bar2_y2]]});     
    }
    
    label.attr({x: midX, y: midY, text: d_text}).transform('r'+ (deg<180?deg:deg-180) + 't0,-14');

    return this;
};
R.st.restyleNote = function(opt) {
	var	bc = opt.boxColor || cfg.note.pendingBoxColor, 
		dc = opt.dotColor || cfg.note.pendingDotColor,
		tc = opt.textColor || DEFAULTS.tmpColor;
	var box = this[0], dot = this[1], text = this[2];
	box.attr({stroke:'none', fill: bc});
	dot.attr({stroke:'none', fill: dc});
	text.attr({fill: tc});
};
R.st.reshapeNote = function(str, x, y) {
	var bw = cfg.note.box_width,
		bh = cfg.note.box_height,
		bx = x - bw/2;
		by = y - bh/2 - 6;
	var tx = x, ty = y - 10;
	var box = this[0], dot = this[1], text = this[2];
	box.attr({x: bx, y: by, width: bw, height: bh});
	dot.attr({cx: x, cy: y});
	text.attr({x: tx, y: ty, text: str});
	return this;
};
R.st.locateColorNote = function(str, x, y){
	this.reshapeNote(str, x, y);
	var dot = this[1];
	dot.attr({fill: str});
};
R.st.restyleFocus = function(opt) {
	var	lc = opt.lineColor || DEFAULTS.tmpColor, 
		tc = opt.textColor || DEFAULTS.tmpColor;
	var hbar = this[0], vbar = this[1], text = this[2];
	hbar.attr({'strokeWidth': cfg.defaultStrokeWidth, stroke: lc});
	vbar.attr({'strokeWidth': cfg.defaultStrokeWidth, stroke: lc});
	text.attr({fill: tc, 'font-size': 12});
	return this;
};
R.st.reshapeFocus = function(str, x, y) {
	var len = cfg.focus.focusLineLength, xmin = x - len/2, xmax = x + len/2, ymin = y - len/2, ymax = y + len/2;
	var tx = x + cfg.focus.textOffsetX; ty = y + cfg.focus.textOffsetY;
	var hbar = this[0], vbar = this[1], text = this[2];
	hbar.attr({path: [["M", xmin, y], ["L", xmax, y]]});
	vbar.attr({path: [["M", x, ymin], ["L", x, ymax]]}); 
	text.attr({x: tx, y: ty, text: str});
	return this;
};

R.st.restyleTextArrow = function(opt) {
	var line = this[0], arrow = this[1], text = this[2];
	line.attr({
		stroke: opt.color || DEFAULTS.color
	});
	arrow.attr({
		fill: opt.color || DEFAULTS.color
	});
	text && text.attr({
		fill: opt.color || DEFAULTS.color
	});
	return this;
};
R.st.reshapeTextArrow = function(x1, y1, x2, y2) {
	var h = cfg.textArrow.half_arrow_height, l = cfg.textArrow.arrow_length;
    var line = this[0], arrow = this[1];

    var deg = R.angle(x1,y1, x2, y2);   
    var arc=deg*Math.PI/180, cos = Math.cos(arc), sin=Math.sin(arc);

	  var _x1 = x1 - l*cos;
	  var _y1 = y1 - l*sin;
	  var _x2 = x2 + l*cos;
	  var _y2 = y2 + l*sin;

      var ax1 = _x1 - h*sin;
      var ay1 = _y1 + h*cos;
      var ax2 = _x1 + h*sin;
      var ay2 = _y1 - h*cos;

    line.attr({path: [["M", x1, y1], ["L", x2, y2]]});
    arrow.attr({path: [["M", x1, y1], ["L", ax1, ay1], ["L", ax2, ay2], ["Z"]]});

    return this;
};
OBJ.ruler = function(x1,y1,x2,y2, mlayer, slayer, phase){
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.phase = phase || "pending"
  this.mlayer = mlayer;
  this.slayer = slayer;
  this.marker = this.createMarker();
  this.shadow = this.createShadow();
};

OBJ.color = function(hex, x, y, mlayer, slayer, phase){
	this.x = x;
	this.y = y;
	this.hex = hex;
	this.phase = phase || "pending"
	this.mlayer = mlayer;
	this.slayer = slayer;
	this.marker = this.createMarker();
	this.shadow = this.createShadow();
};

OBJ.point = function(x, y, mlayer, slayer, phase){
	this.x = x;
	this.y = y;
	this.phase = phase || "pending"
	this.mlayer = mlayer;
	this.slayer = slayer;
	this.marker = this.createMarker();
	this.shadow = this.createShadow();
};
OBJ.textArrow = function(x1,y1,x2,y2, mlayer, slayer, inlayer, phase){
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  this.phase = phase || "pending"
  this.mlayer = mlayer;
  this.slayer = slayer;
  this.inlayer = inlayer;
  this.marker = this.createMarker();
  this.shadow = this.createShadow();
  this.input = this.createInput();
}
OBJ.ruler.prototype = {
	reshape: function(x1, y1, x2, y2) {
	  this.x1 = x1; this.y1 = y1;
	  this.x2 = x2; this.y2 = y2;
	  this.marker && this.marker.reshapeRuler(x1, y1, x2, y2);
	  this.shadow && this.reshapeShadow();
	  return this;
	},
	rephase: function(p){
	  this.phase = p;
	  this.marker && this.marker.remove();
	  this.shadow && this.shadow.remove();
	  this.marker = this.createMarker();
	  this.shadow = this.createShadow();
	  return this;
	},
	createMarker: function(){
		switch(this.phase){
		case 'pending':
			//console.log('x1 %s, y1 %s, x2 %s, y2 %s', this.x1, this.y1, this.x2, this.y2);
			return this.mlayer.Ruler(this.x1, this.y1, this.x2, this.y2, {
				color: DEFAULTS.tmpColor,
				noArrow: !cfg.ruler.pendingArrow
			});
		case 'formal':
			return this.mlayer.Ruler(this.x1, this.y1, this.x2, this.y2, {
				color: DEFAULTS.color,
				noArrow: !cfg.ruler.formalArrow
			});	
		};
	},
	createShadow: function(){
		switch(this.phase){
		case 'pending':
			return null;
		case 'formal':
	  		var box = $('<div></div>').addClass('select-box');
	  		var anchor1 = $('<div></div>').addClass('select-anchor select-anchor-1'); 
	  		var anchor2 = $('<div></div>').addClass('select-anchor select-anchor-2');
	  		box.append(anchor1).append(anchor2);
	  		this.reshapeShadow(box);
	  		this.slayer.append(box);		
			return box;	
		};
	},
	reshapeShadow: function(box){
		var box = box || this.shadow;
		var b = this.marker.getBBox(), pd = cfg.ruler.padding4anchor;
		if(!box) {return}
	  	var anchor1 = box.find('.select-anchor-1'), anchor2 = box.find('.select-anchor-2');
		var bx, by, bw, bh;
		if(this.y1 == this.y2) {
			bx = b.x - pd;
			by = b.y - 2;
			bw = b.width + 2*pd;
			bh = b.height + 4;
			if(this.x1>this.x2) {
				anchor1.css({right: '0px', bottom: '3px', left:'', top:''});
				anchor2.css({left: '0px', bottom: '3px', right:'', top:''});
			} else {
				anchor1.css({left: '0px', bottom: '3px', right:'', top:''});
				anchor2.css({right: '0px', bottom: '3px', left:'', top:''});
			}
		} else if (this.x1==this.x2) {
			by = b.y - pd;
			bx = b.x - 2;
			bh = b.height + 2*pd;
			bw = b.width + 4;
			if(this.y1>this.y2) {
				  anchor1.css({left: '3px', bottom: '0px', right:'', top:''});
				  anchor2.css({left: '3px', top: '0px', right:'', bottom:''});
			} else {
				  anchor1.css({left: '3px', top: '0px', right:'', bottom:''});
				  anchor2.css({left: '3px', bottom: '0px', right:'', top:''});
			}
		} else {
			by = b.y - 2;
			bx = b.x - 2;
			bh = b.height + 4;
			bw = b.width + 4;
		}

		box.css({
		    left: bx + 'px',
		    top: by + 'px',
		    width: bw + 'px',
		    height: bh + 'px'
		});

	}
};

OBJ.color.prototype = {
	rephase: function(p){
	  this.phase = p;
	  this.marker && this.marker.remove();
	  this.shadow && this.shadow.remove();
	  this.marker = this.createMarker();
	  this.shadow = this.createShadow();
	  return this;
	},
	createMarker: function(){
		switch(this.phase){
		case 'pending':
			return this.mlayer.Note(this.hex, this.x, this.y, {
				boxColor: cfg.note.pendingBoxColor,
				textColor: DEFAULTS.tmpColor,
				dotColor: this.hex
			});
		case 'formal':
			return this.mlayer.Note(this.hex, this.x, this.y, {
				boxColor: cfg.note.formalBoxColor,
				textColor: DEFAULTS.color,
				dotColor: this.hex
			});	
		};
	},
	createShadow: function(){
		switch(this.phase){
		case 'pending':
			return null;
		case 'formal':
	  		var box = $('<div></div>').addClass('select-box note-select-box');
	  		var boxInner = $('<div></div>').addClass('note-select-box-inner').appendTo(box);
	  		this.reshapeShadow(box);
	  		this.slayer.append(box);		
			return box;	
		};
	},
	reshapeShadow: function(box) {
		var box = box || this.shadow;
		var b = this.marker.getBBox();
		by = b.y - 2;
		bx = b.x - 2;
		bh = b.height + 4;
		bw = b.width + 4;
		box.css({
			left: bx + 'px',
			top: by + 'px',
			width: bw + 'px',
			height: bh + 'px'
		});
	},
	locate: function(hex, x, y){
		this.x = x; this.y = y; this.hex = hex;
		this.marker && this.marker.locateColorNote(hex, x, y);
	  	this.shadow && this.reshapeShadow();	
	}
};

OBJ.point.prototype = {
	rephase: function(p){
	  this.phase = p;
	  this.marker && this.marker.remove();
	  this.shadow && this.shadow.remove();
	  this.marker = this.createMarker();
	  this.shadow = this.createShadow();
	  return this;
	},
	createMarker: function(){
		var text = "x"+ this.x + ", y" + this.y;
		switch(this.phase){
		case 'pending':
			return this.mlayer.Focus(text, this.x, this.y, {
				lineColor: DEFAULTS.tmpColor,
				textColor: DEFAULTS.tmpColor
			});
		case 'formal':
			return this.mlayer.Focus(text, this.x, this.y, {
				lineColor: DEFAULTS.color,
				textColor: DEFAULTS.color
			});	
		};
	},
	createShadow: function(){
		switch(this.phase){
		case 'pending':
			return null;
		case 'formal':
	  		var box = $('<div></div>').addClass('select-box focus-select-box');
	  		var boxInner = $('<div></div>').addClass('focus-select-box-inner').appendTo(box);
	  		this.reshapeShadow(box);
	  		this.slayer.append(box);		
			return box;	
		};
	},
	reshapeShadow: function(box) {
		var box = box || this.shadow;
		var b = this.marker.getBBox();
		by = b.y - 2;
		bx = b.x - 2;
		bh = b.height + 4;
		bw = b.width + 4;
		box.css({
			left: bx + 'px',
			top: by + 'px',
			width: bw + 'px',
			height: bh + 'px'
		});
	},
	locate: function(x, y){
		this.x = x; this.y = y;
		var text = "x"+ this.x + ", y" + this.y;
		this.marker && this.marker.reshapeFocus(text, x, y);
	  	this.shadow && this.reshapeShadow();	
	}
};

OBJ.textArrow.prototype = {
	reshape: function(x1, y1, x2, y2) {
	  this.x1 = x1; this.y1 = y1;
	  this.x2 = x2; this.y2 = y2;
	  this.marker && this.marker.reshapeTextArrow(x1, y1, x2, y2);
	  this.shadow && this.reshapeShadow();
	  this.input && this.reshapeInput();
	  return this;
	},
	rephase: function(p, root){
	  this.phase = p;
	  this.marker && this.marker.remove();
	  this.shadow && this.shadow.remove();
	  this.input && this.input.remove();
	  this.marker = this.createMarker();
	  this.shadow = this.createShadow();
	  this.input = this.createInput(root);
	  return this;
	},
	createMarker: function(){
		switch(this.phase){
		case 'pending':
			//console.log('x1 %s, y1 %s, x2 %s, y2 %s', this.x1, this.y1, this.x2, this.y2);
			return this.mlayer.TextArrow(this.x1, this.y1, this.x2, this.y2, {
				color: DEFAULTS.tmpColor
			});
		case 'formal':
			return this.mlayer.TextArrow(this.x1, this.y1, this.x2, this.y2, {
				color: DEFAULTS.color
			});	
		};
	},
	createShadow: function(){
		switch(this.phase){
		case 'pending':
			return null;
		case 'formal':
	  		var box = $('<div></div>').addClass('select-box textarrow-select-box');
	  		this.reshapeShadow(box);
	  		this.slayer.append(box);		
			return box;	
		};
	},
	createInput: function(root){
			//'<textarea></textarea>'
			var input = $('<div contenteditable="true"></div>').addClass('text-input'), me = this;
			this.reshapeInput(input);
			input.appendTo(this.inlayer).on('keydown', this.ajustInputHeight).on('blur', function(){
				me.changeTextMarker();
				root.createFlag = true;	
			} );
			switch(this.phase){
			case 'formal':
				setTimeout(function(){
					input[0].focus();
				},100);	
			};
			return input;		
	},
	reshapeShadow: function(box) {
		var box = box || this.shadow;
		var b = this.marker.getBBox();
		by = b.y - 2;
		bx = b.x - 2;
		bh = b.height + 4;
		bw = b.width + 4;
		box.css({
			position: 'absolute',
			left: bx + 'px',
			top: by + 'px',
			width: bw + 'px',
			height: bh + 'px'
		});
	},
	reshapeInput: function(input) {
		input = input || this.input;
		var iw = cfg.textArrow.input_width, ih = cfg.textArrow.input_height;
		l = this.x2; t = this.y2;
		// if(this.x2<this.x1) {
		// 	l = this.x2 - iw;
		// }
		// if(this.y2<this.y1) {
		// 	t = this.y2 - ih;
		// }
		input.css({
			left: l + 'px',
			top: t + 'px',
			minWidth: iw + 'px',
			height: ih + 'px'		
		})
	},
	ajustInputHeight: function(e){
		e.stopPropagation();
		$(this).height(0);
		var sH = this.scrollHeight;
		$(this).height(sH);
	},
	changeTextMarker: function(e){
		//var str = this.input.val().trim();
		var str = this.input.html().split('</div><div>').join('\n').replace(/(<br>|<br\/>|<div>)/g,'\n').replace('</div>','').replace(/&nbsp;/g,' ').trim();
		if(str == '') {
			this.input.remove();
			this.shadow.remove();
			this.marker.remove();
		} else {
			var text = this.text = this.text || this.mlayer.text();
			text.attr({
				'text-anchor': 'start',
				x: this.x2,
				text: str,
				'font-size': 14,
				fill: DEFAULTS.color
			}).attr({
				y: this.y2 + text.getBBox().height/2
			});
			this.marker.push(text);
			this.reshapeShadow();
			this.text.show();
			this.input.hide();
		}
	}
}
