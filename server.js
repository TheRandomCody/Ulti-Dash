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
const verificationRoutes = require('./routes/verification');
const staffRoutes = require('./routes/staff');
const moderationRoutes = require('./routes/moderation');
const loggingRoutes = require('./routes/logging');
const autoRoleRoutes = require('./routes/autoRole');

app.use('/auth', authRoutes);
app.use('/api', guildRoutes);
app.use('/api/settings', verificationRoutes);
app.use('/api/settings', staffRoutes);
app.use('/api/settings', moderationRoutes);
app.use('/api/settings', loggingRoutes);
app.use('/api/settings', autoRoleRoutes);

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});