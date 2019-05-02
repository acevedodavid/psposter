const mongoose = require('mongoose');

var photoDetailsSchema = new mongoose.Schema({
    username: String,
    filename: String,
    description: String,
    location: String,
    date: String,
    private: Boolean
});

var photodetails_model = mongoose.model('photoDetails', photoDetailsSchema);
module.exports = photodetails_model;