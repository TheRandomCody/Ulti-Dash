// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const baseMongoURI = process.env.MONGO_URI;
const dbName = 'ulti-bot-db';
const uriParts = baseMongoURI.split('?');
let baseUri = uriParts[0];
if (baseUri.endsWith('/')) {
    baseUri = baseUri.slice(0, -1);
}
const mongoURI = `${baseUri}/${dbName}?${uriParts[1] || 'retryWrites=true&w=majority'}`;

// --- MIDDLEWARE ---
const corsOptions = {
    origin: 'https://www.ulti-bot.com',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.set('trust proxy', 1);
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB Atlas:', error));

// --- IMPORT & USE ROUTES ---
const authRoutes = require('./routes/auth');
const guildRoutes = require('./routes/guilds');
const settingsRoutes = require('./routes/settings');

app.use('/auth', authRoutes); // All auth routes will be prefixed with /auth
app.use('/api', guildRoutes); // All guild routes will be prefixed with /api
app.use('/api/settings', settingsRoutes); // All settings routes will be prefixed with /api/settings

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
