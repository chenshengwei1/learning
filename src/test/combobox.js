var optionModel = {};
var refreshDropdown = function(searchValue){
	$('.ace-select-body').find('mat-option').each((index, el)=>{
		let val = $(el).find('span').html();
		if(searchValue && val.indexOf(searchValue.trim()) == -1){
			$(el).hide();
			return;
		}
		$(el).show();
	});
}

$('csw-select').each((index, el)=>{
	let value = $(el).attr('value');
	let items = $(el).attr('items');
	let required = $(el).attr('required');
	let style = $(el).attr('style');
	$(el).html(`
	<div class="csw-select">
		<input id="csw-select-${index}" type="select" value="${value}" items="${items}" required="${required}"/>
		<i></i>
	</div>`);
	
	$(el).find('i').on('click', (e)=>{
		$(el).find('input').focus();
		$(el).find('input').click();
	})
})


$('input[type="select"]').on("click", (e)=>{
	let itemsText = $(e.target).attr('items')||'';
	let id = $(e.target).attr('id');
	let value =  $(e.target).val();
	if(!itemsText){
		return;
	}
	
	let parentSelect = $(e.target).parents('csw-select');
	if(parentSelect.length==0){
		parentSelect=$(e.target);
	}
	
	let options = [];
	if (itemsText.indexOf('[') != -1){
		try{
			options = JSON.parse(itemsText);
		}catch(e){
			options = [];
		}
	}else{
		options = window[itemsText];
		if (typeof options == 'function'){
			options = options();
		}
	}
	
	optionModel[id]=options;
	
	let innerHtml = '';
	for(let item of options){
		innerHtml = innerHtml+`
		<mat-option role="option" class="mat-option mat-focus-indicator ng-star-inserted" aria-disabled="false">
		    <span class="mat-option-text">${item.label}</span>
			<div mat-ripple="" class="mat-ripple mat-option-ripple"></div>
		</mat-option>`;
	}
	let localtionEle = parentSelect[0];
	$('.ace-select-body').html(innerHtml);
	$(".ace-select-body").css({"display":'block',
	"width":localtionEle.offsetWidth,
	"hight":localtionEle.offsetHeight,
	"top":localtionEle.offsetTop+localtionEle.offsetHeight,
	"left":localtionEle.offsetLeft});
	
	let bindingSource = e.target;
	$('.mat-option').on('click', (e)=>{
		console.log('mat-option click');
		e.preventDefault();
		$('.ace-select-body').css({"display":'none'});
		let text = $(e.currentTarget).find('span').html();
		const eventAwesome = new CustomEvent('change1', {
			  bubbles: true,
			  detail: { value: text}
		});
		bindingSource.dispatchEvent(eventAwesome);
		
	})
	
	refreshDropdown(value);
	

}).on('blur', (e)=>{
	let haveHover = $('.mat-option:hover').length;
	if (!haveHover){
		$('.ace-select-body').css({"display":'none'});
	}
	//$('.ace-select-body').css({"display":'none'});
	console.log('input[type="select"] blur')
	
}).on('change1', (e)=>{
	$(e.delegateTarget).val(e.originalEvent.detail.value);
	const eventAwesome = new CustomEvent('change', {
		  bubbles: true,
		  detail: { value: e.originalEvent.detail.value}
	});
	e.delegateTarget.dispatchEvent(eventAwesome);
}).on('input', (e)=>{
	console.log('input[type="select"] change ' + $(e.target).val())
	refreshDropdown($(e.target).val());
});

