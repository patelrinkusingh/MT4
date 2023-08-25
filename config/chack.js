const jwt = require('jsonwebtoken');
const { Register } = require('../models');

// Middleware function to check authentication
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Extract the token from the authorization header
    console.log(token);
    if (!token) {
        // No token provided
        return res.status(401).json({ message: 'Please login' });
    }

    try {
        const decodedToken = jwt.verify(token, 'MAULIK'); // Verify the token using the secret key
        req.user = decodedToken; // Attach the decoded token to the request
        next(); // Move to the next middleware or route handler
    } catch (err) {
        // Invalid token
        return res.status(401).json({ message: 'Please login' });
    }
};


module.exports = { authenticate };
