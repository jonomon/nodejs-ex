var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan'),
    io      = require('socket.io')(8000);
    
Object.assign = require('object-assign');

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'));

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
    if (mongoURL == null)
    {
	return;	
    }

    var mongodb = require('mongodb');
    if (mongodb == null)
    {
	return;
    }

    mongodb.connect(mongoURL, function(err, conn) {
	if (err)
	{
	    callback(err);
	    return;
	}

	db = conn;
	dbDetails.databaseName = db.databaseName;
	dbDetails.url = mongoURLLabel;
	dbDetails.type = 'MongoDB';
	console.log('Connected to MongoDB at: %s', mongoURL);
    });
};

app.get('/', function (req, res) {
    res.render('index.html');
});

app.get('/signup', function (req, res) {
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    if (req.query) 
    {
        var username = req.query.username;
        var secretQuestion = req.query.sq;
        var secretAnswer = req.query.sq;

        var userCursor = db.collection('users');
        userCursor.findOne({username: username}, function(err, doc) {
            if (doc == null) 
            {
                userCursor.insert({"username": username, "sq": secretQuestion, "sa": secretAnswer}, function (err, doc) {
                    if (err) 
                    {
                        res.send('{ success: false, message: username ' + username + ' insertion error}');
                    }
                    else {
                     res.send('{ success: true}');
                    }});
            }
            else 
            {
                res.send('{ success: false, message: username ' + username + ' has been taken}');
            }
        });
    }
    else
    {
        res.send('{ success: false}');
    }
  }
});

app.get('/getQuestion', function (req, res) {
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    if (req.query) 
    {
        var username = req.query.username;
        var userCursor = db.collection('users');
        userCursor.findOne({username: username}, function(err, doc) {
            if (doc != null) 
            {
                res.send('{ sq: ' + doc.sq + '}');
            }
            else 
            {
                res.send('{ success: false}');
            }
        });
    }
    else
    {
        res.send('{ success: false}');
    }
  }
});

app.get('/login', function (req, res) {
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    if (req.query) 
    {
        var username = req.query.username;
        var secretQuestion = req.query.sq;
        var secretAnswer = req.query.sq;

        var userCursor = db.collection('users');
        userCursor.findOne({username: username, sq: secretQuestion, sa: secretAnswer},
            function(err, doc) {
                if (doc != null) 
                {
                    // TODO: send data from db.collection('data');
                    res.send('{ success: true, data: WAH}');
                }
                else 
                {
                    res.send('{ success: false}');
                }
        });
    }
    else
    {
        res.send('{ success: false}');
    }
  }
});

// websockets
io.on('connection', function (socket) {
    console.log('WEBSOCKET WAS CONNECTED') 
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
