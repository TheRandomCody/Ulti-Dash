// File: server.js
// UPDATED: Now imports and uses the new servers router.

// --- 1. SETUP & IMPORTS ---
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// This is needed for Render to trust the proxy and for secure cookies to work.
app.set('trust proxy', 1);

// --- 2. MIDDLEWARE ---
app.use(cors({
    origin: process.env.FRONTEND_URL, // Use the production URL from .env
    credentials: true
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        secure: true, // Must be true for sameSite:'none' to work
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        sameSite: 'none', // Allows the cookie to be sent from a different domain
        domain: 'ulti-bot.com' // Set the parent domain
    }
}));

// --- 3. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully.'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- 4. IMPORT & USE ROUTES ---
// Import the router files
const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe');
const serverRoutes = require('./routes/servers'); // New route for servers

// Tell the app to use the router files for specific paths
app.use('/api/auth', authRoutes.authRouter);
app.use('/api/users', authRoutes.usersRouter);
app.use('/api/stripe', stripeRoutes);
app.use('/api/servers', serverRoutes); // Use the new server routes

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Users Service listening on port ${PORT}`);
});