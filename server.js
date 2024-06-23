// Real time GPS tracking server
// express server that listens for dgram UDP packets from GPS tracking devices
// and saves the data to a database

const express = require('express');
const dgram = require('dgram');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

const utils = require('./utils');

const Location = require('./models/Location');
const Boundary = require('./models/Boundary');
const Device = require('./models/Device');
const ntripData = require('./models/NtripData');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'));

var mongoDbExists = false;
try {
  const config = require('./config');
  // Connect to MongoDB
  mongoose.connect(config.db)
    .then(() => {
      console.log('Connected to MongoDB');
      mongoDbExists = true;
    })
    .catch((error) => {
      console.log('Error connecting to MongoDB: ' + error);
      mongoDbExists = false;
    });
} catch (error) {
  console.log('No MongoDB configuration found');
  mongoDbExists = false;
}

const gpsUdpServer = dgram.createSocket('udp4');
gpsUdpServer.bind(8001);
const ntripUdpServer = dgram.createSocket('udp4');
ntripUdpServer.bind(8002);

// Listen for incoming GPS packets
gpsUdpServer.on('listening', function () {
  var address = gpsUdpServer.address();
  console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

// Save incoming UDP packets to the database
gpsUdpServer.on('message', async function (message, remote) {
  const time = new Date();
  console.log('Received packet from ' + remote.address + ':' + remote.port + ' - ' + time);
  console.log('Data: ' + message);

  // Parse the incoming data
  // example data: $P,1,1,$GNGGA,030021.00,3655.00084,S,17454.01638,E,5,11
  try {
    const messageStr = message.toString();
    if (messageStr.toUpperCase().startsWith('$B')) {
      var newBoundary = true;
      const dataArray = messageStr.split(',');
      if (dataArray.length < 7) {
        return null;
      }
      var type = dataArray.shift();
      var deviceId = dataArray.shift();
      var active = dataArray.shift();
      var boundary = await Boundary.findOne({ 'properties.id': deviceId }).exec();
      if (!boundary) {
        boundary = new Boundary();
      }
      var device = await Device.findOneAndUpdate({ deviceID: deviceId }, { lastType: type, lastActive: time }, { upsert: true }).lean().exec();
      // check if boundary exists or is older than 5 minutes or if the type has changed
      if (device.lastType != type || time - device.lastActive > 5*60*1000) {
        newBoundary = true;
      } else {
        newBoundary = false;
      }
      boundary.updateDataFromUDP(messageStr, newBoundary);
      await boundary.save()
        .catch((error) => {
          console.log('Error saving boundary to MongoDB: ' + error);
        });
      io.emit('boundary', boundary);
    } else if (messageStr.toUpperCase().startsWith('$P')) {
      const location = new Location();
      location.serverTime = time;
      location.ip_address = remote.address;
      await location.setDataFromUDP(messageStr, time);
      if (location.latitude && location.longitude && location.deviceID) {
        io.emit('location', location);
      } else {
        console.log('Incomplete UDP data. Ignoring.');
        return;
      }
      utils.checkWorkArea(location, remote, gpsUdpServer);
    } else {
      console.log('Unknown UDP data: ' + messageStr);
    }

  } catch (error) {
    console.log('Error parsing data: ' + error);
  }
});

// Listen for incoming NTRIP packets
ntripUdpServer.on('listening', function () {
  var address = ntripUdpServer.address();
  console.log('UDP Server listening on ' + address.address + ':' + address.port);
});

ntripUdpServer.on('message', async function (message, remote) {
  console.log('Received ntrip packet from ' + remote.address + ':' + remote.port);

  var data = await ntripData.findOne();
  // combind both buffers
  var buffer = Buffer.concat([data.smallBuffer, data.largeBuffer]);
  ntripUdpServer.send(buffer, 0, buffer.length, remote.port, remote.address, function (err) {
    if (err) {
      console.log('Error sending UDP response: ' + err);
    }
  });
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

app.use('/', indexRouter);
app.use('/api', apiRouter);

// static folder
app.use('/static', express.static(path.join(__dirname, 'static')));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('If you can see this then something went wrong!');
});

server.listen(8000);
console.log('Server started on http://localhost:8000');
