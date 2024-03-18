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

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { // checks if req.user is defined 
    return next()
  }
  res.redirect('/')
}

// wrapping routes and serialization prevents users from making requests before the database is connected.
// param is a callback which takes a client which is created within the function (see connection.js)
myDB(async client => {
  const myDataBase = await client.db('database').collection('users')

  app.route('/').get((req, res) => {
    res.render('index', {
      showLogin: true,
      title: 'Connected to Database',
      message: 'Please login'
    })
  })

  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile')
    }
  )

  app.route('/profile').get(
    ensureAuthenticated,
    (req, res) => {
      res.render('profile', {
        username: req.user.username
      })
    }
  )

  app.route('/logout').get(
    (req, res) => {
      req.logout()
      res.redirect('/')
    }
  )

  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found')
  })

  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`)
      if (err) { return done(err) }
      if (!user) { return done(null, false) }
      if (password !== user.password) { return done(null, false) }
      return done(null, user)
    })
  }))

  passport.serializeUser((user, done) => {
    done(null, user._id)
  })

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc)
    })
  })
}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' })
  })
})

//



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
