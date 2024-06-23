const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var ntripSchema = new Schema({
    id: Number,
    smallBuffer: Buffer,
    largeBuffer: Buffer
});

module.exports = mongoose.model('NtripData', ntripSchema);