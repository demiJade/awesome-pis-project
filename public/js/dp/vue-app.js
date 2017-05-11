$('#homepage').load('js/dp/homepage.html', function(){

    var inputPage = {
      template: '#home',
      data: function(){
        rawData = [];
      },
      methods: {
        readData: function(){
          var f = event.target.files[0];
          if (f) {
            var r = new FileReader();

            r.onload = function(e) {
              var contents = e.target.result;
              var lines = contents.split('\n');
              lines.pop();
              var headers = lines[0].split(",");
              // headers = headers.map(removePeriod);
              // headers = headers.map(normalize);
              $.ajax({
                url: 'readfile/rawdata',
                type: 'POST',
                data: {
                  content: JSON.stringify(lines), 
                  headers: headers
                }, 
                success: function(data){
                  console.log(data);
                }
              })
              

            }
            var text = r.readAsText(f);
          }
        }
      }
    };
    var routes = [
        {
          path: '/',
          component: inputPage
        }
      ]
      var router = new VueRouter({
        routes
      });
      var app = new Vue({
        router
      }).$mount('#app');

});