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
		edit: false,
		new_swift: {},
		items: []
	},
	methods: {
		// resetValue: function(view, key, value){
		// 	view.fields.default_fields[key] = value;
		// },
		extractData: function(batch_index){
			var vm = this;
			var batch = vm.batches[batch_index]
			var created_on = batch.created_on;
			var created_by = batch.created_by;					
			createOutputData(batch, function(){
				$.ajax({
					url: '/extracted_batch',
					type: 'POST',
					data: {
						created_on: created_on,
						created_by: created_by
					},
					success: function(batch){
						Vue.set(vm.batches[batch_index], "extracted_on", batch.extracted_on)
						Vue.set(vm.batches[batch_index], "extracted_by", batch.extracted_by)
					}
				})
			});
		},
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
					headers = headers.map(removeCarriage);
					headers = headers.map(normalize);
					if (headers.includes("division") && headers.includes("signature") && headers.includes("category")){
						lines.shift();
						for (var i = 0; i < lines.length; i++){
							var obj = {};
							var values = lines[i].split(",");
							values = values.map(removeCarriage);
							for (var j = 0; j < headers.length; j++){
								obj[headers[j]] = values[j];
								if (headers[j] == "fob_price" || headers[j] == "freight_cost" || headers[j] == "royalty" || headers[j] == "stickering_cost" || headers[j] == 'customs'){
									values[j] = values[j].replace(/\s/g, "");
									if (values[j].includes(",")){
										toastr.error("Error in format of " + headers[j] + " for " + obj["sap_code"] + ".\n Please ensure that standard cost does not have a comma.");
									}
									if (!values[j].includes(".")){
										toastr.error("Error in format of  " + headers[j] + " for " + obj["sap_code"] + 
											".\n Please ensure that " + headers[j] + " have two decimal points");
									} else {
										var numbers = values[j].split(".");
										if (numbers[1].length != 2){
											toastr.error("Error in format of " + headers[j] + " for " + obj["sap_code"] + 
											".\n Please ensure that " + headers[j] + " have two decimal points");
										}
									}
								}
							}
							vm.batch.items.push(obj);
						}
					} else {
						toastr.error("Please ensure that you have division, signature, and category");
					}
					console.log(rawData);
					var elem = document.getElementById("raw-data");
		            elem.value = "";
		            var elem = document.getElementById("raw-data" + "-label");
		            elem.innerHTML = f.name;
			    }
			    var text = r.readAsText(f);
			}
		}, 
		saveBatch: function(){
			var vm = this;
			console.log("this");
			$.ajax({
				url: '/createbatch',
				type: 'POST',
				data: {
					batch: vm.batch
				},
				success: function(data){
					console.log(data);
					data.forEach(function(x){
						vm.batches.push(x);
					})
					toastr.success("Batch created");
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
							created_on: batch.created_on,
							_id: batch._id
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
		saveEdit: function(index, batch){
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
		formatDecimal: function(batch_index, item_index, key){
			var obj = batches[batch_index].items[item_index];
			var decimal_keys = ["standard_cost", "fob_price", "freight_cost", "customs", "royalty", "stickering_cost", "srp", "margin", "vat", "list_price"];
			if (decimal_keys.includes(key)){
				obj[key] = formatDecimalPlaces(obj[key], 2);
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
var createOutputData = function(batch, callback){
	outputData = [];
	app.views.forEach(function(x){
		if (x.name != 'input' && x.name != 'swift'){
			var viewOutputData = [];
			var multiplying_fields = [];
			var conditional_fields = [];
			var input_conditional_multiplying_fields = [];
			x.fields.forEach(function(field){
				if (field.type == 'multiplying_field'){
					multiplying_fields.push(field);
				} else if (typeof field.value === 'object'){
					conditional_fields.push(field);
				} else if (field.type == "conditionally_multiply_per_raw_input_field"){
					multiplying_fields.push(field);
					//when a value multiplies for a condition on an input field not outputted in the export file
				}
			});
			batch.items.forEach(function(y){
				var obj = {};
				var keys = [];
				var multiply = false;
				var condition = false;
				x.fields.forEach(function(field){
					keys.push(field.field);
					if (field.value == "today") {
						var date = new Date();
						var day = date.getDate();
						if (day < 10){
							day = "0" + day;
						}
						var month = date.getMonth() + 1;
						if (month < 10){
							month = "0" + month;
						}
						obj[field.field] = day + "." +  month + "." + date.getFullYear();
					} else if (field.type == "default_field" && typeof field.value == 'string'){
						obj[field.field] = field.value;
					} else if (field.type == "filled_field"){
						obj[field.field] = y[field.value];
					} else if (field.type == "multiplying_field" && typeof field.value == 'object'){
						var conditions = Object.keys(field.value);
						conditions.forEach(function(match){
							var condition_key = match.split("=")[0];
							var condition_value = match.split("=")[1];
							var parameter = condition_key + "=" + y[condition_key];
							if (match.trim() == parameter.trim()){
								obj[field.field] = field.value[match];
							}
						})
					} else if (field.type == "multiplying_field"  && typeof field.value == 'string'){
						obj[field.field] = field.value;
					} else if (typeof field.value == 'object'){
						var conditions = Object.keys(field.value);
						conditions.forEach(function(match){
							var condition_key = match.split("=")[0];
							var condition_value = match.split("=")[1];
							var parameter = condition_key + "=" + y[condition_key];
							if (match.trim() == parameter.trim()){
								obj[field.field] = field.value[match];
								var x = field.value[match];
								obj[field.field] = x;
							} 
						})
					} else if (field.type == "swift_field"){
						var key = y.material_type + "_" + y.material_group + "_" + y.mpg1;
						obj[field.field] = views[1].fields[key][field.value];
						if (obj[field.field] == "n.a."){
							obj[field.field] = "";
						}
					}
				});
				// var filled_keys = Object.keys(x.fields.filled_fields);
				// filled_keys.forEach(function(z){
				// 	obj[z] = y[x.fields.filled_fields[z]];
				// });
				if (multiplying_fields.length == 0 && conditional_fields.length == 0){
					viewOutputData.push(obj);
				} else {
					if (multiplying_fields.length > 0){
						multiplying_fields.forEach(function(field){
							var values = obj[field.field].split(",");
							values.forEach(function(x){
								var add_obj = {};
								for (key in obj){
									add_obj[key] = obj[key];
								}
								add_obj[field.field] = x;
								viewOutputData.push(add_obj);
							});
						});
					}
					if (conditional_fields.length > 0){
						if (viewOutputData.length == 0){
							viewOutputData.push(obj);
						}
						viewOutputData.forEach(function(data_object){
							conditional_fields.forEach(function(field){
								if (data_object[field.field] == undefined){
									data_object[field.field] = "";
									var conditions = Object.keys(field.value);
									conditions.forEach(function(condition){
										var condition_key = condition.split("=")[0];
										var condition_value = condition.split("=")[1];
										if (data_object[condition_key] == condition_value){
											data_object[field.field] = field.value[condition];
										}
									})
								}
							})
						})
					}

				}
			});
			outputData.push(viewOutputData);
		}
		
	});
	console.log(outputData);
	downloadData(outputData, callback);
}	

var downloadData = function(outputData, callback){
	var zip = new JSZip();
	outputData.forEach(function(view, i){
		if (view.length > 0){
			var headers = Object.keys(view[0]);
			var output = headers.join("\t");
			view.forEach(function(row){
				output += "\r\n";
				for (var i = 0; i < headers.length; i++){
					output += row[headers[i]];
					if (i < headers.length -1){
						output += "\t";
					}
				}
			});
			console.log(output);
			zip.file(views[i+2].name + ".txt", output);
		}
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
			if (callback)
				callback();
	});
}

function normalize(value){
	return value.replace(/\s|-/g, "_").toLowerCase();
}
var getDivisionOf = function(division){
	return function(item){
		return item.division == division;
	}
}