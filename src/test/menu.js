

var cities=["选择一个选项","北京市","天津市","河北省","山西省","内蒙古","辽宁省","吉林省","黑龙江省","上海市","江苏省","浙江省","安徽省","福建省","江西省","山东省","河南省","湖北省","湖南省","广东省","广西省","海南省","重庆市","四川省","贵州省","云南省","西藏省","陕西省","甘肃省","青海省","宁夏省","新疆省","台湾","中国香港","澳门"];
let allMenus = [];

var changeToTab = (targetTab)=>{
	$("#menu li>a").each((index, e)=>{
		$(e).attr('select', false);
		
		var ctrl = $(e).attr('ctrl');
		if (ctrl){
			$('.'+ctrl).attr('active', false);
		}
	
	});
	$(`#menu li>a[ctlr="${targetTab}"]`).attr('select', true);
	
	
	if (targetTab){
		$('.'+targetTab).attr('active', true);
	}
}
$("#menu li>a").on("click", function(e){
	if($(e.target).attr('ctrl')=='submenu'){
		$('#submenuul').show();
		e.stopPropagation();
	}else{
		let ctrl = $(e.target).attr('ctrl');
		if($('.'+ctrl).length==0){
			//return;
		}
		changeToTab(ctrl);
	}
});
$("#submenuul li>a").on("click", function(e){
	if($(e.target).attr('ctrl')=='submenu'){
		$('#submenuul').show();
		e.stopPropagation();
	}
	let pre = $('#menu [select="true"]').closest('li');
	let ctrl = $(e.target).attr('ctrl');
	pre.remove();
	$("#submenuul").append(pre);
	
	let currentLi = $(e.target).closest('li');
	$(e.target).attr('select','true');
	currentLi.remove();
	$("#menu #submenu").before(currentLi);
	changeToTab(ctrl);
	
});
let hideSubmenu = (e)=>{
	if($(e.target).is('#submenuul')){
		return
	}
	if($(e.target).closest('#submenuul').length!=0){
		return
	}
	$("#submenuul").hide();
}
$("body").on('click',hideSubmenu);

var prov = null;
var city = null;
var district = null;

$('#provtext').on('change', (e)=>{
	let oldProv = prov;
	var provValue = e.originalEvent?.detail?.value;
	prov = addRessData().find(item=>{
		return item.value == provValue;
	});
	if(oldProv != prov){
		refreshProv();
	}
	
})


$('#citytext').on('change', (e)=>{
	let oldCity = city;
	var cityValue = e.originalEvent?.detail?.value;
	if(!prov){
		return;
	}
	city = prov.children.find(item=>{
		return item.value == cityValue;
	})
	if(oldCity != city){
		refreshCity();
	}
})


$('#districttext').on('change', (e)=>{
	let oldDistrict = district;
	var districtValue = e.originalEvent?.detail?.value;
	if(!city){
		return;
	}
	district = city.children.find(item=>{
		return item.value == districtValue;
	})
	if(oldDistrict != district){
		//refreshCity();
	}
})

var refreshProv = function(){
	if (!prov){
		return [];
	}
	let firstCity = prov.children[0].value;
	$('#citytext').val(firstCity);
	let text = firstCity;
	const eventAwesome = new CustomEvent('change', {
		  bubbles: true,
		  detail: { value: text}
	});
	$('#citytext')[0].dispatchEvent(eventAwesome);
}


var refreshCity = function(){
	if (!city){
		return [];
	}
	let firstDistrict = city.children[0].value;
	$('#districttext').val(firstDistrict);
	let text = firstDistrict;
	const eventAwesome = new CustomEvent('change', {
		  bubbles: true,
		  detail: { value: text}
	});
	$('#districttext')[0].dispatchEvent(eventAwesome);
}

var getCities = function(){
	if (!prov){
		return [];
	}
	return prov.children;
}

var getDistrict = function(){
	if (!city){
		return [];
	}
	return city.children;
}

window.getCities=getCities;
window.getDistrict=getDistrict;
window.getSex= function(){
	return [{label:'男',value:'1'},{label:'女',value:'0'}];
}

let svgFileContent = elementExtendedDetail.data.icons.map((e)=>{
	let content = $(e.show_svg).html();
	let viewbox = $(e.show_svg).attr('viewBox');
	return `<symbol id="${e.name.replaceAll(' ', '-')}" viewBox="${viewbox || '0 0 1024 1024'}"> ${content}` + $(e.show_svg).html()+'</symbol>'// .replace('<svg ', `<symbol id="${e.name.replaceAll(' ', '-')}" `).replace('</svg>','</symbol>')
}).join('\n');
$('body').append(`<svg aria-hidden="true" style="position: absolute; width: 0px; height: 0px; overflow: hidden;">${svgFileContent}</svg>`);


$('#menu li>a').each((i,e)=>{
	let ctrl = $(e).attr('ctrl');
	if($('.'+ctrl).length==0){
		
		$(e).closest('li').css('color','rgb(229 229 211)')
	}
})