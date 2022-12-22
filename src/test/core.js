let last_known_scroll_position = 0;
let ticking = false;

function doSomething(scroll_position){
	if(scroll_position<0){
		$('.bottom-bar').css({"transform":'translateY(0px)'});
		$('.header').css({"transform":'translateY(0px)'});
	}else{
		$('.bottom-bar').css({"transform":'translateY(+100%)'});
		$('.header').css({"transform":'translateY(-100%)'});
	}
	
	var el = $('body')[0];
	if(el.scrollHeight <= el.clientHeight){
		$('.bottom-bar').css({"transform":'translateY(+100%)'});
		$('.header').css({"transform":'translateY(-100%)'});
	}
	
}

  
 window.addEventListener('scroll',(e)=>{
	let lastPosition = last_known_scroll_position;
	last_known_scroll_position = window.scrollY;
	//console.log('scroll '+last_known_scroll_position);
	 if (!ticking) {
		 window.requestAnimationFrame(function() {
		  doSomething(last_known_scroll_position - lastPosition);
		  ticking = false;
		});

		ticking = true;
	}
})

$('#menu').live('click', ()=>{
	var body = $('body')[0];
	$('.bottom-bar').css({"transform":'translateY(+100%)'});
	$('.header').css({"transform":'translateY(-100%)'});

})

$(`div[ng-app]>div:not('.times')`).hide();


setTimeout(()=>{
	let months ='January,February,March,April,May,June,July,August,September,October,November,December'.split(',');
	let weeks = 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'.split(',');
	let seasons = 'spring,summer,autumn,winter'.split(',');
	let newwords = ['tets'];
	let itemlist = {months,weeks,seasons,newwords}
	
	let itemval = $('.times div>[items]').each((i, e)=>{
		let item = $(e).attr('items');
		let k=0;
		for(let t of itemlist[item]||[]){
			
			$(e).before(`<span items="months" index="${k}">${t}</span>`);
			k++;
		}
		
		
		
	});

	let now = new Date();
	let currentMonth = '';
	$(`.times .monthlist [index="${now.getMonth()}"]`).addClass('selected');
	$(`.times .weeklist [index="${now.getDay()-1}"]`).addClass('selected');
	$(`.times .seasonlist [index="${Math.floor(now.getMonth()/3)}"]`).addClass('selected');
	$('.times .date').html(now.toDateString());
	$('.times .newword').html(seasons[1]);
	$('.times').one('click', ()=>{
		$('.times').hide();
	})
	
},1000)

document.addEventListener('paste', async (e) => {
	
  //e.preventDefault();
  //const text = await navigator.clipboard.readText();
  //console.log('Pasted text: ', text);
  
  try{
	  const clipboardItems = await navigator.clipboard.read();
	  for (const clipboardItem of clipboardItems) {
		  for (const type of clipboardItem.types) {
			const blob = await clipboardItem.getType(type);
			console.log(blob);
		  }
	   }
  }catch(e){
	  console.log(e);
  }
	
  
});


