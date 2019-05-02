const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');


const router = require('./router');

const app = express();

mongoose.Promise  = global.Promise;
const {DATABASE_URL, PORT} = require('./config');

//Middleware
app.use('/', bodyParser.json(), router);
app.use(express.urlencoded({ extended: false }));
//secret is random string to keep the session alive
//in real life shouldn't be in public code
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));