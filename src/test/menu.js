

var cities=["选择一个选项","北京市","天津市","河北省","山西省","内蒙古","辽宁省","吉林省","黑龙江省","上海市","江苏省","浙江省","安徽省","福建省","江西省","山东省","河南省","湖北省","湖南省","广东省","广西省","海南省","重庆市","四川省","贵州省","云南省","西藏省","陕西省","甘肃省","青海省","宁夏省","新疆省","台湾","中国香港","澳门"];
$("#menu li>a").on("click", function(e){
	$("#menu li>a").each((index, e)=>{
		$(e).attr('select', false);
		
		var ctrl = $(e).attr('ctrl');
		if (ctrl){
			$('.'+ctrl).attr('active', false);
		}
		
		
	});
	$(e.target).attr('select', true);
	
	var ctrl = $(e.target).attr('ctrl');
	if (ctrl){
		$('.'+ctrl).attr('active', true);
	}
	
});

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
