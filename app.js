var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//var index = require('./routes/index');
//var users = require('./routes/users');

var dgram = require('dgram');
var pubsub = require('pubsub');
var sockets = {};
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// add middleware for the dgram listeners
app.use(function(req, res, next){
  req.dgram = dgram;
  req.pubsub = pubsub;
  req.sockets = sockets;
  next();
});

// set up the sockets routes.
const sockRouter = express.Router();

sockRouter.get('/', function(req, res, next) {
  //req.sockets.push('another one');
    var topics = [];
    for (var t in req.sockets) {
        topics.push(t);
    }
    res.json(topics);
});

sockRouter.post('/add', function(req, res, next){
    const keys = [ 'port', 'protocol', 'address'];
    for (var i = 0; i < keys.length; i++ ){
        var key = keys[i];
        if (!(key in req.body)) {
          res.json({error: "Missing key " + key})
        }
    }
    // if we get here it's got everything.
    const topic = req.body.protocol + "://" + req.body.address + ":" + req.body.port;
    if (topic in req.sockets){
        const err = {error:"Socket " + topic + " already exists."};
        console.log(err['error']);
        res.json(err);
    } else {
        console.log("Need to add socket " + topic);
        var sock = req.dgram.createSocket('udp4');
        const port = parseInt(req.body.port);
        sock.bind(port, req.body.address);
        sock.on('listening', function () {
            console.log('UDP Server listening on ' + req.body.address + ":" + req.body.port);
            sock = {
                "socket": sock,
                "listeners" : []
            };
            req.sockets[topic] = sock;
            var topics = [];
            for (var t in req.sockets) {
                topics.push(t);
            }
            res.json(topics);
        });

    }
});

app.use('/sockets', sockRouter);

//app.use('/', index);
//app.use('/users', users);

// basically if we get here, this is after all the routes. 

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
