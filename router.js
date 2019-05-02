const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const user_model = require('./user_model');

const router = express.Router();

const {DATABASE_URL, PORT} = require('./config');

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

mongoose.connect(DATABASE_URL);
const conn = mongoose.createConnection(DATABASE_URL);


//Init gfs
let gfs;

//Open connection with database
conn.once('open', () => {
    //Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')
});





router.post('/signup', (req,res) => {
    var username = req.body.username;
    var password = req.body.password;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
    
    console.log(username);
    
    var newuser = new user_model();
    newuser.username = username;
    newuser.password = password;
    newuser.firstname = firstname;
    newuser.lastname = lastname;
    newuser.save(function (err, savedUser) {
        if (err) {
            console.log(err);
            return res.status(500).send('ERROR');
        } else {
            return res.status(202).send('It worked');
        }
    });
});


router.get('/allusers', (req,res) => {
    var select = req.query.select;
    user_model.find({}, function(err,foundData) {
        if (err) {
            console.log(err);
            return res.status(500).send();
        } else {
            if (foundData.length == 0) {
                var responseObject = undefined;
                if (select && select == 'count') {
                    responseObject = {count: 0};
                }
                
                res.status(404).send(responseObject);
            } else {
                var responseObject = foundData;
                if (select && select == 'count') {
                    responseObject = {count: foundData.length};
                }
                res.send(responseObject);
            }
        } 
    });
});

router.put('/update/:username', (req, res) => {
    var username = req.params.username;
    user_model.findOne({username: username}, (err, foundObject) => {
        if (err) {
            console.log(err);
            res.status(500).send();
        } else {
            if (!foundObject) {
                res.status(404).send();
            } else {
                if (req.body.username) {
                    foundObject.username = req.body.username;
                }
                if (req.body.password) {
                    foundObject.password = req.body.password;
                }
                if (req.body.firstname) {
                    foundObject.firstname = req.body.firstname;
                }
                if (req.body.lastname) {
                    foundObject.lastname = req.body.lastName;
                }
                
                foundObject.save((err, updatedObject) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send('ERROR');
                    } else {
                        res.send(updatedObject);
                    }
                });
            }
        }  
    });
});

router.delete('/delete/:username', (req,res) => {
    var username = req.params.username;
    user_model.findOneAndRemove({username: username}, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send();
        }
        
        return res.status(200).send('User deleted');
        
    });
});


/*router.get('/', (req,res) => {
    if (!req.session.user) {
        res.render('signin');
    }
    
    res.render('index');
}); */


// @route GET /
// @desc Loads form
router.get('/', (req,res) => {
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

// @route GET /signin
// @desc Loads sign in form
router.get('/signin', (req,res) => {
    res.render('signin');
});

// @route GET /signup
// @desc Loads registration form
router.get('/signup', (req,res) => {
    res.render('signup');
});

// @route GET /search
// @desc Loads search form and results
router.get('/search', (req,res) => {
    res.render('search');
});

// @route GET /following
// @desc Loads users followed by current user
router.get('/following', (req,res) => {
    res.render('following');
});

// @route GET /upload
// @desc Loads upload form
router.get('/upload', (req,res) => {
    res.render('upload');
});

// @route GET /settings
// @desc Loads user's settings
router.get('/settings', (req,res) => {
    res.render('settings');
});

// @route GET /photodetails
// @desc Loads photo details
router.get('/photodetails', (req,res) => {
    res.render('photodetails');
});





// @route POST /upload
// @desc Uploads file to db
router.post('/upload', upload.single('file'), (req,res) => {
    //file comes from "input name" in html
    //res.json({file: req.file});
    res.redirect('/');
});


// @route GET /files
// @desc Display all files in JSON
router.get('/files', (req, res) => {
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
router.get('/files/:filename', (req, res) => {
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
router.get('/image/:filename', (req, res) => {
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
router.delete('/files/:id', (req, res) => {
    gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridS) => {
        if (err) {
            return res.status(404).json({err: err})
        }
        
        res.redirect('/');
    });
});

module.exports = router;

//bonyug bel dam jedua vudigo yodui quele magnifik e jet de la revua on person