//Location model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Device = require('./Device');

const locationSchema = new Schema({
  ip_address: {
    type: String,
    required: false
  },
  name: {
    type: String,
    required: false
  },
  type: {
    type: String,
    default: 'Person',
    required: true
  },
  deviceID: {
    type: String,
    default: 'Unknown',
    required: true
  },
  active: {
    type: Boolean,
    default: false,
    required: true
  },
  utctime: {
    type: String,
    required: false
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
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
  satellites: {
    type: Number,
    default: null,
    required: false
  },
  hdop: {
    type: Number,
    default: null,
    required: false
  },
  serverTime: {
    type: Date,
    required: true,
  }
});

locationSchema.methods.setDataFromUDP = async function(udpData, serverTime) {
  if (!udpData || typeof(udpData) != 'string' || udpData.length < 10) {
    return null;
  }
  dataArray = udpData.split(',');
  if (dataArray.length < 8) {
      return null;
  }
  // parse the data
  var type = dataArray.shift();
  var deviceId = dataArray.shift();
  var active = dataArray.shift();
  var messageFormat = dataArray.shift();

  const device = await Device.findOneAndUpdate({ deviceID: deviceId }, { lastType: type, lastActive: serverTime }, { upsert: true, new: true });
  if (!device.name) {
    device.name = deviceId;
    device.save();
  }
  this.name = device.name;

  this.type = type;
  this.deviceID = deviceId;
  // regex to validate the message format
  if (messageFormat.match(/[$]G[A-Z]GGA/)) {
      var [utctime, lat, latdir, long, longdir, quality, satellites, hdop, altitude, altitudeUnit] = dataArray;
      // quality (0 = no Fix, 1 = autonomous GNSS fix, 2 = differential GNSS fix, 4 = RTK fix, 5 = RTK float, 6 = estimated/dead reckoning fix)
      this.utctime = utctime;
      this.quality = quality;
      this.satellites = satellites;
      this.hdop = hdop;
      this.SetLatitudeWithDms(lat, latdir);
      this.SetLongitudeWithDms(long, longdir);
    } else if (messageFormat.match(/[$]G[A-Z]GLL/)) {
      var [lat, latdir, long, longdir, utctime, status, posMode] = dataArray;
      // status (A = data valid, V = data invalid)
      // posMode (N = No fix, E = estimated/dead reckoning fix, A = autonomous GNSS fix, D = differential GNSS fix, F = RTK float, R = RTK fixed)
      this.utctime = utctime;
      this.status = status;
      this.posMode = posMode[0];
      this.SetLatitudeWithDms(lat, latdir);
      this.SetLongitudeWithDms(long, longdir);
    } else if (messageFormat.match(/[$][A-Z]{2}GNS/)) {
      var [utctime, lat, latdir, long, longdir, posMode, satellites, hdop, altitude] = dataArray;
      this.utctime = utctime;
      this.posMode = posMode[0];
      this.satellites = satellites;
      this.hdop = hdop;
      this.SetLatitudeWithDms(lat, latdir);
      this.SetLongitudeWithDms(long, longdir);
    } else if (messageFormat.match(/[$][A-Z]{2}RMC/)) {
      var [utctime, status, lat, latdir, long, longdir, speed, course, date, magVar, magVarDir, posMode] = dataArray;
      this.utctime = utctime;
      this.status = status;
      this.posMode = posMode[0];
      this.SetLatitudeWithDms(lat, latdir);
      this.SetLongitudeWithDms(long, longdir);
    }
    this.active = active;
}

locationSchema.methods.SetLatitudeWithDms = function(latitudeDms, latitudeDirection) {
  /*  Convert latitude from DMS to DD
  *   latitudeDms: string - ddmm.mmmmm
  */
  const degrees = parseFloat(latitudeDms.substring(0, 2))
  const minutes = parseFloat(latitudeDms.substring(2, 4))
  const minuteFractional = parseFloat(latitudeDms.substring(5,10))
  var dd = degrees + minutes/60 + minuteFractional/(100000*60);
  if (latitudeDirection == "S") {
    dd = dd * -1;
  }
  this.latitude = dd;
}

locationSchema.methods.SetLongitudeWithDms = function(longitudeDms, longitudeDirection) {
  /*  Convert longitude from DMS to DD
  *   longitudeDms: string - dddmm.mmmmm
  */
  const degrees = parseFloat(longitudeDms.substring(0, 3))
  const minutes = parseFloat(longitudeDms.substring(3, 5))
  const minuteFractional = parseFloat(longitudeDms.substring(6,11))
  var dd = degrees + minutes/60 + minuteFractional/(100000*60);
  if (longitudeDirection == "W") {
    dd = dd * -1;
  }
  this.longitude = dd;
}

module.exports = mongoose.model('Location', locationSchema);