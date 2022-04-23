function process(imgId, outputTextId){
	const imgContainer = document.getElementById('qrcodecontainer');
	const imgEl = document.getElementById(imgId);
	const imgEle = $(imgContainer).find('img')[0];
	
	var _elCanvas = document.createElement("canvas");
	_elCanvas.width = imgEl.width;
	_elCanvas.height = imgEl.height;
	imgContainer.appendChild(_elCanvas);
	
	var _oContext = _elCanvas.getContext("2d");
	_oContext.drawImage(imgEl, 0, 0, imgEl.width, imgEl.height);
	
	let imageData = _oContext.getImageData(0, 0, imgEl.width, imgEl.height);
	console.log('imageData=' + imageData);
	console.log('data=' + imageData.data);
	console.log('height=' + imageData.height);
	console.log('width=' + imageData.width);
	
	while (imgContainer.hasChildNodes())
	{
		imgContainer.removeChild(imgContainer.lastChild);
	}
	
	var data = imageData.data;
	var width = imageData.width;
	var height = imageData.height;
	console.log('greyscalePixels data=' + data.length/(width*height));
	
	var greyscalePixels = [];
	var positionPixels = {};
	var cMap = {};
	var maxRegion = 1;
	var minRegion = 1;
	var horizontalRegionCount = 1;
	var verticalRegionCount = 1;
	var hColor = 0;
	var vColor = 0;
	var regionMap = {};
	for (let x = 0; x < width; x++) {
		horizontalRegionCount = -1;
		hColor = -1;
		for (let y = 0; y < height; y++) {
			  const r = data[((y * width + x) * 4) + 0];
			  const g = data[((y * width + x) * 4) + 1];
			  const b = data[((y * width + x) * 4) + 2];
			  const alpha = data[((y * width + x) * 4) + 2];
			  //greyscalePixels.set(x, y, 0.2126 * r + 0.7152 * g + 0.0722 * b);
			  greyscalePixels.push({x:x,y:y,r:r,g:g,b:b,a:alpha});
			  var colorRBG = (r<<16) + (g<<8) + (b<<0);
			  cMap[colorRBG] = 'x='+x + ',y='+y;
			  
			 if (hColor == colorRBG){
				horizontalRegionCount++;
			 }else{
				hColor = colorRBG;
				regionMap[horizontalRegionCount] = true;
				horizontalRegionCount = 1;
			 }
			  
			  
			  
			  let position = (x<<8) + (y<<0);
			  positionPixels[position] = colorRBG;
			  
			  
		}
		//console.log(greyscalePixels.value, 'color:red');
    }
	for(let k in cMap){
		console.log(cMap[k]+' - #' + Number.parseInt(k).toString(16));
	}
	
	console.log(Object.keys(regionMap));
	
	var decodeQRResult = jsQR(data,width,height);
	console.log('jsQR = ' , decodeQRResult);
	
	$('#'+outputTextId).val(decodeQRResult.data);
}

function pixelsColor(positionPixels, x, y){
	let position = (x<<8) + (y<<0);
	return positionPixels[position];
} 