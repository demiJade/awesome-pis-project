var rawData = [];
var views = [];
var batches = [];
var user = {};
var app = new Vue({
	el: '#app',
	data: {
		views: views,
		newfield: {
			key: "",
			value: ""
		},
		batch: {
			division: "",
			brand: "",
			created_by: "",
			marketing_approved: false,
			bc_approved: false,
			extracted_on: "",
			items: []
		},
		batches: batches,
		user: user,
		edit: false
	},
	methods: {
		// resetValue: function(view, key, value){
		// 	view.fields.default_fields[key] = value;
		// },
		saveData: function(){
			var json = JSON.stringify(views, null, 4);
			$.ajax({
				url: '/savefile',
				type: 'POST',
				data: {
					content: json
				}, success: function(data){
					console.log(data);
				}
			})
		},
		readData: function(){
			var vm = this;
			var f = event.target.files[0];
			if (f) {
			    var r = new FileReader();

			    r.onload = function(e) {
			    	var contents = e.target.result;
					var lines = contents.split('\n');
					lines.pop();
					var headers = lines[0].split(",");
					headers = headers.map(normalize);
					lines.shift();
					for (var i = 0; i < lines.length; i++){
						var obj = {};
						var values = lines[i].split(",");
						for (var j = 0; j < headers.length; j++){
							obj[headers[j]] = values[j];
						}
						vm.batch.items.push(obj);
					}
					console.log(rawData);
			    }
			    var text = r.readAsText(f);
			}
		}, 
		saveBatch: function(){
			var vm = this;
			
			$.ajax({
				url: '/createbatch',
				type: 'POST',
				data: {
					batch: vm.batch
				},
				success: function(data){
					console.log(data);
					if (data == 'Saved'){
						vm.batches.push(vm.batch);
					}
					vm.batch = {
						division: "",
						brand: "",
						items: []
					}
				}
			});
		},
		view: function(batch, index){
			var vm = this;
			$.ajax({
				url: '/batch/' + index,
				type: 'GET',
				data: {
					filter: {
						created_by: batch.created_by,
						created_on: batch.created_on
					}
				}, 
				success: function(){

				}
			});
		},
		deleteBatch: function(index){
			var message = "Are you sure you want to delete Batch " + (index+1) + "?";
	        var result = confirm(message);
	        var vm = this;
	        if (result){
	        	var batch = vm.batches[index];
				$.ajax({
					url: '/deletebatch',
					type: 'POST',
					data: {
						filter: {
							created_by: batch.created_by,
							created_on: batch.created_on
						}
					}, 
					success: function(){
						vm.batches.splice(index, 1);
					}
				});
			}
		},
		// },
		// addField: function(obj, key, value){
		// 	var vm = this;
		// 	Vue.set(obj, key, value);
		// 	Vue.set(vm.newfield, "key", "");
		// 	Vue.set(vm.newfield, "value", "");
		// },
		// deleteField: function(view, object, key){
		// 	var message = "Are you sure you want to delete the " + key + " from the " + view.name + "?";
	 //        var result = confirm(message);
	 //        if (result){
		// 		Vue.delete(object, key);
		// 	}
		// },
		makeEditable: function(){
			this.edit = true;
		},
		saveEdit: function(index){
			this.edit = false;
			var batch = this.batches[index];
			var json = JSON.stringify(batch);
			var filter = {
				created_by: batch.created_by,
				created_on: batch.created_on
			};
			$.ajax({
				url: '/editbatch',
				type: 'POST',
				data: {
					filter: filter,
					batch: json
				},
				success: function(){
					console.log("saved changes");
				}
			});
		},
		setBCApproved: function(index){
			batches[index].bc_approved = true;
			this.saveEdit(index);
		},
		computeStandardCost: function(batch_index, item_index, key){
			var obj = batches[batch_index].items[item_index];
			var decimal_keys = ["standard_cost", "fob_price", "freight_cost", "customs", "royalty", "stickering_cost", "srp", "margin", "vat", "list_price"];
			if (decimal_keys.includes(key)){
				obj[key] = formatDecimalPlaces(obj[key], 2);
			}
			if (key != 'standard_cost'){
				batches[batch_index].items[item_index].standard_cost = Number(Math.round(Number(obj.fob_price) * Number(obj.conversion_rate) * (1 + (Number(obj.freight_cost) + Number(obj.customs) + Number(obj.royalty))/100) + Number(obj.stickering_cost)+'e2')+'e-2');
			}
		}
	}
})

// var readData = function(event){
// 	rawData = [];
// 	var f = event.target.files[0];
// 	if (f) {
// 		var r = new FileReader();

// 		r.onload = function(e) {
// 			var contents = e.target.result;
// 			var lines = contents.split('\n');
// 			lines.pop();
// 			var headers = lines[0].split(",");
// 			headers = headers.map(normalize);
// 			lines.shift();
// 			for (var i = 0; i < lines.length; i++){
// 				var obj = {};
// 				var values = lines[i].split(",");
// 				for (var j = 0; j < headers.length; j++){
// 					obj[headers[j]] = values[j];
// 				}
// 				rawData.push(obj);
// 			}
// 			console.log(rawData);
// 			createOutputData();
// 		}
// 		var text = r.readAsText(f);
// 	}
// }


var outputData = [];
var createOutputData = function(callback){
	$.getJSON("data/output.json", function( data ) {
	  $.each( data, function( obj) {
	  	views.push(obj);
	  });
	  if (callback)
	  	callback();
	});
	views.forEach(function(x){
		var viewOutputData = [];
		rawData.forEach(function(y){
			var obj = {};
			var default_keys = Object.keys(x.fields.default_fields);
			default_keys.forEach(function(z){
				obj[z] = x.fields.default_fields[z];
			});
			var filled_keys = Object.keys(x.fields.filled_fields);
			filled_keys.forEach(function(z){
				obj[z] = y[x.fields.filled_fields[z]];
			});
			viewOutputData.push(obj);
		});
		outputData.push(viewOutputData);
	});
	console.log(outputData);
	downloadData();
}	

var downloadData = function(callback){
	if (callback)
		callback();
	var zip = new JSZip();
	outputData.forEach(function(view, i){
		var headers = Object.keys(views[i].fields.filled_fields);
		headers = headers.concat(Object.keys(views[i].fields.default_fields));
		var output = headers.join(",");
		view.forEach(function(row){
			output += "\n";
			for (var i = 0; i < headers.length; i++){
				output += '"' + row[headers[i]] + '"';
				if (i < headers.length -1){
					output += ",";
				}
			}
		});
		console.log(output);
		zip.file(views[i].name + ".csv", output);
	});
	zip.generateAsync({type:"blob"}).then(function(content){
		var url = window.URL.createObjectURL(content);
	    // var link = document.getElementById("link"); //I suppose you'll have a link with this id :)
	    // link.download = "output.zip";
	    // link.href = url;

	    var a = document.createElement('a');
			a.href =  url;
			a.target      = '_blank';
			a.download    = 'output.zip';

			document.body.appendChild(a);
			a.click();
	});
}

function normalize(value){
	return value.replace(/\s|-/g, "_").toLowerCase();
}