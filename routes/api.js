var express = require('express');
var router = express.Router();
const Location = require('../models/Location');
const Boundary = require('../models/Boundary');
const Device = require('../models/Device');

// get all locations from MongoDB
router.get('/locations', async function (req, res) {
  try {
    let location = await Location.find();
    res.send(location);
  } catch (error) {
    console.log('Error getting Location: ' + error);
  }
});

// get all boundaries from MongoDB
router.get('/workarea/', async function (req, res) {
  try {
    let boundary = await Boundary.find();
    res.send({
      "type": "FeatureCollection",
      "features": boundary
    });
  } catch (error) {
    console.log('Error getting boundary: ' + error);
  }
});

// api to get a certain workarea
router.get('/workarea/:id', async function (req, res) {
  console.log('workarea id: ' + req.params.id);
  try {
    let boundary = await Boundary.findOne({ id: req.params.id });
    res.send(boundary);
  } catch (error) {
    console.log('Error getting boundary: ' + error);
  }
});

// api to add new workarea
router.post('/workarea', async function (req, res) {
  try {
    const newBoundary = new Boundary(req.body);
    await newBoundary.save();
    res.send('Workarea added');
  } catch (error) {
    console.log('Error adding workarea: ' + error);
  }
});

// api to update workarea
router.put('/workarea/:id', async function (req, res) {
  try {
    const boundary = await Boundary.findOneAndUpdate({ id: req.params.id }, req.body);
    res.send('Workarea updated');
  } catch (error) {
    console.log('Error updating boundary: ' + error);
  }
});

// api to delete workarea
router.delete('/workarea/:id', async function (req, res) {
  try {
    await Boundary.deleteOne({ id: req.params.id });
    res.send('Workarea deleted');
  } catch (error) {
    console.log('Error deleting workarea: ' + error);
  }
});

// api to update device
router.put('/device/:id', async function (req, res) {
  try {
    await Device.findOneAndUpdate({ deviceID: req.params.id }, { name: req.body.name });
    res.send('Device updated');
  } catch (error) {
    console.log('Error updating device: ' + error);
  }
});


module.exports = router;