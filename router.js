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

let uri = '/index';

const user_model = require('./user_model');
const photodetails_model = require('./photodetails_model');

const router = express.Router();

router.use(express.urlencoded({ extended: false }));
router.use(session({secret: "fnpqih08gewh34rfe9dfae", resave: false, saveUninitialized: true}));

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
          req.fileInfo = fileInfo;
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


router.post('/login', (req,res) => {
    user_model.findOne({
        username: req.body.username, 
        password: req.body.password
    }, function (err, foundUser) {
        if (err) {
            console.log(err);
            return res.status(500).send('ERROR');
        } else {
            if (foundUser) {
                req.session.user = foundUser;
                res.redirect('/');
            } else {
                req.session.user = undefined;
                res.redirect('/signin');
            }
        }
    }); 
});

router.get('/logout', (req,res) => {
    req.session.destroy();
    res.redirect('/');
});



router.post('/register', (req,res) => {
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
                    foundObject.lastname = req.body.lastname;
                }
                
                foundObject.save((err, updatedObject) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send('ERROR');
                    } else {
                        req.session.user = foundObject;
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


router.get('/', (req,res) => {
    if (!req.session.user) {
        return res.render('signin');
    }
    gfs.files.find().toArray((err,files) => {
        //console.log('got in files');
        //files don't exist
        if (!files || files.length === 0) {
            console.log('no files');
            return res.render('index', {files: false});
        } else {
            var photodetails = [];
            photodetails_model.find({username: req.session.user.username}, (err, foundData) => {
                //console.log(foundData);
                if (err) {
                    console.log(err);
                    return res.status(500).send();
                }
                if (foundData) {
                    photodetails = foundData;
                    console.log(photodetails);
                }
                //console.log(photodetails);
                files.map(file => {
                    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                        //Read output to browser
                        file.isImage = true; 
                    } else {
                        file.isImage = false;
                    }
                });
                //console.log(photodetails);
                return res.render('index', {files: files, photodetails: photodetails});
            });
        }
    });
});

router.get('/userInfo', (req,res) => {
    //console.log('You are logged in');
    return res.status(201).json({
        username: req.session.user.username,
        firstname: req.session.user.firstname,
        lastname: req.session.user.lastname,
        profilepicture: req.session.user.profilePicture
    });
});

router.get('/settingsInfo', (req,res) => {
    //console.log('You are logged in');
    return res.status(201).json({
        username: req.session.user.username,
        firstname: req.session.user.firstname,
        lastname: req.session.user.lastname,
        password: req.session.user.password
    });
});

router.post('/updateSettings', (req,res) => {
    //console.log(req.body);
    var username = req.session.user.username;
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
                    foundObject.lastname = req.body.lastname;
                }
                
                console.log(req.body);
                
                foundObject.save((err, updatedObject) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send('ERROR');
                    } else {
                        req.session.user = foundObject;
                        res.redirect('/');
                    }
                });
            }
        }  
    });
});

router.post('/updatePhotoInfo', (req,res) => {
    //console.log(req.body);
    var filename = 'ed8a8fa7e75af8e110cc3f6bc2006225.png';
    photodetails_model.findOne({filename: filename}, (err, foundObject) => {
        if (err) {
            console.log(err);
            res.status(500).send();
        } else {
            if (!foundObject) {
                res.status(404).send();
            } else {
                if (req.body.description) {
                    foundObject.description = req.body.description;
                }
                if (req.body.location) {
                    foundObject.location = req.body.location;
                }
                if (req.body.date) {
                    foundObject.date = req.body.date;
                }
                if (req.body.private) {
                    foundObject.private = req.body.private;
                }
                
                console.log(req.body);
                
                foundObject.save((err, updatedObject) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send('ERROR');
                    } else {
                        res.redirect('/');
                    }
                });
            }
        }  
    });
});

router.get('/photodetails/:filename', (req,res) => {
    var filename = req.params.filename;
    photodetails_model.findOne({filename: filename}, (err, foundPhoto) => {
        if (foundPhoto){
            var objectDetails = {
                filename: filename,
                username: foundPhoto.username,
                description: foundPhoto.description,
                location: foundPhoto.location,
                date: foundPhoto.date,
                private: foundPhoto.private
            };
            return res.render('photodetails', objectDetails);
        } else {
                               return res.status(404).send('Image not found');
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
    if (!req.session.user) {
        return res.render('signin');
    }
    res.render('search');
});

// @route GET /following
// @desc Loads users followed by current user
router.get('/following', (req,res) => {
    if (!req.session.user) {
        return res.render('signin');
    }
    return res.render('following');
});

// @route GET /upload
// @desc Loads upload form
router.get('/upload', (req,res) => {
    if (!req.session.user) {
        return res.render('signin');
    }
    return res.render('upload');
});

// @route GET /settings
// @desc Loads user's settings
router.get('/settings', (req,res) => {
    if (!req.session.user) {
        return res.render('signin');
    }
    return res.render('settings');
});

// @route GET /photodetails
// @desc Loads photo details
router.get('/photodetails', (req,res) => {
    if (!req.session.user) {
        return res.render('signin');
    }
    return res.render('photodetails');
});





// @route POST /upload
// @desc Uploads file to db
router.post('/upload', upload.single('file'), (req,res) => {
    //console.log('got to upload');
    //file comes from "input name" in html
    //res.json({file: req.file});
    var username = req.session.user.username;
    var filename = req.fileInfo.filename;
    var description = req.body.description;
    var location = req.body.location;
    var date = req.body.date;
    var private = req.body.private;
    
    var newPhoto = new photodetails_model();
    newPhoto.username = username;
    newPhoto.filename = filename;
    newPhoto.description = description;
    newPhoto.location = location;
    newPhoto.date = date;
    newPhoto.private = private;
    console.log(newPhoto);
    newPhoto.save(function (err, savedPhoto) {
        if (err) {
            console.log(err);
            return res.status(500).send('ERROR');
        } else {
            return res.redirect('/');
        }
    });
});

router.get('/searchUsers', (req,res) => {
    var myString = req.body.stringToSearch;
    if (myString) {
        var query = { $or: [{username: myString}, {firstname: myString},{lastname: myString}] };
        user_model.find(query, 'username, firstname, lastname', (err, foundUser) => {
            if (err) {
                console.log(err);
                return res.status(500).send('ERROR');
            } else {
                console.log(foundUser);
            }
        });
    }
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