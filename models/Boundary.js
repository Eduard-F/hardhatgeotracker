// Boundary model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Device = require('./Device');
const { name } = require('ejs');

const BoundarySchema = new Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'Feature',
    required: true
  },
  properties: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      default: '',
      required: false
    },
    type: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: false,
      required: true
    },
    alarmType: {
      type: String,
      default: '',
      required: false
    },
    // distance in milimeters
    alarmDistance: {
      type: Number,
      default: 0,
      required: false
    },
    utctime: {
      type: String,
      required: false
    },
    status: {
      type: String,
      default: '',
      required: false
    },
    posMode: {
      type: String,
      default: '',
      required: false
    },
    quality: {
      type: Number,
      default: null,
      required: false
    },
  },
  geometry: {
    type: {
      type: String,
      enum: ['LineString', 'Polygon', 'Point', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'],
      required: true
    },
    coordinates: {
      type: [[Number]],
      required: true
    }
  }
});

BoundarySchema.methods.updateDataFromUDP = async function(udpData, newBoundary) {
  dataArray = udpData.split(',');
  this.properties.type = dataArray.shift();
  this.id = dataArray.shift();
  this.properties.id = this.id;
  if (!this.properties.name) { this.properties.name = this.id; };
  var active = dataArray.shift();
  var messageFormat = dataArray.shift();

  // regex to validate the message format
  if (messageFormat.match(/[$]G[A-Z]GGA/)) {
    var [utctime, lat, latdir, long, longdir, quality, satellites, hdop, altitude, altitudeUnit] = dataArray;
    // quality (0 = no Fix, 1 = autonomous GNSS fix, 2 = differential GNSS fix, 4 = RTK fix, 5 = RTK float, 6 = estimated/dead reckoning fix)
    this.properties.utctime = utctime;
    this.properties.quality = quality;
    this.properties.satellites = satellites;
    this.properties.hdop = hdop;
  } else if (messageFormat.match(/[$]G[A-Z]GLL/)) {
    var [lat, latdir, long, longdir, utctime, status, posMode] = dataArray;
    // status (A = data valid, V = data invalid)
    // posMode (N = No fix, E = estimated/dead reckoning fix, A = autonomous GNSS fix, D = differential GNSS fix, F = RTK float, R = RTK fixed)
    this.properties.utctime = utctime;
    this.properties.status = status;
    this.properties.posMode = posMode[0];
  } else if (messageFormat.match(/[$][A-Z]{2}GNS/)) {
    var [utctime, lat, latdir, long, longdir, posMode, satellites, hdop, altitude] = dataArray;
    this.properties.utctime = utctime;
    this.properties.posMode = posMode[0];
    this.properties.satellites = satellites;
    this.properties.hdop = hdop;
  } else if (messageFormat.match(/[$][A-Z]{2}RMC/)) {
    var [utctime, status, lat, latdir, long, longdir, speed, course, date, magVar, magVarDir, posMode] = dataArray;
    this.properties.utctime = utctime;
    this.properties.status = status;
    this.properties.posMode = posMode[0];
  }
  var coordinates = this.GetCoordinatesWithDms(lat, latdir, long, longdir);
  
  if (newBoundary) {
    this.geometry.coordinates = coordinates;
  } else {
    this.geometry.coordinates.push(coordinates);
  }
  this.properties.active = active;
  this.properties.alarmType = 'nearBoundary';
  this.properties.alarmDistance = 1000;
  this.geometry.type = 'LineString';
}

BoundarySchema.methods.GetCoordinatesWithDms = function(latDms, latitudeDirection, longDms, longitudeDirection) {
  var latitudeDD = parseFloat(latDms.substring(0, 2)) + parseFloat(latDms.substring(2, 4)) / 60 + parseFloat(latDms.substring(5, 10)) / (100000 * 60);
  if (latitudeDirection == "S") {
    latitudeDD = latitudeDD * -1;
  }
  var longitudeDD = parseFloat(longDms.substring(0, 3)) + parseFloat(longDms.substring(3, 5)) / 60 + parseFloat(longDms.substring(6, 11)) / (100000 * 60);
  if (longitudeDirection == "W") {
    longitudeDD = longitudeDD * -1;
  }
  return [longitudeDD, latitudeDD];
}

module.exports = mongoose.model('Boundary', BoundarySchema);