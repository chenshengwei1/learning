var map = new AMap.Map('gaode-map-container', {
		zoom: 14,
		features: ['bg', 'road', 'building', 'point']
	});
function runMap(position){
	let lat=position.coords.latitude;
	let lon=position.coords.longitude;
 }
 if (window.showPositionFn.isLoaded){
	runMap(window.showPositionFn.position);
 }else{
	 window.showPositionFn.listeners.push(runMap);
 }
 

class FeaturesShowDemo{
	map;
	features = [{value:'bg',enable:true},{value:'road',enable:true},{value:'building',enable:true},{value:'point',enable:true}];
	constructor(map){
		this.map = map;
		this.map.setFeatures(this.features.map(e=>e.value));
	}
	
	//设置地图显示要素
	setMapFeatures(input) {
	  let features = [];
	  let f = this.features.find(e=>e.value==input.value);
	  f && (f.enable = input.checked);
	  this.map.setFeatures(this.features.filter(e=>e.enable).map(e=>e.value));
	}
	
	bind(selector){
		//绑定checkbox点击事件
		$(selector).find('input').on('click', (event)=>{
			this.setMapFeatures(event.target);
		})
	}
}

new FeaturesShowDemo(map).bind('.feature-input-card');







//绑定checkbox点击事件
var polygons=[];

//加载行政区划插件
//实例化DistrictSearch
var opts = {
	subdistrict: 1,   //获取边界不需要返回下级行政区
	extensions: 'all',  //返回行政区边界坐标组等具体信息
	level: 'district',  //查询行政级别为 市
	showbiz: false	// 可选为true/false，为了能够精准的定位到街道，特别是在快递、物流、送餐等场景下，强烈建议将此设置为false
};
var district = new AMap.DistrictSearch(opts);


class DistrictShowDemo{
	map;
	district; 
	citySelect;
	districtSelect;
	areaSelect;
	polygons = []; 
	citycode;
	
	itemCartSelector;
	
	constructor(map, district){
		this.map=map;
		this.district=district;
		this.district.search('中国', (status, result)=>{
        if(status=='complete'){
            this.getData(result.districtList[0]);
        }
    });
	}
	
	setCity(city){
		this.citySelect = citySelect;
	}
	setDistrict(district){
		this.districtSelect = district;
	}
	setStreet(street){
		this.areaSelect = street;
	}
	
	getData(data, level) {
        var bounds = data.boundaries;
        if (bounds) {
            for (var i = 0, l = bounds.length; i < l; i++) {
                var polygon = new AMap.Polygon({
                    map: this.map,
                    strokeWeight: 1,
                    strokeColor: '#0091ea',
                    fillColor: '#80d8ff',
                    fillOpacity: 0.2,
                    path: bounds[i]
                });
                this.polygons.push(polygon);
            }
            this.map.setFitView();//地图自适应
        }
       
        //清空下一级别的下拉列表
        if (level === 'province') {
            this.citySelect.innerHTML = '';
            this.districtSelect.innerHTML = '';
            this.areaSelect.innerHTML = '';
        } else if (level === 'city') {
            this.districtSelect.innerHTML = '';
            this.areaSelect.innerHTML = '';
        } else if (level === 'district') {
            this.areaSelect.innerHTML = '';
        }

        var subList = data.districtList;
        if (subList) {
            var contentSub = new Option('--请选择--');
            var curlevel = subList[0].level;
            var curList =  document.querySelector('.' + curlevel);
            curList.add(contentSub);
            for (var i = 0, l = subList.length; i < l; i++) {
                var name = subList[i].name;
                var levelSub = subList[i].level;
                var cityCode = subList[i].citycode;
                contentSub = new Option(name);
                contentSub.setAttribute("value", levelSub);
                contentSub.center = subList[i].center;
                contentSub.adcode = subList[i].adcode;
                curList.add(contentSub);
            }
        }
        
    }
	
	search(obj) {
        //清除地图上所有覆盖物
        for (var i = 0, l = this.polygons.length; i < l; i++) {
            this.polygons[i].setMap(null);
        }
        var option = obj[obj.options.selectedIndex];
        var keyword = option.text; //关键字
        var adcode = option.adcode;
        this.district.setLevel(option.value); //行政区级别
        this.district.setExtensions('all');
        //行政区查询
        //按照adcode进行查询可以保证数据返回的唯一性
        this.district.search(adcode, (status, result)=>{
            if(status === 'complete'){
                this.getData(result.districtList[0],obj.id);
            }
        });
		if (option.center){
			this.map.setCenter(option.center);
		}
    }
	
    setCenter(obj){
        this.map.setCenter(obj[obj.options.selectedIndex].center)
    }
	
			
	drawBounds(level, districtVal) {
	
		//行政区查询
		this.district.setLevel(level);
		this.district.search(districtVal, (status, result)=> {
			if(status !== 'complete'){return}
			
			let resultEle = $(this.itemCartSelector + ' .result');
			resultEle.html('');
			if (result.districtList.length > 1){
				
				for(let districtInfo of result.districtList){
					let displayDistrict = districtInfo.name + ' ' + districtInfo.level+ ' ' + districtInfo.citycode+ ' ' + districtInfo.adcode;
					resultEle.append(`<li citycode="${districtInfo.citycode}">${displayDistrict}</li>`);
				}
				resultEle.find('li').on('click', (e)=>{
					let cityCode = $(e.target).attr('citycode');
					let districtInfo = result.districtList.find(e => {return e.citycode == cityCode});
					if (districtInfo){
						this.drawBoundsByDistrict(districtInfo);
					}
				})
			}
			
			this.drawBoundsByDistrict(result.districtList[0]);
		});
	}

	drawBoundsByDistrict(districtInfo){
		this.map.remove(polygons)//清除上次结果
		polygons = [];
		
		var bounds = districtInfo.boundaries;
		if (bounds) {
			for (var i = 0, l = bounds.length; i < l; i++) {
				//生成行政区划polygon
				var polygon = new AMap.Polygon({
					strokeWeight: 1,
					path: bounds[i],
					fillOpacity: 0.4,
					fillColor: '#80d8ff',
					strokeColor: '#0091ea'
				});
				polygons.push(polygon);
			}
		}
		map.add(polygons)
		map.setFitView(polygons);//视口自适应
	}
	
	bindItem(selector){
		this.itemCartSelector = selector;
		$(selector + ' .btn').on('click', ()=>{
			let level = $(selector + ' .level').val();
			let district = $(selector + ' .district').val();
			this.drawBounds(level, district);
		})
	}
	
	bind(selector){
		$(selector + ' select').on('change', (event)=>{
			this.search(event.target);
		})
		this.citySelect = $(selector+' .city')[0];
		this.districtSelect = $(selector+' .district')[0];
		this.areaSelect = $(selector+' .street')[0];
	}
}
let districtShowDemo = new DistrictShowDemo(map, district);
districtShowDemo.bind('.subdistrict-input-card');
districtShowDemo.bindItem('.item-input-card');
window.mapCtrl = {
	map:map,
	districtShow:districtShowDemo
}
