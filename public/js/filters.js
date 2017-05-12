Vue.filter('getBrandCategory', function(x){
  return x.substr(0,4) + " " + x.substr(4, x.length-10);
});

Vue.filter('percentage', function(x){
  return (x * 100).toFixed(2) + "%";
});

Vue.filter('displayMonthYear', function(x){
  return x.substr(3,3) + " 20" + x.substr(0,2); 
});

Vue.filter('capitalize', function(x){
  return x.charAt(0).toUpperCase() + x.slice(1);
});

Vue.filter('appendHash', function(x){
  return "#" + x;
});

Vue.filter('round', function(x){
  return Math.round(x);
});

Vue.filter('displayDateInWordsWithTime', function(x){
	return moment(x).format('MMM Do YYYY, h:mm a');;
});

Vue.filter('displayDateInWords', function(x){
  return moment(x).format('MMM Do YYYY');;
});


Vue.filter('collapseTable', function(x){
	return "collapseTable" + x;
});

Vue.filter('collapseTableHash', function(x){
	return "#collapseTable" + x;
});

Vue.filter('openModal', function(x){
  return "openModal" + x;
});

Vue.filter('openModalLabel', function(x){
  return "openModalLabel" + x;
});

Vue.filter('openModalHash', function(x){
  return "#openModal" + x;
});

Vue.filter('chartModal', function(x){
  return "chartModal" + x;
});

Vue.filter('appendAs', function(x){
  if (x == undefined){
    return "";
  } else {
    return "as " + x;
  }
});

Vue.filter('humanize', function(x){
  if (x != undefined){
      return x.replace(/\_/g, " ").toUpperCase();
    }
})

function removeCarriage(data){
  return data.replace(/\r?\n|\r/g, "").replace(/\"/g, "").replace(",", "");
}

Vue.filter('tabify', function(x){
  return x + 'tab';
})

Vue.filter('body', function(x){
  return x + 'body';
})