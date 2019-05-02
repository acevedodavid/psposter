const mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: String,
    firstname: String,
    lastname: String,
    profilePicture: {type: String, default: "default.png"},
    following: [{type: String}]
});

var user_model = mongoose.model('user', userSchema);
module.exports = user_model;