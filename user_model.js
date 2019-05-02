const mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: {type: String},
    firstname: String,
    lastname: String
});

var user_model = mongoose.model('user', userSchema);
module.exports = user_model;