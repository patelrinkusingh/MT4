const express = require('express');
const path = require('path');
const port = 7000;
const session = require('express-session');
const cookieparser = require('cookie-parser');
const ejs = require('ejs');
const flash = require('express-flash');
const passport = require('passport');

const app = express();
// Set up the view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use necessary middlewares
app.use(session({
    name: 'user',
    secret: 'maulik',
    saveUninitialized: true,
    resave: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 //1 day
    }
}));
// middleware
app.use(passport.session());
app.use(flash());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(express.json({ limit: '50mb' }));
// Middleware to handle errors
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

// Use the routes defined in the routes.js file
app.use('/', require('./routes'));
app.get('*', function (req, res) {
    res.render('errorPage/index.ejs');
})
app.listen(port, (err) => {
    if (err) {
        console.log('Server is not starting');
        return false;
    }
    console.log('Server is running on port:', port);
});
