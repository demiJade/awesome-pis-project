var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var _und = require("underscore");

var bcrypt = require('bcryptjs');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;

var address = 'PHCORPPHWKSIL17';
var url = 'mongodb://' + address + ':27017/pis';
var userUrl = 'mongodb://' + address + ':27017/users';
app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var session = require('express-session');
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

var fs = require('fs');

app.set('view engine', 'html');
// app.get('/', function(req, res){
// 	res.send('Hello World!');
// });

var port = 5000;

app.listen(port, function(){
	console.log("Listening at port " + port);
});

app.use(express.static('public'));

//===============ROUTING===========//

app.use(express.static('views'));

app.get('/', authenticatedMiddleware, function(req, res){
	var user = req.user;
	var role = user.role;
	res.sendFile(path.join(__dirname, 'views', role, 'index.html'), function(){
	});
	// res.sendFile(path.join(__dirname, 'views', 'admin', 'index.html'));
});

app.get('/signin', function(req, res){
	res.sendFile(path.join(__dirname, 'views', 'signin.html'));
});

app.get('/register_user', authenticatedMiddleware, function(req, res){
	res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post('/readfile/:collection', function(req, res){
    var collection = req.params.collection;
    var lines = JSON.parse(req.body.content);
    var headers = req.body.headers;
    var error = false;
    console.log(new Date());
    console.log("Converting data...");
    console.log(headers);
    var tempArray = lines.map(function(x){
        return convertData(x, headers);
    }); 
    console.log(new Date());
    console.log("Saving data...");
    res.send("Data saving");
    insert(tempArray, collection, function(){
        MongoClient.connect(url, function (err, db){
            if (err){
                io.emit("Mongo Connect Error", collection);
            } else {
                db.collection(collection).find({"collection":collection}).toArray(function(err, results){
                    // io.emit("Data saved", {"data":results, "collection":collection, "count": results.length});
                    insert([{"done_at": new Date(), "action": "Uploaded data for " + collection}], "logs", function(){
                        db.close();
                    });
                });
            }
        });
        console.log('Data saved');
        console.log(new Date());
    });
});

app.post('/savefile', authenticatedMiddleware, function(req, res){
	var json = req.body.content;
	if (req.user.role == 'admin'){
		fs.writeFile('public/data/output.json', json, function(){
			res.send("Data saved");
		});
	}
});

app.post('/createbatch', authenticatedMiddleware, function(req, res){
	var batch = req.body.batch;
	batch['created_by'] = req.user.username;
	batch['created_on'] = new Date();
	MongoClient.connect(url, function(err, db){
		db.collection("tempbatches").insert(batch).then(function(){
			db.collection("tempbatches").mapReduce(mapByDivisionBrandCategory, reduceByDivisionBrandCategory, {
				out: {
					replace: "formattedTempBatches"
				}
			}, function(){
				db.collection("formattedTempBatches").find().toArray(function(err, batches){
					batches.forEach(function(batch){
						var new_batch = {
							created_by: batch._id.created_by,
							created_on: batch._id.created_on,
							division: batch._id.division,
							signature: batch._id.signature,
							category: batch._id.category,
							marketing_approved: false,
							bc_approved: false,
							extracted_on: '',
							items: []
						}
						batch.value.items.forEach(function(item){
							new_batch.items.push(item);
						});
						db.collection("batches").insert(new_batch).then(function(){
							db.collection("tempbatches").remove({}, function(){
								db.close();
							});
						});
					})
					db.collection("batches").find({created_by: batch.created_by, created_on: batch.created_on}).toArray(function(err, batches){
						res.send(batches);
					});
				})
			})
		})	
	});
});

var mapByDivisionBrandCategory = function(){
	var key = {
		created_by: this.created_by,
		created_on: this.created_on
	}
	this.items.forEach(function(item){
		key.division = item.division;
		key.signature = item.signature;
		key.category = item.category;
		item.standard_cost = Number(Math.round(Number(item.fob_price) * Number(item.conversion_rate) * (1 + (Number(item.freight_cost) + Number(item.customs) + Number(item.royalty))/100) + Number(item.stickering_cost)+'e2')+'e-2');
		item.srp = "";
		item.margin = "";
		item.vat = 12.00;
		item.list_price = "";
		item.product_hierarchy = "";
		item.currency = "PHP";
		emit(key, {items:[item]});
	});
}

var reduceByDivisionBrandCategory = function(key, values){
	var items = [];
	values.forEach(function(value){
		value.items.forEach(function(x){
			items.push(x);
		})
	})
	return {
		items: items
	}
}

app.post('/extracted_batch', function(req, res){
	var created_by = req.body.created_by;
	var created_on = new Date(req.body.created_on);
	MongoClient.connect(url, function(err, db){
		var batches = db.collection("batches");
		batches.findOneAndUpdate({created_by: created_by, created_on: created_on}, {$set:{extracted_on: new Date(), extracted_by: req.user.username}}).then(function(){
			batches.findOne({created_by:created_by, created_on:created_on}).then(function(batch){
				res.send(batch);
			})
		})
	});
});


app.get('/getbatches', authenticatedMiddleware, function(req, res){
	MongoClient.connect(url, function(err, db){
		var collection = db.collection("batches");
		var batches = [];
		collection.find({}).toArray(function (err, results){
			res.send(results);
		});
	});
});

app.post('/deletebatch', authenticatedMiddleware, function(req, res){
	var filter = req.body.filter;
	filter.created_on = new Date(filter.created_on);
	console.log(filter);
	MongoClient.connect(url, function(err, db){
		var collection = db.collection('batches');
		collection.remove({"_id": new mongo.ObjectId(filter._id)}, function(){
			res.send("Deleted");
			console.log("Deleted");
			db.close();
		});
	});
});

app.get('/getuser', authenticatedMiddleware, function(req, res){
	res.send(req.user);
});

app.post('/editbatch', authenticatedMiddleware, function(req, res){
	var filter = req.body.filter;
	filter.created_on = new Date(filter.created_on);
	var batch = req.body.batch;
	var object = JSON.parse(batch);
	var id = object._id;
	object.created_on = new Date(object.created_on);
	if (req.user.role == 'creator'){
		object.marketing_approved = false;
		object.bc_approved = false;
	}
	delete object._id;
	console.log(filter);
	console.log(batch);
	MongoClient.connect(url, function(err, db){
		var collection = db.collection('batches');
		collection.updateOne({"_id": new mongo.ObjectId(id)}, {$set:object}, function(err){
			res.send(err);
			console.log(err);
			db.close();
		});
	});
});


// app.get('/batch/:index', function(req, res){
// 	var filter = req.body.filter;
// 	MongoClient.connect(url, function(err, db){
// 		var collection = db.collection('batches');
// 		collection.findOne(filter).then(function(batch){
// 			res.render('views/batch.html');
// 		});
// 	});
// });

// app.get('/viewbatch', function(req, res){
// 	var batch = 
// })

//===============USER AUTHENTICATION===========//
function authenticatedMiddleware(req, res, next){
	console.log(req.isAuthenticated());
	if (req.isAuthenticated()){
		console.log("Authenticated!");
		next();
	} else {
		res.redirect('/signin');
	}
}

passport.use('local-login', new LocalStrategy(function (username, password, done){
		MongoClient.connect(userUrl, function(err, db){
			var Users = db.collection('localUsers');
			Users.findOne({"username": username}).then(function(user){
				if (!user){
					console.log("!user");
					console.log(user);
					return done(null, false);
				}
				if (!bcrypt.compareSync(password, user.password)){
					console.log("wrong pass");
					return done(null, false);
				}
				return done(null, user);
				db.close();
			});
		});
	}
));

passport.use('local-reg', new LocalStrategy(
    {passReqToCallback: true},
    function (req, username, password, done){
        MongoClient.connect(userUrl, function(err, db){
            var Users = db.collection('localUsers');
            Users.findOne({"username":username}).then(function (user){
                if (user){
                    db.close();
                    done(null, false);
                } else {
                    var hash = bcrypt.hashSync(password, 8);
                    var user = {
                        "username": username,
                        "email": req.body.email,
                        "password": hash,
                        "role": req.body.role
                    }
                    Users.insert(user).then(function(){
                        db.close();
                        done(null, user);
                    });
                }
            });
            
        });
    }
));
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(username, done) {
    done(null, username);
});
app.post('/login', function (req, res, next){
    console.log("logging in");
    passport.authenticate('local-login', function (err, user){
        if (err){
            console.log("error");
            console.log(user);
            return res.redirect('/signin');
        }
        if (!user){
            console.log("User not found");
            return res.redirect('/signin');
        }
        req.logIn(user, function(err){
            if (err){
                return next(err);
            }
            // users.push(user);
            MongoClient.connect(userUrl, function(err, db){
            	db.collection("localUsers").update({username: req.user.username}, {$set:{last_logged_in: new Date()}}, {upsert: true});
            })
            console.log("Logged in");
            return res.redirect('/');
        })
    })(req, res, next);
});
app.post('/register', authenticatedMiddleware, function (req, res, next){
    passport.authenticate('local-reg', function (err, user){
        if (err){
            console.log("error");
            console.log(user);
            return res.redirect('/signin');
        }
        if (!user){
            console.log("User already exists");
            return res.redirect('/signin');
        }
        // req.logIn(user, function(err){
            // if (err){
            //     return next(err);
            // }
            // console.log("Logged in");
            return res.redirect('/');
        // })
    })(req, res, next);
});
app.get('/logout', authenticatedMiddleware, function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

app.post('/deleteUser', authenticatedMiddleware, function(req, res){
	var collection = "localUsers";
	var filter = req.body.filter;
	if (req.user.role == "admin"){
		MongoClient.connect(userUrl, function(err, db){
			db.collection(collection).remove(filter, function(){
				res.send("Deleted");
				db.close();
			});
		});
	} else {
		res.send("error");
	}
});

app.post('/resetUserPassword', function(req, res){
	var collection = "localUsers";
	var filter = req.body.filter;
	var hash = bcrypt.hashSync(filter.username, 8);
	MongoClient.connect(userUrl, function(err, db){
		db.collection(collection).update(filter, {$set:{password: hash}}, function(){
			res.send("reset");
		})
	})
});

app.get('/getusers', function(req, res){
	MongoClient.connect(userUrl, function(err, db){
		db.collection("localUsers").find().toArray(function(err, users){
			res.send(users);
		});
	});
});

app.get('/change_password', function(req, res){
	res.sendFile(path.join(__dirname, 'views', 'changepassword.html'));
});

app.post('/change_password', function(req, res){
	var collection = "localUsers";
	var username = req.body.username;
	var password = req.body.password;
	var confirm_password = req.body.confirmpassword;
	if (password == confirm_password){
		var hash = bcrypt.hashSync(req.body.confirmpassword, 8);
		MongoClient.connect(userUrl, function(err, db){
			db.collection(collection).update({username: req.user.username}, {$set:{password: hash}}, function(){
				return res.redirect("/");
			})
		})
	} else {
		return res.redirect("/change_password");
	}
});

//==========FUNCTIONS==================//
var insert = function(data, col, callback){
    MongoClient.connect(url, function(err,db){
        if (err){
            console.log("Unable to connect to database", err);
            // io.emit("Mongo Connect Error", col);
            db.close();
        } else {
            var collection = db.collection(col);
            data.map(function(obj){
                collection.insert(obj);
            });      
            db.close();
        }
    });
}

function convertData(line, headers){
    line = line.match(/(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g);
    line = line.map(removeCarriage);
    return _und.object(headers, line);
}
function removeCarriage(data){
    return data.replace(/\r?\n|\r/g, "").replace(/\"/g, "").replace(",", "");
}