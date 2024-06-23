// Device Model
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceSchema = new Schema({
    deviceID: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
        default: '',
        required: false
    },
    lastType: {
        type: String,
        default: '',
        required: false
    },
    lastActive: {
        type: Date,
        default: Date.now,
        required: true
    },
    company: {
        type: String,
        default: '',
        required: false
    },
});

module.exports = mongoose.model('Device', deviceSchema);