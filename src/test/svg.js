let svgHandle = {};


function addEventListener(){
	
	let showMousePointer = (e)=>{
		$('#pointer-location').html(`x=${e.clientX},y=${e.clientY}`);
		$("input").trigger("mousemoveto", {ev:e, x:e.clientX-32, y:e.clientY-48});
		$("#mousemoveto").trigger("mousemoveto", {ev:e, x:e.clientX-32, y:e.clientY-48});
	};
	$('.tabitem6').on('mouseover', showMousePointer).on('mousemove', showMousePointer).on('mouseup', showMousePointer);

	let clickHandle;
	$('svg #main-group').on('click', (e)=>{
		if(clickHandle){
			$(clickHandle).css('stroke','');
		}
		clickHandle = e.target;
		$(clickHandle).css('stroke','#00ff00')
	});
	
	
	
	let changeHandle = (event)=>{
		let value = $(event.target).val();
		let section = $(event.target).closest("section");
		let triggerId = section.attr('key');
		let inputId = $(event.target).attr('id');
		let type = $(event.target).closest("div").children('span.cmd-label').text();
		if (!triggerId || type=='ClosePath'){
			return;
		}
		let svg = getSVG();
		
		if (section.is('.path')){
			let path = svg.path.find((p)=>{return p.id == triggerId});
			updatePointValue(path, inputId, value);
			
		}else if (section.is('.ellipse')){
			let property = $('#'+inputId).attr('property');
			let propertyPath = property.split('.');
			let ellipse = svg.ellipse.find((p)=>{return p.id == triggerId});
			updateEllipseValue(ellipse, propertyPath[propertyPath.length-1], value);
		}
		
	};
	$('#svg-ctrl-panel input.cmd-input').on('change', changeHandle);
	
	let changeEllipseHandle = (e)=>{
		
		let section = $(e.target).closest("section");
		let triggerId = section.attr('key');
		
		let inputItem = $(e.target);
		
		let property = inputItem.attr('property');
		let value = inputItem.val();
		let propertyPath = property.split('.');
		let ellipse = container.getEllipse(triggerId);
		updateEllipseValue(ellipse, propertyPath[propertyPath.length-1], value);
	}
	$('.ellipse .ctrl-svn-path input').on('change', changeEllipseHandle);
	
	let changeTypeHandle = (event)=>{
		let value = $(event.target).val();
		let newType = value;
		let ischecked = $(event.target).attr('checked');
		if(!event.target.checked){
			newType = value.toLocaleLowerCase();
			$(event.target).siblings('span.cmd-type').text(newType);
		}
		else{
			newType = value.toLocaleUpperCase();
			$(event.target).siblings('span.cmd-type').text(newType);
		}
		
		let section = $(event.target).closest("section");
		let triggerId = section.attr('key');
		let inputId = $(event.target).siblings('input.cmd-input').attr('id');
		
		if (!triggerId){
			return;
		}
		let svg = getSVG();
		
		if (section.is('.path')){
			let path = svg.path.find((p)=>{return p.id == triggerId});
			updatePointType(path, inputId, newType);
			
		}
		
	};
	$('#svg-ctrl-panel input.cmd-type').on('change', changeTypeHandle);

	$('.ellipse .ctrl-svn-path .label').on('click', (e)=>{
		let inputItem = $(e.target).siblings('input');
		inputItem.val(inputItem.attr('default-value'));
		inputItem.change();
	})

	$('.cmd-item .cmd-label').on('click', (e)=>{
		let inputItem = $(e.target).siblings('input.cmd-input');
		inputItem.val(inputItem.attr('default-value'));
		inputItem.change();
	})

	
	$('section[key]').on('click', ()=>{
		let section = $(event.target).closest("section");
		let triggerId = section.attr('key');
		let inputId = $(event.target).attr('id');
		if(clickHandle){
		$(clickHandle).css({'stroke':'',"stroke-width":""} );
		}
		clickHandle = $('#'+triggerId)[0];
		$('#'+triggerId).css({'stroke':'#0000ff',"stroke-width":"3"})
	})

	let changeClosePathHandle = (event)=>{
		
		let section = $(event.target).closest("section");
		let triggerId = section.attr('key');
		let inputId = $(event.target).attr('id');
		
		if (!triggerId){
			return;
		}
		let svg = getSVG();
		let path = svg.path.find((p)=>{return p.id == triggerId});
		if(!event.target.checked){
			removePointer(path, inputId);
		}
		else{
			addPointer(path, 'z', inputId);
		}
		
		
	};
	$('#svg-ctrl-panel input[name="ClosePath"].cmd-input').on('change', changeClosePathHandle);
}


				
class SVG {
	svg = {path:[], ellipse:[]};
	
	options = { m:'Moveto',
					M:'Moveto',
					l:'Lineto',
					L:'Lineto',
					H:'Horizontal',
					h:'Horizontal',
					V:'Vertical',
					v:'Vertical',
					C:'Curveto',
					c:'Curveto', 
					A:'Arcto',
					a:'Arcto',
					z:'ClosePath', 
					Z:'ClosePath', 
					s:'Smooth', 
					S:'Smooth', 
					q:'Quadratic', 
					Q:'Quadratic',
					t:'Shorthand/smooth quadratic Bezier curveto',
					T:'Shorthand/smooth quadratic Bezier curveto'};
	
	actions = { m:['Move'],
					M:['Move'],
					a:['Point1', 'Point2'], 
					A:['Point1', 'Point2'], 
					q:['Point1', 'Point2'], 
					c:['Point1', 'Point2', 'Point3'],
					t:['Direction'],
					s:['Point1', 'Point2'],
					l:['Line'],
					L:['Line']};
					
	types = {z:'checkbox',Z:'checkbox'};
	
	constructor(svg){
		if(svg){
			this.svg = svg;
		}
		
	}
	
	
	getSVG(){
		return this.svg
	}
	
	setSVG(svg){
		this.svg = svg;
	}
	
	copy(){
		return JSON.parse(JSON.stringify(this.getSVG()));
	}
	
	fillEllipse(e){
		let svg = this.getSVG();
		let fill,cx,cy,id,rx,ry,stroke='';
		let model = {fill,cx,cy,id,rx,ry,stroke};
		svg.ellipse.push(fillObj(e, model));
		model.id = model.id ||('svg_'+Math.floor(Math.random()*1000000));
	}
	
	fillPath(e){
		let svg = this.getSVG();
		let fill,d,id,opacity,stroke='';
		let model = {fill,d,id,opacity,stroke};
		svg.path.push(fillObj(e, model));
		model.id = model.id ||('svg_'+Math.floor(Math.random()*1000000));
		
		// m74.99998,606.36001l254.65941,-154.79019l267.5753,-3.47599l91.21885,-289.66586l75.00217,-3.47599l-30.40629,327.90175l-599.0038,12.7453l-16.21668,-347.59903l33.44692,1.738l-76.27588,456.62202l0,-0.00001z
		
		let ps = model.d.match(/\w[\s\d-\.,]*/igm);
		if(ps){
			model.$commands = [];
			for(let p of ps){
				let o = {type:p[0], value:p.substr(1).replaceAll('-',' -'), id:'cmd-'+Math.floor(Math.random()*1000000)};
				model.$commands.push(o);
				let paramNumber = o.value?o.value.trim().split(/[\s,]+/).length:0;
				
				if (p[0]=='M' || p[0]=='m'){
					// mark Moveto
					if(paramNumber != 2){
						console.warn('Moveto param not fit. should be 2, but ' + paramNumber);
						if(paramNumber%2 !== 0){
							console.error('Moveto param has error.');
						}
					}
				}else if (p[0]=='L' || p[0]=='l'){
					// mark Lineto
					if(paramNumber != 2){
						console.warn('Lineto param not fit. should be 2, but ' + paramNumber);
						if(paramNumber%2 !== 0){
							console.error('Lineto param has error.');
						}
					}
				}else if (p[0]=='C' || p[0]=='c'){
					// mark Curvto
					if(paramNumber != 6){
						console.warn('Curvto param not fit. should be 6, but ' + paramNumber);
						if(paramNumber%6 !== 0){
							console.error('Curvto param has error.');
						}else{
							let params = o.value.trim().split(/[\s,]+/);
							let splitTo = params.length/6;
							o.value = params.splice(0, 6).join(' ');
							for(let i=1;i< splitTo;i++){
								let newVals = params.splice(0, 6);
								let o1 = {type:o.type, value:newVals.join(' '), id:'cmd-'+Math.floor(Math.random()*1000000)};
								model.$commands.push(o1);
							}
						}
					}
				}else if (p[0]=='A' || p[0]=='A'){
					// mark Arcto
					if(paramNumber != 7){
						console.warn('Arcto param not fit. should be 7, but ' + paramNumber);
						if(paramNumber%7 !== 0){
							console.error('Arcto param has error.');
						}else{
							let params = o.value.trim().split(/[\s,]+/);
							let splitTo = params.length/6;
							o.value = params.splice(0, 7).join(' ');
							for(let i=1;i< splitTo;i++){
								let newVals = params.splice(0, 7);
								let o1 = {type:o.type, value:newVals.join(' '), id:'cmd-'+Math.floor(Math.random()*1000000)};
								model.$commands.push(o1);
							}
						}
					}
				}else if (p[0]=='H' || p[0]=='h'){
					// mark horizontal lineto
					if(paramNumber != 1){
						console.warn('horizontal lineto param not fit. should be 1, but ' + paramNumber);
					}
				}else if (p[0]=='V' || p[0]=='v'){
					// mark vertical lineto
					if(paramNumber != 1){
						console.warn('vertical lineto param not fit. should be 1, but ' + paramNumber);
					}
				}else if (p[0]=='Z' || p[0]=='z'){
					// mark ClosePath
					if(paramNumber != 0){
						console.warn('vertical lineto param not fit. should be 0, but ' + paramNumber);
					}
				}else if (p[0]=='s' || p[0]=='S'){
					//shorthand/smooth curveto:
				}else if (p[0]=='q' || p[0]=='Q'){
					//Quadratic Bezier curveto
				}else if (p[0]=='t' || p[0]=='T'){
					//Shorthand/smooth quadratic Bezier curveto
				}else{
					console.error('unknow path = '+p);
				}
				
			}
		}
	}
	
	getPath(id){
		let s = this.getSVG();
		return s.path.find(p=>p.id==id);
	};
	
	getEllipse(id){
		let s = this.getSVG();
		return s.ellipse.find(p=>p.id==id);
	};
	
	getPoint(id){
		let s = this.getSVG();
		
		for(let p of s.path){
			let d = (p.$commands||[]).find(c=>{return c.id==id});
			if(d){
				return d;
			}
		}
		for(let e of s.ellipse){
			if(e.id==id){
				return e;
			}
		}
		return null;
	}

	isStart(id){
		let s = this.getSVG();
		return s.path.length > 0 && s.path[0].id==id;
	}
	
	isEnd(id){
		let s = this.getSVG();
		return s.path.length > 0 && s.path[s.path.length-1].id==id;
	}
	
	typeofPoint(id){
		let p = this.getPoint(id);
		return p && p.type;
	}
	
	previousCmd(id){
		let s = this.getSVG();
		for(let i=0;i<s.path.length;i++){
			for(let j=1;j<s.path[i].$commands.length;j++){
				if(s.path[i].$commands[j].id==id){
					return s.path[i].$commands[j-1];
				}
			}
			
		}
		return null;
	}
	
	isAbsolute(id){
		let t = this.typeofPoint(id);
		return t && t.match(/[A-Z]/);
	}

	getPreviousAbsolutePoint(id){
		let ret = this.getLocationPoints(id);
		let precmd = this.previousCmd(id);
		if (precmd){
			return this.getAbsolutePoint(precmd.id);
		}
		return null;
	}


	getAbsolutePoint(id){
		let ret = this.getLocationPoints(id);
		return ret.absolutePaths.find(t=>t.id==id);
	}
	
	getRelativePoint(id){
		let ret = this.getLocationPoints(id);
		return ret.relativePaths.find(t=>t.id==id);
	}

	getLocationPoints(id){
		let s = this.getSVG();
		let path = null;
		for(let p of s.path){
			let d = (p.$commands||[]).find(c=>{return c.id==id});
			if(d){
				path = p;
				break;
			}
		}
		if (!path){
			return {absolutePaths:[], relativePaths:[]};
		}
		return this.getLocationPointsByPath(path.id);
	}

	getLocationPointsByPath(id){
		let s = this.getSVG();
		let path = s.path.find(p=>{return p.id==id});
		let absolutePaths = [];
		let relativePaths = [];
			
		if(path){
			let last = {x:0,y:0};
			let rlast = {x:0,y:0};
			let ctrl1 = {x:0,y:0};
			let ctrl2 = {x:0,y:0};
			let rctrl1 = {x:0,y:0};
			let rctrl2 = {x:0,y:0};
			
			for(let cmd of path.$commands){
				let point = {type:cmd.type, id:cmd.id};
				let rpoint = {type:cmd.type, id:cmd.id};
				let val = ((cmd.value||'')+'').trim().split(/[\s,]+/);
				if (cmd.type=='Z' || cmd.type=='z'){
					last = {x:0,y:0};
					rlast = {x:0,y:0};
					continue;
				}
				if ((cmd.type=='M' || cmd.type=='m') && val.length == 2){
					last.x = Number(val[0]);
					last.y=Number(val[1]);
					rlast.x = Number(val[0]);
					rlast.y = Number(val[1]);
				}else if (cmd.type=='h'){
					last.x = Number(last.x) + Number(val[0]);
					rlast.x = Number(val[0]);
					
				}else if (cmd.type=='v'){
					last.y = Number(last.y) + Number(val[0]);
					rlast.y = Number(val[0]);
					
				}else if (cmd.type=='H'){
					rlast.x = Number(val[0]) - last.x;
					last.x = Number(val[0]);
					
				}else if (cmd.type=='V'){
					rlast.y = Number(val[0]) - last.y;
					last.y = Number(val[0]);
					
				}else if (cmd.type.charAt(0)<='z' && cmd.type.charAt(0)>='a' && val.length >= 2){
					
					let newX = Number(val[val.length-2]);
					let newY = Number(val[val.length-1]);
					
					last.x =  Number(last.x) + newX;
					last.y =  Number(last.y) + newY;
					
					rlast.x = Number(newX);
					rlast.y = Number(newY);
					
				}else if (cmd.type.charAt(0)<='Z' && cmd.type.charAt(0)>='A' && val.length >= 2){
					let newX = Number(val[val.length-2]);
					let newY = Number(val[val.length-1]);
					
					rlast.x = newX - Number(last.x);
					rlast.y = newY - Number(last.y);
					
					last.x = newX;
					last.y = newY;
					
					
				}else{
					console.error('unknow position path.');
					continue;
				}
				point.x = last.x;
				point.y = last.y;
				rpoint.x = rlast.x;
				rpoint.y = rlast.y;
				absolutePaths.push(point);
				relativePaths.push(rpoint);
			}
			return {absolutePaths, relativePaths};
		}
		return {absolutePaths, relativePaths};
	}
}
class Ellipse{
	fill;
	cx;
	cy;
	id;
	rx;
	ry;
	stroke;
}

class Draw{
	fill;
	cx;
	cy;
	id;
	rx;
	ry;
	stroke;
	cmd=[];
	toHtml(){
		
	}
}

class CMD{
	
}
class Moveto extends CMD{
	name='Moveto';
	type='m';
}
class Lineto extends CMD{
	name='Lineto';
	type='L';
}
class Curvto extends CMD{
	name='Curvto';
	type='c';
}
class Arcto extends CMD{
	name='Arcto';
	type='a';
}
class Horizontal extends CMD{
	name='Horizontal';
	type='h';
}
class Vertical extends CMD{
	name='Vertical';
	type='v';
}
class ClosePath extends CMD{
	name='ClosePath';
	type='z';
}
class Quadratic extends CMD{
	name='Quadratic';
	type='q';
}
class Shorthand extends CMD{
	name='Shorthand';
	type='t';
}
let get = (e,a)=>$(e).attr(a);
let container = new SVG();
let svg = {path:[], ellipse:[]};
function getSVG(){return container.getSVG()};

function getCmdTypes(){
	return [{label:'Move to', value:'M'},{label:'Line to', value:'L'}];
}
function getPath(id){
	return container.getPath(id);
};
function getEllipse(id){
	return container.getEllipse(id);
};
function getPoint(id){
	return container.getPoint(id);
}

function isStart(id){
	return container.isStart(id);
}
function isEnd(id){
	return container.isEnd(id);
}
function typeofPoint(id){
	return container.typeofPoint(id);
}
function previousCmd(id){
	return container.previousCmd(id);
}
function isAbsolute(id){
	return container.isAbsolute(id);
}

function getPreviousAbsolutePoint(id){
	return container.getPreviousAbsolutePoint(id);
}


function getAbsolutePoint(id){
	return container.getAbsolutePoint(id);
}

function getRelativePoint(id){
	return container.getRelativePoint(id);
}


function getLocationPoints(id){
	return container.getLocationPoints(id);
}

function getLocationPointsByPath(id){
	return container.getLocationPointsByPath(id);
}

function fillObj(jqEle, model){
	let newObj = model;
	for(let k in model){
		newObj[k] = get(jqEle, k);
	}
	return newObj;
}

function updateEllipseValue(ellipse, attr, value){
	ellipse[attr] = value;
	$('#'+ellipse.id).attr(attr,value);
}

function updatePointValue(path, cmdId, value){
	let cmd = path.$commands.find(c=>{return c.id==cmdId});
	cmd.value = value;
	path.d = path.$commands.map(e=>{return e.type+e.value}).join(' ');
	//renderSvgCancvs();
	$('#'+path.id).attr('d',path.d);
}

function updatePointType(path, cmdId, type){
	let cmd = path.$commands.find(c=>{return c.id==cmdId});
	if(cmd.type==type){
		return;
	}
	let absPoint = getLocationPoints(cmdId);
	
	if (cmd.type.match(/[a-z]/)){
		let newP = absPoint.absolutePaths.find(e=>e.id==cmdId);
		if(newP){
			if (newP.type == 'h'){
				cmd.value = newP.x;
			}else if (newP.type == 'v'){
				cmd.value = newP.y;
			}else if (newP.type=='c'){//CX=X0-x0+cx
				let valSplit = (cmd.value||'').split(/[\s,]+/);
				valSplit[0] = Number(valSplit[0]) + (newP.x - Number(valSplit[4]));
				valSplit[1] = Number(valSplit[1]) + (newP.y - Number(valSplit[5]));
				
				valSplit[2] = Number(valSplit[2]) + (newP.x - Number(valSplit[4]));
				valSplit[3] = Number(valSplit[3])+ (newP.y - Number(valSplit[5]));
				
				valSplit[4] = newP.x;
				valSplit[5] = newP.y;
				
				cmd.value = valSplit.join(' ');
			}else if (['a','c','s','q','t'].indexOf(newP.type) != -1){
				let valSplit = (cmd.value||'').split(/[\s,]+/);
				valSplit[valSplit.length-1] = newP.y;
				valSplit[valSplit.length-2] = newP.x;
				cmd.value = valSplit.join(' ');
			}else if (newP.type=='l'){
				let valSplit = (cmd.value||'').split(/[\s,]+/);
				valSplit[valSplit.length-1] = newP.y;
				valSplit[valSplit.length-2] = newP.x;
				cmd.value = valSplit.join(' ');
			}
		}
	}else if (cmd.type.match(/[A-Z]/)){
		let newP = absPoint.relativePaths.find(e=>e.id==cmdId);
		if(newP){
			if (newP.type == 'H'){
				cmd.value = newP.x;
			}else if (newP.type == 'V'){
				cmd.value = newP.y;
			}else if (newP.type == 'C'){// cx=CX-X=CX-X0+x0
				let valSplit = (cmd.value||'').split(/[\s,]+/);
				
				valSplit[0] = Number(valSplit[0]) + (newP.x - Number(valSplit[4]));
				valSplit[1] = Number(valSplit[1]) + (newP.y - Number(valSplit[5]));
				
				valSplit[2] = Number(valSplit[2]) + (newP.x - Number(valSplit[4]));
				valSplit[3] = Number(valSplit[3]) + (newP.y - Number(valSplit[5]));
				
				valSplit[4] = newP.x;
				valSplit[5] = newP.y;
				
				cmd.value = valSplit.join(' ');
			}else if (['A','C','S','Q','T'].indexOf(newP.type) != -1){
				let valSplit = (cmd.value||'').split(/[\s,]+/);
				valSplit[valSplit.length-1] = newP.y;
				valSplit[valSplit.length-2] = newP.x;
				cmd.value = valSplit.join(' ');
			}else if (newP.type=='L'){
				let valSplit = (cmd.value||'').split(/[\s,]+/);
				valSplit[valSplit.length-1] = newP.y;
				valSplit[valSplit.length-2] = newP.x;
				cmd.value = valSplit.join(' ');
			}
		}
	}
	cmd.type = type;
	path.d = path.$commands.map(e=>{return e.type+e.value}).join(' ');
	//renderSvgCancvs();
	$('#'+path.id).attr('d',path.d);
	$('#'+cmd.id).val(cmd.value);
}
function addPointer(path, type, value){
	let newPoint = {type:type, value:value, id:'cmd-'+Math.floor(Math.random()*1000000)};
	if(type=='z' || type=='Z'){
		newPoint.value='';
		newPoint.id=value||newPoint.id;
	}
	path.$commands.push(newPoint);
	path.d = path.$commands.map(e=>{return e.type+e.value}).join(' ');
	$('#'+path.id).attr('d',path.d);
	createCmdElement(path, newPoint);
}
function removePointer(path, cmdId){
	path.$commands = path.$commands.filter(c=>{return c.id!=cmdId});
	path.d = path.$commands.map(e=>{return e.type+e.value}).join(' ');
	$('#'+path.id).attr('d',path.d);
}


function initSVG(){
	let svg = getSVG();
	$('#drawing-container').find('ellipse').each((i, e)=>{
		container.fillEllipse(e);
	});
	$('#drawing-container').find('path').each((i, e)=>{
		container.fillPath(e);
	});
}
initSVG();
console.log(svg);

var originalSVG = JSON.parse(JSON.stringify(getSVG()));
function getOldSVG(){
	return originalSVG;
}

function createSvgPath(){
	let newPath = {id:'svg_'+Math.floor(Math.random()*1000000),stroke:"#000",opacity:"NaN",d:"M0 0",$commands:[{id:'cmd-'+Math.floor(Math.random()*1000000),type:"M",value:"0 0"}]};
	let svg = getSVG();
	svg.path.push(newPath);
	$('#svg-ctrl-panel').append(createPathElement(newPath, svg.path.length-1));
	//$('#drawing-container g').append(`<path fill="none" d="M0 0" id="${newPath.id}" stroke="#000"></path>`);
	$('#drawing-container g').html($('#drawing-container g').html() + `<path fill="none" d="M0 0" id="${newPath.id}" stroke="#000"></path>`);
	return newPath;
}

function createSvgEllipse(){
	let w = $('#drawing-container')[0].getBoundingClientRect().width/2;
	let h = $('#drawing-container')[0].getBoundingClientRect().height/2;
	w = Math.floor(w);
	h = Math.floor(h);

	let newEllipse = {id:'svg_'+Math.floor(Math.random()*1000000),cx:w,cy:h,rx:0,ry:0,stroke:"#000",fill:'none'};
	let svg = getSVG();
	svg.ellipse.push(newEllipse);
	$('#svg-ctrl-panel').append(createEllipseElement(newEllipse, svg.ellipse.length-1));
	$('#drawing-container g').html($('#drawing-container g').html() + `<ellipse fill="none" cx="${w}" cy="${h}" id="${newEllipse.id}" rx="0" ry="0" stroke="#000"></ellipse>`);
	return newEllipse;
}


function deletePath(event){
	$(event.target ).closest("section").remove();
	let section = $(event.target).closest("section");
	let triggerId = section.attr('key');
	$('#'+triggerId).remove();
}
function deleteEllipse(event){
	deletePath(event);
}


function moveto(event){
	let section = $(event.target).closest("section");
	let triggerId = section.attr('key');
	if (!triggerId){
		return;
	}
	let svg = getSVG();
	
	if (section.is('.path')){
		let path = svg.path.find((p)=>{return p.id == triggerId});
		addPointer(path, 'm', '0,0');
		
	}
}
function lineto(event){
	let section = $(event.target).closest("section");
	let triggerId = section.attr('key');
	if (!triggerId){
		return;
	}
	let svg = getSVG();
	
	if (section.is('.path')){
		let path = svg.path.find((p)=>{return p.id == triggerId});
		addPointer(path, 'l', '0,0');
		
	}
}

function renderCtrlPanel(){
	let svg = getSVG();
	$('#svg-ctrl-panel').children('section').remove();
	svg.ellipse.forEach((e,i)=>{
		$('#svg-ctrl-panel').append(createEllipseElement(e, i));
	});
	
	svg.path.forEach((e,i)=>{
		$('#svg-ctrl-panel').append(createPathElement(e, i));
	});
}
renderCtrlPanel();

function renderSvgCancvs(){
	let svg = getSVG();
	let createAttrsStr = (model)=>{
		let content = [];
		for(let k in model){
			if(!model[k] || k.charAt(0)=='$')continue;
			content.push(`${k}="${model[k]}"`);
		}
		return content.join(' ');
	};
	let createEllipseStr = (ellipse)=>{
		if(!ellipse){return};
		return `<ellipse ${createAttrsStr(ellipse)}/>`;
	};
	let createPathStr = (path)=>{
		if(!path){return};
		return `<path ${createAttrsStr(path)}/>`;
	};
	
	
	
	$('#drawing-container #main-group').html(`
		${svg.ellipse.map(e=>createEllipseStr(e)).join('\n')}
		${svg.path.map(e=>createPathStr(e)).join('\n')}
	 `);
}
renderSvgCancvs();

function createEllipseElement(ellipse, index){
	return `<section  class="ellipse ${ellipse.id}" key="${ellipse.id}">
		<h2>Ellipse  ${ellipse.id}
			<a class="icon">
				<i title="delete ellipse" class="icon-del" onclick="deleteEllipse(event)"></i>
				<i title="relocation" class="icon-reminder" onclick="relocation(event)"></i>
				<i title="expand or unexpand" class="icon-down" onclick="expand(event)"></i>
				<i title="reset" class="icon-plan"  onclick="reset(event)"></i>
			</a>
			<a class="officerich svgicon">
				<i class="svg-zoom-in-29650030" onclick="zoomIn(event, false)">
					<svg class="icon" aria-hidden="true">
						<use href="#svg-zoom-in-29650030"></use>
					</svg>
				</i>
				<i class="svg-zoom-out-29650020" onclick="zoomIn(event, true)">
					<svg class="icon" aria-hidden="true">
						<use href="#svg-zoom-out-29650020"></use>
					</svg>
				</i>
				<i class="icon-plan"  onclick="openSetting(event)">Setting</i>
			</a>
		</h2>
		<ul class="ctrl-svn-path">
			<div class="circleX"><span class="label">Circle X</span><input default-value="${ellipse.cx}" property="ellipse.cx" type="select" value="${ellipse.cx}" required="required" id="${ellipse.id}_cx" /></div>
			<div class="circleY"><span class="label">Circle Y</span><input default-value="${ellipse.cy}" property="ellipse.cy" type="select" value="${ellipse.cy}"  required="required"  id="${ellipse.id}_cy"/>
				<a class="icon">
					<i class="icon-scan1" onclick="relocation(event)">Circle</i>
				</a>
			</div>
			<div  class="rectX"><span class="label">Rect X</span><input default-value="${ellipse.rx}" property="ellipse.rx" type="select" value="${ellipse.rx}"  required="required"  id="${ellipse.id}_rx"/>
			</div>
			<div class="rectY">
				<span class="label">Rect Y</span>
				<input property="ellipse.ry" type="select" default-value="${ellipse.ry}" value="${ellipse.ry}"  required="required"  id="${ellipse.id}_ry"/>
				<a class="icon">
					<i class="icon-scan1" onclick="usescanCircle(event, 'point')">End Point</i>
				</a>
			</div>
		</ul>
	</section>`
}

function createCmdElement(path, cmd){
	$(`section[key="${path.id}"] ul.ctrl-svn-path`).append(getCmdElement(cmd));
}
function getCmdElement(cmd){
	let options = container.options;
	
	let actions = container.actions;
	let types = {z:'checkbox',Z:'checkbox'};
	let actionMap ={
		c:[{icon:'icon-jingbao', fn:'select', title:'select'}]
	}
	let check = (p)=>p.charAt(0)<='Z'&&p.charAt(0)>='A';
	let titles = {
		c:`”A rx,ry xAxisRotate LargeArcFlag,SweepFlag x,y“。
解构它，
rx和ry分别是x和y方向的半径，
而LargeArcFlag的值要到是0要么是1，用来确定是要画小弧（0）还是画大弧（1）。SweepFlag也要么是0要么是1，用来确定弧是顺时针方向（1）还是逆时针方向（0）。x和y是目的地的坐标。`
	}
					
	
	return `<div class="cmd-item">
					<span title="${titles[cmd.type]}" class="cmd-label">${options[cmd.type]||cmd.type||'NONE'}</span>
					<input property="cmd.type" name="type" type="checkbox" value="${cmd.type}" ${check(cmd.type)?'checked':''} class="cmd-type"></input>
					<span class="cmd-type">${cmd.type}</span>
					<a class="cmd-action icon">
						<i class="icon-del" onclick="removeCommand(event)"></i>
						<i class="icon-plus" onclick="insertCommand(event)"></i>
						${(actionMap[cmd.type]||[]).map((e)=>{return `<i title="${e.title}" class="${e.icon}" onclick="${e.fn}(event, '${cmd.id}')"></i>`}).join('\n')}
						${(actions[cmd.type]||[]).map((e)=>{return `<i class="icon-scan1" onclick="usescan(event, '${e}')">${e}</i>`}).join('\n')}
						
					</a>
					<input id="${cmd.id}" default-value="${cmd.value}" name="${options[cmd.type]||cmd.type||'NONE'}" type="${types[cmd.type] || 'text'}" value="${cmd.value}" ${cmd.type=='z'||cmd.type=='Z'?'checked':''} class="cmd-input"/>
			</div>`;
}
function createPathElement(path, index){
	let dv = path.d;
	let commands = path.$commands||[];
	
	
	return `<section class="path ${path.id}" key="${path.id}">
		<h2>Path ${path.id}
			<a class="icon">
				<i class="icon-del" onclick="deletePath(event)"></i>
				<i class="icon-more" onclick="moveto(event)"></i>
				<i class="icon-minus" onclick="lineto(event)"></i>
				<i class="icon-reminder" onclick="relocation(event)"></i>
				<i class="icon-down" onclick="expand(event)"></i>
				<i class="icon-plan"  onclick="reset(event)"></i>
				
			</a>
			<a class="officerich svgicon">
				<i class="svg-zoom-in-29650030" onclick="zoomIn(event, false)">
					<svg class="icon" aria-hidden="true" title="Zoom In">
						<use href="#svg-zoom-in-29650030"></use>
					</svg>
				</i>
				<i class="svg-zoom-out-29650020" onclick="zoomIn(event, true)">
					<svg class="icon" aria-hidden="true" title="Zoom Out">
						<use href="#svg-zoom-out-29650020"></use>
					</svg>
				</i>
				
				<i class="icon-plan"  onclick="openSetting(event)">Setting</i>
			</a>
			
		</h2>
		<ul class="ctrl-svn-path">
			${commands.map(e=>getCmdElement(e)).join('\n')}
		</ul>
	</section>`
}


function openSetting(event){
	let section = $(event.target).closest("section");
	let triggerId = section.attr('key');
	let elemt = getPath(triggerId) || getEllipse(triggerId);
	
	var settingReset = (ev)=>{
		let property = $(ev.target).closest("div").attr('property');
		let oldContainer = new SVG(getOldSVG());
		elemt[property] = (oldContainer.getPath(triggerId) || oldContainer.getEllipse(triggerId))[property];
		if(elemt[property]){
			$('#'+triggerId).attr(property, elemt[property]);
		}else{
			$('#'+triggerId).removeAttr(property);
		}
		properties[property](elemt);
	}
	
	var settingChange = (ev)=>{
		let name = $(ev.target).attr('name');
		let inputValue = $(ev.target).val();
		if(name == "Fill"){
			$('#'+triggerId).attr('fill', inputValue);
			elemt.fill = inputValue;
		}else if(name == "Fill-checkbox"){
			if(!ev.target.checked){
				$('#'+triggerId).removeAttr('fill');
				$('#fill-stroke input[name="Fill"]').attr('disabled','disabled');
				elemt.fill = null;
			}
			else{
				$('#'+triggerId).attr('fill', 'none');
				$('#fill-stroke input[name="Fill"]').removeAttr('disabled');
				elemt.fill = 'none';
			}
		}else if(name == "Stroke"){
			$('#'+triggerId).attr('stroke', inputValue);
			elemt.stroke = inputValue;
		}else if(name == "Stroke-checkbox"){
			if(!ev.target.checked){
				$('#'+triggerId).removeAttr('stroke');
				$('#fill-stroke input[name="Stroke"]').attr('disabled','disabled');
				elemt.stroke = null;
			}
			else{
				$('#'+triggerId).attr('stroke', $('#fill-stroke input[name="Stroke"]').val());
				$('#fill-stroke input[name="Stroke"]').removeAttr('disabled');
				elemt.stroke = $('#fill-stroke input[name="Stroke"]').val();
			}
		}else if(name == "Opacity"){
			if (inputValue == 1000){
				elemt.opacity = null;
				$('#'+triggerId).attr('opacity', 1);
			}
			$('#'+triggerId).attr('opacity', Number(inputValue/1000).toFixed(3));
		}else if(name == "Opacity-checkbox"){
			if(!ev.target.checked){
				$('#'+triggerId).removeAttr('opacity');
				$('#fill-stroke input[name="Opacity"]').attr('disabled','disabled');
				elemt.stroke = null;
			}
			else{
				inputValue = $('#fill-stroke input[name="Opacity"]').val();
				$('#'+triggerId).attr('opacity', Number(inputValue/1000).toFixed(3));
				$('#fill-stroke input[name="Opacity"]').removeAttr('disabled');
				elemt.opacity = Number(inputValue/1000).toFixed(3);
			}
		}
	}
	var applyFill = (elemt)=>{
		if (elemt.fill && elemt.fill!='none'){
			$('#fill-stroke input[name="Fill"]').val(elemt.fill);
			$('#fill-stroke input[name="Fill-checkbox"]')[0].checked = true;
			$('#fill-stroke input[name="Fill"]').removeAttr('disabled');
		}else{
			$('#fill-stroke input[name="Fill"]').val('');
			$('#fill-stroke input[name="Fill-checkbox"]')[0].checked = false;
			$('#fill-stroke input[name="Fill"]').attr('disabled','disabled');
		}
	}
	var applyStroke = (elemt)=>{
		if (elemt.stroke){
			$('#fill-stroke input[name="Stroke"]').val(elemt.fill);
			$('#fill-stroke input[name="Stroke-checkbox"]')[0].checked = true;
			$('#fill-stroke input[name="Stroke"]').removeAttr('disabled');
		}else{
			$('#fill-stroke input[name="Stroke"]').val('');
			$('#fill-stroke input[name="Stroke-checkbox"]')[0].checked = false;
			$('#fill-stroke input[name="Stroke"]').attr('disabled','disabled');
		}
	}
	var applyOpacity = (elemt)=>{
		let opacity =1000;
		try{
			if(!elemt.opacity && elemt.opacity!=0 && elemt.opacity!='0'){
				opacity = 1000;
			}else{
				opacity = Number(elemt.opacity) * 1000;
				if (isNaN(opacity)){
					opacity = 1000;
				}
			}
		}catch(e){
			opacity = 1000;
		}
		$('#fill-stroke input[name="Opacity"]').val(opacity);
	}
	
	var properties ={fill:applyFill, stroke:applyStroke, opacity:applyOpacity};
	var applyedDefaultValue =(elemt)=>{
		for(let key in properties){
			properties[key](elemt);
		}
	}
	
	var initSetting = ()=>{
		applyedDefaultValue(elemt);
		$('#fill-stroke input').on('input', settingChange);
		$('#fill-stroke span').on('click', settingReset);
		return {settingChange, settingReset}
	}
	
	var settingClose = (settingCfg)=>{
		$('#fill-stroke input').off('input', settingCfg.settingChange);
		$('#fill-stroke span').off('input', settingCfg.settingReset);
		svgHandle.openSetting = null;
	}
	
	if($(event.target).is('.selected')){
		let handleEvent = svgHandle.openSetting;
		$(event.target).removeClass('selected');
		$('#fill-stroke').hide();
		settingClose(handleEvent);
		
	}else{
		if(svgHandle.openSetting){
			return;
		}
		$(event.target).addClass('selected');
		$('#fill-stroke').show();
		svgHandle.openSetting = initSetting();
	}
}

function expand(event){
	let section = $(event.target).closest("section");
	if($(event.target).is('.icon-right')){
		$(event.target).addClass('icon-down').removeClass('icon-right');
		section.children('ul').show();
	}else if($(event.target).is('.icon-down')){
		$(event.target).removeClass('icon-down').addClass('icon-right');
		section.children('ul').hide();
	}
}

function dragHandle(btnEvent, drawingId, beforeHoverAction, hoverAction, startDrag, endDrag){
	let initDrag = ()=>{
		
		let originalPath = {};
		var initPathInfo = ()=>{
			if(beforeHoverAction){
				beforeHoverAction(originalPath);	
			}
		}
		
		
		let mouseStart = false;
		let startPoint = {x:0,y:0};
		if(startDrag){
			startDrag();
		}
		
		let down = (e)=>{
			if(e.button != 0){
				return;
			}
			console.log('start relocation.');
			mouseStart = true;
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			initPathInfo();
		};
		
		let up = (e)=>{
			mouseStart = false;
			console.log('end relocation.');
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			
		};
		
		
		
		let hover = (ev, params)=>{
			if(!mouseStart){
				return;
			}
			let offsetX = startPoint.x - params.ev.clientX;
			let offsetY = startPoint.y - params.ev.clientY;
			if(hoverAction){
				console.log(offsetX, offsetY)
				hoverAction(originalPath, offsetX, offsetY);
			}
		}
		
		return {hover, down, up};
	}
	
	let proxyInputEle = '#mousemoveto';

	if($(btnEvent.currentTarget).is('.selected')){
		$(btnEvent.currentTarget).removeClass('selected');
		let handleEvent = svgHandle.dragHandle;
		if (handleEvent){
			$(proxyInputEle).off('mousemoveto',handleEvent.hover);
			$('#drawing-container').off('mousedown', handleEvent.down);
			$('#drawing-container').off('mouseup', handleEvent.up);
		}
		
		if(drawingId){
			if(handleEvent.stroke){
				$('#'+drawingId).css({'stroke':handleEvent.stroke});
			}else{
				$('#'+drawingId).css({'stroke':null});
			}
		}
		if(endDrag){
			endDrag();
		}
		
		
	}else{
		$(btnEvent.currentTarget).addClass('selected');
		let handleEvent = initDrag();
		svgHandle.dragHandle = handleEvent;
		
		$(proxyInputEle).on('mousemoveto', handleEvent.hover);
		$('#drawing-container').on('mousedown', handleEvent.down);
		$('#drawing-container').on('mouseup', handleEvent.up);
		
		if(drawingId){
			handleEvent.stroke = $('#'+drawingId).css('stroke');
			$('#'+drawingId).css({'stroke':'red'});
		}
	}
}

function reset(event){
	let section = $(event.target).closest("section");
	let sectionId = section.attr("key");
	let path = getPath(sectionId);
	let ellipse = getEllipse(sectionId);
	
	if (path){
		let oldsvg = getOldSVG();
		let oldPath = oldsvg.path.find(p=>p.id==path.id);
		for(let k in path){
			if(!oldPath[k]){
				path[k] =null;
				continue;
			}
			path[k] = (typeof oldPath[k] =='string' || typeof oldPath[k] =='number')?oldPath[k]:JSON.parse(JSON.stringify(oldPath[k]));
		}
		for(let cmd of path.$commands){
			$('#'+cmd.id).val(cmd.value);
			updatePointValue(path, cmd.id, cmd.value);
		}
	}else if (ellipse){
		let oldsvg = getOldSVG();
		let oldellipse = oldsvg.ellipse.find(p=>p.id==ellipse.id);
		for(let k in ellipse){
			if(!oldellipse[k]){
				ellipse[k] =null;
				continue;
			}
			ellipse[k] = (typeof oldellipse[k] =='string' || typeof oldellipse[k] =='number')?oldellipse[k]:JSON.parse(JSON.stringify(oldellipse[k]));
		}
		let cr = ['cx','cy','rx','ry'];
		for(let k of cr){
			updateEllipseValue(ellipse, k, ellipse[k]);
			$(`#${ellipse.id}_${k}`).val(ellipse[k]);
		}
	}
	
}

let zoomSize = 1;

function zoomIn(event, inOrOut=true){
	let section = $(event.target).closest("section");
	let sectionId = section.attr("key");
	let path = getPath(sectionId);
	let ellipse = getEllipse(sectionId);
	
	let beforeHoverAction = (originalPath)=>{
	}
	
	let hoverAction = (originalPath, offsetX, offsetY)=>{
		zoomSize = zoomSize + (inOrOut ? -0.25:0.25);
		if(zoomSize > 5){
			zoomSize = 5;
		}
		if(zoomSize < 0.25){
			zoomSize =  0.25;
		}
	
		let zoomPrecent = zoomSize;
		if(section.is('.path')){
			let oldsvg = getOldSVG();
			let oldPath = oldsvg.path.find(p=>p.id==path.id);
			let index = 0;
			let oldContainer = new SVG(getOldSVG());
			for(let cmd of path.$commands){
				let oldCmd = oldPath.$commands[index++];
				
				let oldVal = ((oldCmd.value||'')+'').trim().split(/[\s,]+/);
				let val = ((cmd.value||'')+'').trim().split(/[\s,]+/);
				
				if (cmd.type=='Z' || cmd.type=='z' || cmd.type=='M' || cmd.type=='m'){
					continue;
				}
				if (cmd.type=='H' || cmd.type=='h'){
					let point = oldContainer.getRelativePoint(cmd.id);
					val[0] = point.x * zoomPrecent;
				}else if (cmd.type=='V' || cmd.type=='v'){
					let point = oldContainer.getRelativePoint(cmd.id);
					val[0] = point.y * zoomPrecent;
				}else if (cmd.type.charAt(0)<='Z' && cmd.type.charAt(0)>='A' && val.length >= 2){
					let point = oldContainer.getRelativePoint(cmd.id);
					val[val.length-2] = point.x * zoomPrecent;
					val[val.length-1] = point.y * zoomPrecent;
				}else if (cmd.type.charAt(0)<='z' && cmd.type.charAt(0)>='a' && val.length >= 2){
					val[val.length-2] = oldVal[oldVal.length-2] * zoomPrecent;
					val[val.length-1] = oldVal[oldVal.length-1] * zoomPrecent;
				}else{
					//console.error('unknow position path.');
					//continue;
				}
				cmd.value = val.join(' ');
				$('#'+cmd.id).val(cmd.value);
			}
			
			for(let cmd of path.$commands){
				updatePointValue(path, cmd.id, cmd.value);
			}
			
		}else if(section.is('.ellipse')){
			let oldsvg = getOldSVG();
			let oldellipse = oldsvg.ellipse.find(p=>p.id==ellipse.id);
			updateEllipseValue(ellipse, 'rx', oldellipse.rx * zoomPrecent);
			$(`#${ellipse.id}_rx`).val(ellipse.rx);
			updateEllipseValue(ellipse, 'ry',  oldellipse.ry * zoomPrecent);
			$(`#${ellipse.id}_ry`).val(ellipse.ry);
		}
	}
	hoverAction();
	//dragHandle(event, sectionId, beforeHoverAction, hoverAction);
}
function relocation(event){
	
	let section = $(event.target).closest("section");
	let sectionId = section.attr("key");
	
	let proxyInputEle = section.find('input').first();
	let path = getPath(sectionId);
	let ellipse = getEllipse(sectionId);
	
	
	let initDrag = ()=>{
		
		let originalPath = {};
		var initPathInfo = ()=>{
			let ret = getLocationPointsByPath(sectionId);
			if(section.is('.path')){
				for(let cmd of path.$commands){
					let val = ((cmd.value||'')+'').trim().split(/[\s,]+/);
					if (cmd.type=='Z' || cmd.type=='z'){
						continue;
					}
					if ((cmd.type=='M' || cmd.type=='m') && val.length == 2){
						originalPath[cmd.id] = {x:Number(val[0]),y:Number(val[1])};
					}else if (cmd.type=='H'){
						originalPath[cmd.id] = {x:Number(val[0])};
					}else if (cmd.type=='V'){
						originalPath[cmd.id] = {y:Number(val[0])};
					}else if (cmd.type.charAt(0)<='Z' && cmd.type.charAt(0)>='A' && val.length >= 2){
						originalPath[cmd.id] = {x:Number(val[val.length-2]),y:Number(val[val.length-1])};
					}
				}
			}else if(section.is('.ellipse')){
				originalPath.cx = Number(ellipse.cx);
				originalPath.cy = Number(ellipse.cy);
				originalPath.rx = Number(ellipse.rx);
				originalPath.rx = Number(ellipse.rx);
			}
		}
		
		
		let mouseStart = false;
		let startPoint = {x:0,y:0};
		
		let down = (e)=>{
			if(e.button != 0){
				return;
			}
			console.log('start relocation.');
			mouseStart = true;
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			initPathInfo();
		};
		
		let up = (e)=>{
			mouseStart = false;
			console.log('end relocation.');
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			
		};
		
		
		
		let hover = (ev, params)=>{
			if(!mouseStart){
				return;
			}
			let offsetX = startPoint.x - params.ev.clientX;
			let offsetY = startPoint.y - params.ev.clientY;
			
			if(section.is('.path')){
				for(let cmd of path.$commands){
					let val = ((cmd.value||'')+'').trim().split(/[\s,]+/);
					if (cmd.type=='Z' || cmd.type=='z'){
						continue;
					}
					if ((cmd.type=='M' || cmd.type=='m') && val.length == 2){
						val[0] = originalPath[cmd.id].x - offsetX;
						val[1] = originalPath[cmd.id].y - offsetY;
					}else if (cmd.type=='H'){
						val[0] = originalPath[cmd.id].x - offsetX;
					}else if (cmd.type=='V'){
						val[0] = originalPath[cmd.id].y - offsetY;
					}else if (cmd.type.charAt(0)<='Z' && cmd.type.charAt(0)>='A' && val.length >= 2){
						val[val.length-2] = originalPath[cmd.id].x - offsetX;
						val[val.length-1] = originalPath[cmd.id].y - offsetY;
					}else{
						//console.error('unknow position path.');
						//continue;
					}
					cmd.value = val.join(' ');
					$('#'+cmd.id).val(cmd.value);
				}
				
				for(let cmd of path.$commands){
					updatePointValue(path, cmd.id, cmd.value);
				}
				
			}else if(section.is('.ellipse')){
				updateEllipseValue(ellipse, 'cx', originalPath.cx - offsetX);
				$(`#${ellipse.id}_cx`).val(ellipse.cx);
				updateEllipseValue(ellipse, 'cy', originalPath.cy - offsetY);
				$(`#${ellipse.id}_cy`).val(ellipse.cy);
			}
		}
		
		return {hover, down, up};
	}
	
	
	
	
	

	if($(event.target).is('.selected')){
		$(event.target).removeClass('selected');
		let handleEvent = svgHandle.relocation;
		if (handleEvent){
			$(proxyInputEle).off('mousemoveto',handleEvent.hover);
			$('#drawing-container').off('mousedown', handleEvent.down);
			$('#drawing-container').off('mouseup', handleEvent.up);
		}
		
		if(handleEvent.stroke){
			$('#'+sectionId).css({'stroke':handleEvent.stroke});
		}else{
			$('#'+sectionId).css({'stroke':null});
		}
		
	}else{
		$(event.target).addClass('selected');
		let handleEvent = initDrag();
		svgHandle.relocation = handleEvent;
		
		$(proxyInputEle).on('mousemoveto', handleEvent.hover);
		$('#drawing-container').on('mousedown', handleEvent.down);
		$('#drawing-container').on('mouseup', handleEvent.up);
		
		handleEvent.stroke = $('#'+sectionId).css('stroke');
		$('#'+sectionId).css({'stroke':'red'});
	}
}



function removeCommand(event){
	let section = $(event.target).closest("section");
	let triggerId = section.attr('key');
	let inputId = $(event.target).closest("a").siblings("input.cmd-input").attr('id');
	let type = $(event.target).closest("div").children('span').text();
	if (!triggerId){
		return;
	}
	let svg = getSVG();
	
	if (section.is('.path')){
		let values = [];
		
		let path = svg.path.find((p)=>{return p.id == triggerId});
		removePointer(path, inputId);
		$(event.target).closest("div").remove();
		
	}
}

function insertCommand(event){
	let section = $(event.target).closest("section");
	let triggerId = section.attr('key');
	let inputId = $(event.target).siblings("input.cmd-input").attr('id');
	let type = $(event.target).closest("div").children('span').text();
	if (!triggerId){
		return;
	}
	let svg = getSVG();
	
	if (section.is('.path')){
		let values = [];
		
		let path = svg.path.find((p)=>{return p.id == triggerId});
		addPointer(path, type, '');
		
	}
}

function usescanCircle(event, type){
	let section = $(event.target).closest("section");
	let sectionId = section.attr("key");
	let proxyInputEle = '[key="' + sectionId +'"] .circleX input';
	let drawingId = sectionId;
	let ellipse = getEllipse(sectionId);
	
	let initDrag = ()=>{
		
		let originalPath = {};
		var initPathInfo = ()=>{
			originalPath.rx = ellipse.rx;
			originalPath.ry = ellipse.ry;
		}
		
		
		let mouseStart = false;
		let startPoint = {x:0,y:0};
		
		let down = (e)=>{
			if(e.button != 0){
				return;
			}
			console.log('start relocation.');
			mouseStart = true;
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			initPathInfo();
		};
		
		let up = (e)=>{
			mouseStart = false;
			console.log('end relocation.');
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			
		};
		
		
		
		let hover = (ev, params)=>{
			if(!mouseStart){
				return;
			}
			let offsetX = startPoint.x - params.ev.clientX;
			let offsetY = startPoint.y - params.ev.clientY;
			
			if(type == 'point'){
				updateEllipseValue(ellipse, 'rx', Math.abs(originalPath.rx - offsetX));
				$(`#${ellipse.id}_rx`).val(ellipse.rx);
				updateEllipseValue(ellipse, 'ry', Math.abs(originalPath.ry - offsetY));
				$(`#${ellipse.id}_ry`).val(ellipse.ry);
			}
		}
		
		return {hover, down, up};
	}
	
	if($(event.target).is('.selected')){
		let handleEvent = svgHandle.usescanCircle;
		$(event.target).removeClass('selected');
		if (handleEvent){
			$(proxyInputEle).off('mousemoveto',handleEvent.hover);
			$('#drawing-container').off('mousedown', handleEvent.down);
			$('#drawing-container').off('mouseup', handleEvent.up);
		}
		
		if(handleEvent.stroke){
			$('#'+drawingId).css({'stroke':handleEvent.stroke});
		}else{
			$('#'+drawingId).css({'stroke':null});
		}
		svgHandle.usescanCircle = null;
	}else{
		if(svgHandle.usescanCircle){
			return;
		}
		$(event.target).addClass('selected');
		let handleEvent = initDrag();
		svgHandle.usescanCircle = handleEvent;
		
		$(proxyInputEle).on('mousemoveto', handleEvent.hover);
		$('#drawing-container').on('mousedown', handleEvent.down);
		$('#drawing-container').on('mouseup', handleEvent.up);
		
		handleEvent.stroke = $('#'+drawingId).css('stroke');
		$('#'+drawingId).css({'stroke':'red'});
	}
}

function usescan(event, type1){
	let hovermouseStart = true;
	let inputId = $(event.target).closest(".cmd-item").children("input.cmd-input").attr('id');
	let proxyInputEle = "#"+inputId;
	let section = $(event.target).closest("section");
	let drawingId = section.attr("key");
	let cmd = getPoint(inputId);
	let path = getPath(drawingId);
	let initDrag = ()=>{
		let originalPath = {};
		var initPathInfo = ()=>{
			let val = ((cmd.value||'')+'').trim().split(/[\s,]+/);
			originalPath.value = val.map(e=>Number(e));
		}
		
		
		let mouseStart = false;
		let startPoint = {x:0,y:0};
		
		let down = (e)=>{
			if(e.button != 0){
				return;
			}
			console.log('start relocation.');
			mouseStart = true;
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			initPathInfo();
		};
		
		let up = (e)=>{
			mouseStart = false;
			console.log('end relocation.');
			startPoint.x = e.clientX;
			startPoint.y = e.clientY;
			
		};
		
		var hover = (ev, params)=>{
			if(!mouseStart){
				return;
			}
			let offsetX = startPoint.x - params.ev.clientX;
			let offsetY = startPoint.y - params.ev.clientY;
			
			let val = ((cmd.value||'')+'').trim().split(/[\s,]+/);
			if ((cmd.type=='M' || cmd.type=='m' || cmd.type=='L' || cmd.type=='l') && val.length == 2){
				val[0] = originalPath.value[0] - offsetX;
				val[1] = originalPath.value[1] - offsetY;
			}else if (cmd.type=='H'){
				val[0] = originalPath.value[0] - offsetX;
			}else if (cmd.type=='V'){
				val[0] = originalPath.value[0] - offsetY;
			}else if(cmd.type=='a' || cmd.type=='A'){
				if(type1 == 'Point1'){
					val[0] = originalPath.value[0] - offsetX;
					val[1] = originalPath.value[1] - offsetY;
				}else if(type1 == 'Point2'){
					val[5] = originalPath.value[5] - offsetX;
					val[6] = originalPath.value[6] - offsetY;
				}
			}
			else if(cmd.type=='c' || cmd.type=='C'){
				if(type1 == 'Point1'){
					val[0] = originalPath.value[0] - offsetX;
					val[1] = originalPath.value[1] - offsetY;
				}else if(type1 == 'Point2'){
					val[2] = originalPath.value[2] - offsetX;
					val[3] = originalPath.value[3] - offsetY;
				}else if(type1 == 'Point3'){
					val[4] = originalPath.value[4] - offsetX;
					val[5] = originalPath.value[5] - offsetY;
				}
			}else if(cmd.type=='Q' || cmd.type=='q' || cmd.type=='s' || cmd.type=='S'){
				
				if(type1 == 'Point1'){
					val[0] = originalPath.value[0] - offsetX;
					val[1] = originalPath.value[1] - offsetY;
				}else if(type1 == 'Point2'){
					val[2] = originalPath.value[2] - offsetX;
					val[3] = originalPath.value[3] - offsetY;
				}
			}
			else if (cmd.type.charAt(0)<='Z' && cmd.type.charAt(0)>='A' && val.length >= 2){
				val[val.length-2] = originalPath.value[val.length-2] - offsetX;
				val[val.length-1] = originalPath.value[val.length-1] - offsetY;
			}
			
			cmd.value = val.join(' ');
			$('#'+cmd.id).val(cmd.value);
			updatePointValue(path, cmd.id, cmd.value);
		}
	
		return {hover, down, up}; 
	}
	
	
	//hoverMove(hover, "#"+inputId, event);
	
	if($(event.target).is('.selected')){
		let handleEvent = svgHandle.usescan;
		$(event.target).removeClass('selected');
		if (handleEvent){
			$(proxyInputEle).off('mousemoveto',handleEvent.hover);
			$('#drawing-container').off('mousedown', handleEvent.down);
			$('#drawing-container').off('mouseup', handleEvent.up);
		}
		
		if(handleEvent.stroke){
			$('#'+drawingId).css({'stroke':handleEvent.stroke});
		}else{
			$('#'+drawingId).css({'stroke':null});
		}
		svgHandle.usescan = null;
	}else{
		if(svgHandle.usescan){
			return;
		}
		$(event.target).addClass('selected');
		let handleEvent = initDrag();
		svgHandle.usescan = handleEvent;
		
		$(proxyInputEle).on('mousemoveto', handleEvent.hover);
		$('#drawing-container').on('mousedown', handleEvent.down);
		$('#drawing-container').on('mouseup', handleEvent.up);
		
		handleEvent.stroke = $('#'+drawingId).css('stroke');
		$('#'+drawingId).css({'stroke':'red'});
	}
	
}

function hoverMove(hover, enterEle, event){
	var removehover = ()=>{
		$(enterEle).off('mousemoveto',hover);
		console.log('remove event mousemoveto');
	}
	
	$(enterEle).on('mousemoveto', hover);
	$(event.target).one('click', ()=>{
		$(enterEle).off('mousemoveto',hover);
	});
	setTimeout(()=>{
		$('#drawing-container').one('dblclick', removehover);
	}, 1000)
}

function drawpath(event){
	let proxyInputEle = '#mousemoveto';
	let drawingId,newPath;
	
	let initDrag = ()=>{
		
		let originalPath = {};
		newPath = createSvgPath();
		drawingId = newPath.id;
		
		var initPathInfo = (e)=>{
			if(newPath.$commands.length < 1){
				return;
			}
			if(newPath.$commands.length == 1 && newPath.$commands[0].value=='0 0'){
				let movetoCmd = newPath.$commands[0];
				movetoCmd.value = downPoint.x + " " + downPoint.y;
				$('#'+movetoCmd.id).val(movetoCmd.value);
				updatePointValue(newPath, movetoCmd.id, movetoCmd.value);
				addPointer(newPath, 'l', "0 0");
			}else if(newPath.$commands.length > 1 || (newPath.$commands.length == 1 && newPath.$commands[0].value!='0 0')){
				
				if(Math.abs(downPoint.x - upPoint.x) > 5 && Math.abs(downPoint.y - upPoint.y) > 5 ){
					return false;
				}
				addPointer(newPath, 'l', "0 0");
			}
			return true;
		}
		
		var createPoint = (e)=>{
			
		}
		
		
		let mouseStart = false;
		let downPoint = {x:0,y:0};
		let upPoint = {x:0,y:0};
		
		let down = (e)=>{
			if(e.button != 0){
				return;
			}
			console.log('start relocation.');
			
			downPoint.x = e.clientX;
			downPoint.y = e.clientY;
			mouseStart = initPathInfo(e);
		};
		
		let up = (e)=>{
			mouseStart = false;
			console.log('end relocation.');
			upPoint.x= e.clientX;
			upPoint.y = e.clientY;
			createPoint(e);
		};
		
		
		
		let hover = (ev, params)=>{
			if(!mouseStart){
				return;
			}
			let offsetX = params.ev.clientX - downPoint.x;
			let offsetY = params.ev.clientY - downPoint.y;
			
			if(newPath.$commands.length <= 1){
				return;
			}
			
			let lastCmd = newPath.$commands[newPath.$commands.length-1];
			updatePointValue(newPath, lastCmd.id, offsetX+" "+ offsetY);
		}
		
		return {hover, down, up, newPath};
	}
	
	let endDrag = (newPath)=>{
		addPointer(newPath, 'z');
	}
	
	if($(event.target).is('.selected')){
		let handleEvent = svgHandle.drawpath;
		$(event.target).removeClass('selected');
		
		
		
		if (handleEvent){
			endDrag(handleEvent.newPath);
			$(proxyInputEle).off('mousemoveto',handleEvent.hover);
			$('#drawing-container').off('mousedown', handleEvent.down);
			$('#drawing-container').off('mouseup', handleEvent.up);
		}
		
		if(handleEvent.stroke){
			$('#'+drawingId).css({'stroke':handleEvent.stroke});
		}else{
			$('#'+drawingId).css({'stroke':null});
		}
		svgHandle.drawpath = null;
		
	}else{
		if(svgHandle.drawpath){
			return;
		}
		$(event.target).addClass('selected');
		let handleEvent = initDrag();
		svgHandle.drawpath = handleEvent;

		
		$(proxyInputEle).on('mousemoveto', handleEvent.hover);
		$('#drawing-container').on('mousedown', handleEvent.down);
		$('#drawing-container').on('mouseup', handleEvent.up);
		
		
		handleEvent.stroke = $('#'+drawingId).css('stroke');
		$('#'+drawingId).css({'stroke':'red'});
	}
}

function select(event, cmdId){
	let section = $(event.target).closest("section");
	let sectionId = section.attr("key");
	let proxyInputEle = '[key="' + sectionId +'"] .circleX input';
	let drawingId = sectionId;
	let path = getPath(sectionId);
	let cmd = getPoint(cmdId);
	
	
	
	dragHandle(event, null, null,()=>{
		let p = getPreviousAbsolutePoint(cmdId);
		if(p){
			console.log('previous location',p);
			let v = ((cmd.value||'')+'').trim().split(/[\s,]+/);
			let absP =  getAbsolutePoint(cmdId);
			if(cmd.type=='c'){
				$('#assist').html(`<path fill="none" d="M${p.x} ${p.y} l${v[0]} ${v[1]}" stroke="#000"></path>
				<path fill="none" d="M${p.x+Number(v[0])} ${p.y+Number(v[1])} L${p.x+Number(v[2])} ${p.y+Number(v[3])} " stroke="#000"></path>
				<path fill="none" d="M${Number(p.x)+Number(v[4])} ${Number(p.y)+Number(v[5])} L${p.x+Number(v[2])} ${p.y+Number(v[3])} " stroke="#000"></path>`)
			}else{
				$('#assist').html(`<path fill="none" d="M${p.x} ${p.y} L${v[0]} ${v[1]} L${v[2]} ${v[3]} L${v[4]} ${v[5]}" stroke="#000"></path>`)
			}
		}
	}, null, ()=>{
		$('#assist').html(``)
	});
	
	
	
}
addEventListener();