//  OpenShift sample Node application
var express = require('express'),
    fs      = require('fs'),
    app     = express(),
    eps     = require('ejs'),
    morgan  = require('morgan'),
    sm = require('sitemap');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL || process.env.MONGODB_URI,
    mongoURLLabel = "";

console.log(process.env.DATABASE_SERVICE_NAME);

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
  
  console.log("MongoURL = " +mongoURL)

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

app.get('/news', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  console.log(req.query);
  if (!db) {
    initDb(function(err){});
  }

  if (db) {
    var col = db.collection('news');

    var news = db.collection('news');
    // Find all data in the Collection collection
    news.find({title:req.query.title}).limit(1).toArray(function (err, newss) {
      if (err) return console.error(err);
      //console.log(newss);
      res.render('news.html', {data : newss, page : 1})
    });

  } else {
    res.send('{ pageCount: -1 }');
  }
});

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
    
  page = typeof req.query.page  !== 'undefined' ?  parseInt(req.query.page)  : 0;
  
  console.log("page= " +req.query.page);
  
  if (!db) {
    initDb(function(err){});
  }

  if (db) {
    var news = db.collection('news');
    // Find all data in the Collection collection
    news.find().sort({_id: -1}).skip(page).limit(1).toArray(function (err, newss) {
      if (err) return console.error(err);

      res.render('news.html', {data : newss, page : page+1})
    });
  } else {
    res.send('{ pageCount: -1 }');
  }  
});

app.get('/mobile', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
    
  page = typeof req.query.page  !== 'undefined' ?  parseInt(req.query.page)  : 10;
  
  //@todo: fix in app
  page =  Math.abs(page-10);

  console.log("page= " +req.query.page);
  
  if (!db) {
    initDb(function(err){});
  }

  if (db) {
    var news = db.collection('news');
    // Find all data in the Collection collection
    news.find().sort({_id: -1}).skip(page).limit(10).toArray(function (err, newss) {
      if (err) return console.error(err);

      res.send(JSON.stringify({data : newss, page : page+10}));
    });
  } else {
    res.send('{ pageCount: -1 }');
  }  
});

app.get('/pagecount', function(req, res){
  console.log("in /pagecount");
    res.writeHead(200);
    res.end();
});


app.get('/sitemap.xml', function(req, res) {

sitemap = sm.createSitemap ({
      hostname: 'http://tejhindi.com',
      cacheTime: 600000,        // 600 sec - cache purge period 
    });

  if (!db) {
    initDb(function(err){});
  }

  if (db) {
    var news = db.collection('news');
    var cursor = news.find();
    var counter = 0;

    news.find().toArray(function(err, newss){
        if (err) {
            console.log(err);
            return;
        }

        newss.forEach(function(news, index) {
            sitemap.add({url: '/news/?title=' +news.title, changefreq: 'daily', priority: 0.7});
        });

        sitemap.toXML( function (err, xml) {
            if (err) {
              return res.status(500).end();
            }
            res.header('Content-Type', 'application/xml');
            res.send( xml );
        });
    });
  }
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
