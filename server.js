//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.NODEJS_MONGO_PERSISTENT_SERVICE_PORT || 8080,
    ip   = process.env.IP   || process.env.NODEJS_MONGO_PERSISTENT_SERVICE_HOST || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

console.log(process.env.DATABASE_SERVICE_NAME);
var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
console.log("Service Name "+process.env.DATABASE_SERVICE_NAME);
console.log("MongoURL "+mongoURL);
console.log("Service Host "+process.env[mongoServiceName + '_SERVICE_HOST']);
console.log("Database "+process.env[mongoServiceName + '_DATABASE']);

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

    console.log(mongoURL)
  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
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
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }

  if (db) {
    var col = db.collection('news');
    // Create a document with request IP and current time of request
    //col.insert({ip: req.ip, date: Date.now()});
    
    col.count(function(err, count){
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });

  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/news', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }  
    
  if (db) {
    var news = db.collection('news');
    // Find all data in the Collection collection
    news.find().toArray(function (err, newss) {
      if (err) return console.error(err);
      //console.log(newss.title)
      res.render('news.html', {data : newss})
    });
  } else {
    res.send('{ pageCount: -1 }');
  }  
});

app.get('/pagecount', function(req, res){
    res.writeHead(200);
    res.end();
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
