const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const session = require('express-session');

const router = require('./router');

const app = express();

mongoose.Promise  = global.Promise;
const {DATABASE_URL, PORT} = require('./config');

//Middleware
app.use('/', bodyParser.json(), router);
app.use(session({secret: "fnpqih08gewh34rfe9dfae", resave: false, saveUninitialized: true}));
//secret is random string to keep the session alive
//in real life shouldn't be in public code
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

//module.exports = { app, runServer, closeServer };


//let server;
//Run server and create mongo connection
/*function runServer(port, databaseUrl){
	return new Promise( (resolve, reject) => {
		mongoose.connect(databaseUrl,
				err => {
					if (err){
						return reject(err);
					}
					else{
						server = app.listen(port, () =>{
							console.log('Your app is running in port ', port);
                            console.log('wow');
							resolve();
						})
						.on('error', err => {
							mongoose.disconnect();
							return reject(err);
						});
					}
				}
			);
	});
}*/

/*
function closeServer(){
	return mongoose.disconnect()
		.then(() => {
			return new Promise((resolve, reject) => {
				console.log('Closing the server');
				server.close( err => {
					if (err){
						return reject(err);
					}
					else{
						resolve();
					}
				});
			});
		});
}
*/
/*runServer(PORT, DATABASE_URL)
	.catch(err => console.log(err));*/