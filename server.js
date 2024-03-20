'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// my code
const session = require('express-session')
const passport = require('passport')
const { ObjectID } = require('mongodb')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const routes = require('./routes.js')
const auth = require('./auth.js')
const http = require('http').createServer(app)
const io = require('socket.io')(http)

app.set('view engine', 'pug')
app.set('views', './views/pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}))

app.use(passport.initialize())
app.use(passport.session())

// wrapping routes and serialization prevents users from making requests before the database is connected.
// param is a callback which takes a client which is created within the function (see connection.js)
myDB(async client => {
  const myDataBase = await client.db('database').collection('users')

  routes(app, myDataBase)
  auth(app, myDataBase)

  io.on('connection', socket => { // sockets are clients
    console.log('A user has connected')
  })
}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' })
  })
})

//

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});

