const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
const config = require('./config'); // get config file
const fs = require('fs');

app.use(require("body-parser").json());
app.use(bodyParser.urlencoded({
    extended: true
}));
// Public Folder
app.use(express.static('./public'));
app.set('views', path.join(__dirname, '/public'));
app.set('view engine', 'ejs');
app.set('superSecret', config.secret); // secret variable


var data = fs.readFileSync('users.json');
var users = JSON.parse(data);
var data2 = fs.readFileSync('message.json');
var messages = JSON.parse(data2);

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}


app.get('/', (req, res) =>
    res.render('index'));

app.get('/app.ejs', (req, res) => res.render('index'));

app.post('/upload', (req, res) => {

    // Set The Storage Engine
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            var dir = __dirname + '/public/' + req.body.username + '/';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            callback(null, dir);
        },
        filename: function(req, file, cb) {
            cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    });
    const upload = multer({
        storage: storage,
        limits: {
            fileSize: 1000000
        },
        fileFilter: function(req, file, cb) {
            checkFileType(file, cb);
        }
    }).single('myImage');
    upload(req, res, (err) => {
        if (err) {
            res.render('index', {
                msg: err
            });
        } else {
            if (req.file == undefined) {
                res.render('index', {
                    msg: 'Error: No File Selected!'
                });
            } else {
                res.render('index', {
                    msg: 'File Uploaded!',
                    file: `${req.body.username}/${req.file.filename}`
                });
            }
        }
    });
});


app.post('/uploadAvatar', (req, res) => {
    // Set The Storage Engine
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            var dir = __dirname + '/public/' + req.body.username + '/';
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            callback(null, dir);
        },
        filename: function(req, file, cb) {
            cb(null, 'avatar.png');
        }
    });
    const upload = multer({
        storage: storage,
        limits: {
            fileSize: 1000000
        },
        fileFilter: function(req, file, cb) {
            checkFileType(file, cb);
        }
    }).single('myAvatar');
    upload(req, res, (err) => {
        if (err) {
            res.render('index', {
                msg2: err
            });
        } else {
            if (req.file == undefined) {
                res.render('index', {
                    msg2: 'Error: No File Selected!'
                });
            } else {
                res.render('index', {
                    msg2: 'File Uploaded!',
                    file2: `${req.body.username}/${req.file.filename}`
                });

            }
        }
    });
});

app.get('/getPictureNames', function(req, resp) {
    const testFolder = __dirname + '/public/' + req.query.username + '/';
    if (fs.existsSync(testFolder)) {
        console.log(testFolder);
        const fs = require('fs');
        var arr = [];
        fs.readdirSync(testFolder).forEach(file => {
            arr.push(file);
        })
        console.log(arr);
        resp.render('index', {
            filelist: arr,
            username: req.query.username
        });
    } else {
        resp.render('index', {
            filelist: undefined
        });
    };

});

app.get('/userPage/getPictureNamesUser', function(req, resp) {
    const testFolder = __dirname + '/public/' + req.query.username + '/';
    console.log(testFolder);
    const fs = require('fs');
    var arr = [];
    fs.readdirSync(testFolder).forEach(file => {
        arr.push(file);
    })
    console.log(arr);
    resp.json({
        filelist: arr,
        username: req.query.username
    });
});

//route that requires the token to be verified
app.post('/tokenConfirmation', verifyToken, (req, res) => {
    jwt.verify(req.token, app.get('superSecret'), (err, authData) => {
        if (err) {
            if (err.name == 'TokenExpiredError') {
                res.json({
                    message: "jwt expired",
                    expiredAt: err.expiredAt
                });
                console.log("token expired");
            } else {
                res.sendStatus(403);
                console.log("I threw a 403");
                console.log(err);
            }

        } else {
            res.json({
                message: 'Token authorized',
                authData
            });
        }
    });
});


// FORMAT OF TOKEN
// Authorization: Bearer <access_token>
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.status(403).end();
    };
};


app.get('/login', function(req, resp) {
    var username = req.query.username;
    var password = req.query.password;
    if (users[username] != undefined) {
        if (users[username].password == password) {
            const payload = {
                username: username,
                email: users[username].email,
                forename: users[username].forename,
                surname: users[username].surname
            };
            var token = jwt.sign(payload, app.get('superSecret'), {
                expiresIn: '115s'
            });
            resp.json({
                success: true,
                message: 'Enjoy your token!',
                token: token
            });
        } else {
            resp.json({
                success: false,
                message: 'Invalid username or password'
            });
        };
    } else {
        resp.json({
            success: false,
            message: 'Invalid username or password'
        });
    };
})

app.post('/sendMessage', function(req, resp) {
    const username = req.body.friendusername;
    const message = req.body.message;
    const senderusername = req.body.senderusername;
    if (users[username]==undefined){
        resp.send(username + " is not an existing user on FriendsConnect");
    }else{
        resp.send("A new message was sent to " + username);
        var date = new Date();
        date = date + date.getMilliseconds();
        messages[date] = {
            receiverUsername: username,
            senderUsername: senderusername,
            message: message
        };
        var data = JSON.stringify(messages, null, 2);
        fs.writeFile('message.json', data, finished);
    };
    
    function finished(err) {
        console.log('some error occured');
    }
})

app.post('/signup', function(req, resp) {
    const username = req.body.username;
    if (users[username] == undefined) {
        users[username] = {
            forename: req.body.firstname,
            surname: req.body.lastname,
            email: req.body.email,
            password: req.body.password
        };
        var data = JSON.stringify(users, null, 2);
        fs.writeFile('users.json', data, finished);
        resp.send("request for new user whose username is " + req.body.username);
    } else {
        resp.send("username already exists, please choose another one");
    };

    function finished(err) {
        console.log('error when writing data to the file');
    }


})

app.get('/displayMessage', function(req, res) {
    var username = req.query.username;
    var fixture;
    var arr = [];
    for (var i in messages) {
        fixture = messages[i];
        if ((fixture.receiverUsername == username) || (fixture.senderUsername == username)) {
            arr.push(JSON.stringify(fixture));
        }
    }
    res.json({
        array: arr
    });

})

app.get('/searchUser', function(req, res) {
    var usernametofind = req.query.usernametofind;
    console.log(usernametofind);
    if (users[usernametofind] != undefined) {
        res.json({
            success: true,
            username: usernametofind,
            firstname: users[usernametofind].forename,
            lastname: users[usernametofind].surname
        });
    } else {
        res.json({
            success: false,
            username: usernametofind
        });
    };

})

app.get('/userPage', (req, res) =>
    res.render('userPage'));

app.post('/people', function(req, res) {
    if (req.body.access_token != undefined) {
        if (req.body.access_token == "concertina") {
            if (users[username] == undefined) {
                users[username] = {
                    forename: req.body.firstname,
                    surname: req.body.lastname,
                    email: req.body.email,
                    password: req.body.password
                };
            } else {
                res.sendStatus(400);
            };
        };
    } else {
        res.sendStatus(403);
    };
})

app.get('/people', function(req, res) {
    res.send(users);
})

app.get('/people/:username', function(req, resp) {
    username = req.params.username;
    console.log('Received username ' + username);
    if (users[username] != undefined) {
        resp.send(users[username]);

    };

})

module.exports = app;