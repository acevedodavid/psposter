const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

mongoose.Promise  = global.Promise;
const {DATABASE_URL, PORT} = require('./config');

//Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

let server;


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

const conn = mongoose.createConnection(DATABASE_URL);

//Init gfs
let gfs;

//Open connection with database
conn.once('open', () => {
    //Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')
});

// Create storage engine
const storage = new GridFsStorage({
  url: DATABASE_URL,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });



// @route GET /
// @desc Loads form
app.get('/', (req,res) => {
    //app.render('index');
    //res.render('index');
    gfs.files.find().toArray((err,files) => {
        //files don't exist
        if (!files || files.length === 0) {
            res.render('index', {files: false});
        } else {
            files.map(file => {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    //Read output to browser
                    file.isImage = true; 
                } else {
                    file.isImage = false;
                }
            });
            res.render('index', {files: files});
        }
    });
});

// @route POST /upload
// @desc Uploads file to db
app.post('/upload', upload.single('file'), (req,res) => {
    //file comes from "input name" in html
    //res.json({file: req.file});
    res.redirect('/');
});


// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err,files) => {
        //files don't exist
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No file exist'
            });
        }
        
        //files exist
        return res.json(files);
    });
});


// @route GET /files:filename
// @desc Display single file object
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err,file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }
        //file exists
        return res.json(file);
    });
});

// @route GET /image:filename
// @desc Display image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err,file) => {
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }
        
        //Check if image (jpeg, png)
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            //Read output to browser
            
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);   
        } else {
            res.status(404).json({
                err: 'Not an image',
            });
        }
        
    });
});

// @route Delete /files/:id
// @desc Delete file
app.delete('/files/:id', (req, res) => {
    gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridS) => {
        if (err) {
            return res.status(404).json({err: err})
        }
        
        res.redirect('/');
    });
});

// @route GET /signin
// @desc Loads sign in form
app.get('/signin', (req,res) => {
    res.render('signin');
});

// @route GET /signup
// @desc Loads registration form
app.get('/signup', (req,res) => {
    res.render('signup');
});


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

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

//module.exports = { app, runServer, closeServer };