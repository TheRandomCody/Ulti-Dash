// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;

// --- MIDDLEWARE ---
const corsOptions = {
    origin: 'https://www.ulti-bot.com',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// Stripe webhook requires the raw body, so it must be placed before express.json()
app.use('/stripe/webhook', express.raw({type: 'application/json'}));
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB Atlas:', error));

// --- IMPORT & USE ROUTES ---
const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe');

app.use('/auth', authRoutes);
app.use('/stripe', stripeRoutes);

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
