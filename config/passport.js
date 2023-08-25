// Import required modules
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt'); // for password comparison
const passport = require('passport');
const db = require("../models");

// create main Model
const Register = db.registers;

passport.use(new LocalStrategy({
    usernameField: 'email' // Use email as the username field
}, async (email, password, done) => {
    try {
        // Find user with the given email
        const user = await Register.findOne({ where: { email } });
        if (!user) {
            // If user not found, return false with error message
            return done(null, false, { message: 'Incorrect email' });
        }
        // Compare password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // If password not matched, return false with error message
            return done(null, false, { message: 'Incorrect password' });
        }
        // If user found and password matched, return user object
        return done(null, user);
    } catch (err) {
        // If error occurred, return error message
        console.log('authenticateUser error:', err);
        return done(err);
    }
}));

// Serialize user object into session
passport.serializeUser((user, done) => done(null, user.id));

// Deserialize user object from session
passport.deserializeUser(async (id, done) => {
    try {
        // Find user with the given id
        const user = await Register.findOne({ where: { id } });
        if (!user) {
            // If user not found, return false
            return done(null, false);
        }
        // If user found, return user object
        return done(null, user);
    } catch (err) {
        // If error occurred, return error message
        return done(err);
    }
});

// Middleware to check user authentication
passport.checkAuthentication = (req, res, next) => {
    if (req.isAuthenticated()) {
        // If user authenticated, call next middleware
        return next();
    }
    // If user not authenticated, redirect to homepage
    res.redirect('/');
};

// Export passport module
module.exports = passport;
