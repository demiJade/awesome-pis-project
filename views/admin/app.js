var rawData = [];
var views = [];
var app = new Vue({
	el: '#app',
	data: {
		views: views,
		newfield: {
			key: "",
			value: "",
			type: ""
		},
		new_input_field: {
			key: "",
			creator_editable: true,
			marketing_editable: false,
			bc_editable: false
		},
		condition: "",
		edit: false,
		new_swift: {
			material_type: "",
			description: "",
			material_group: "",
			description_in_sap: "",
			mpg1: "",
			second_description_in_sap: "",
			mpg2: "",
			item_category_group: "",
			material_statistics_group: "",
			valuation_class: "",
			bom: "",
			bom_usage: "",
			ykexx: "",
			value_field_mapping: ""
		},
		new_condition: {}
	},
	methods: {
		resetValue: function(view, key, value){
			view.fields.default_fields[key] = value;
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
		addField: function(array, key, value, type){
			var vm = this;
			var objectValue = {
				value: value,
				type: type
			};
			var object = {};
			object[key] = {
				value: value,
				type: type
			};
			array.push(object);
			vm.newfield = {};
		},
		deleteField: function(view, object, key){
			var message = "Are you sure you want to delete the " + key + " from the " + view.name + "?";
	        var result = confirm(message);
	        if (result){
				Vue.delete(object, key);
			}
		},
		makeEditable: function(key){
			$("#" + key).prop('disabled', false);
		},
		addInputField: function(){
			var vm = this;
			var object = {
				creator_editable: vm.new_input_field.creator_editable,
				marketing_editable: vm.new_input_field.marketing_editable,
				bc_editable: vm.new_input_field.bc_editable
			};
			Vue.set(vm.views[0].fields, vm.new_input_field.key, object);
			Vue.set(vm.new_input_field, "key", "");
			Vue.set(vm.new_input_field, "creator_editable", true);
			Vue.set(vm.new_input_field, "marketing_editable", false);
			Vue.set(vm.new_input_field, "bc_editable", false);
		},
		addCondition: function(fieldsObject, key){
			if (typeof fieldsObject[key].value === 'string'){
				var object = {};
				Vue.set(fieldsObject[key], "value", object);
				// fieldsObject[key].value = {};
				// fieldsObject[key].value = {
				// 	'raw_file_key=value': 'value1,value2'
				// };
			} else if (typeof fieldsObject[key].value === 'object'){
				// Vue.set(fieldsObject[key].value, "raw_file_key=value", "value1,value2");
			}
		},
		addSwiftField: function(obj, key, value){
			Vue.set(obj, key, value);
			for (field in value){
				Vue.set(value, field, "");
			}
		},
		createCondition: function(obj, key, value){
			Vue.set(obj, key, value);
			this.new_condition = {};
		},
		removeCondition: function(fieldsObject, key){
			Vue.set(fieldsObject[key], "value", "");
		}
	}
})

var readData = function(event){
	rawData = [];
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
				rawData.push(obj);
			}
			console.log(rawData);
			createOutputData();
		}
		var text = r.readAsText(f);
	}
}


var outputData = [];
var createOutputData = function(callback){
	// $.getJSON("data/output.json", function( data ) {
	//   $.each( data, function( obj) {
	//   	views.push(obj);
	//   });
	//   if (callback)
	//   	callback();
	// });
	views.forEach(function(x){
		var viewOutputData = [];
		rawData.forEach(function(y){
			var obj = {};
			var keys = [];
			x.fields.forEach(function(field){
				keys.push(Object.keys(field)[0]);
			});
			keys.forEach(function(z){
				// if (typeof x.fields[z].value)
				if (x.fields[z].type == "default_field"){
					obj[z] = x.fields[z].value;
				} else if (x.fields[z].type == "filled_field"){
					obj[z] = y[x.fields[z].value];
				}
			});
			// var filled_keys = Object.keys(x.fields.filled_fields);
			// filled_keys.forEach(function(z){
			// 	obj[z] = y[x.fields.filled_fields[z]];
			// });
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
		var headers = [];
		views[i].fields.forEach(function(x){
			headers.push(Object.keys(x)[0]);
		});
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