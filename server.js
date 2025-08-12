// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // This line loads the .env file
const app = express();

// Render provides the PORT environment variable.
const port = process.env.PORT || 3000;

// We now get the mongoURI from the environment variables.
const mongoURI = process.env.MONGO_URI;

app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB Atlas:', error));


// --- DATABASE SCHEMAS & MODELS ---

// User Schema: Stores individual user profiles linked by their Discord ID.
const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    level: { type: Number, default: 1 },
    bio: { type: String, default: 'No bio set.' },
    joined: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);


// Server Settings Schema: Stores verification settings for each server (guild).
// The guildId is the unique identifier for each server's settings.
const serverSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    verificationChannelId: { type: String, required: true },
    unverifiedRoleId: { type: String, required: true },
    verifiedRoleId: { type: String, required: true } // We'll need this for the final step
});
const ServerSettings = mongoose.model('ServerSettings', serverSettingsSchema);


// --- API ROUTES ---

// -- User Routes --
app.get('/api/user/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const user = await User.findOne({ discordId: discordId });

        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error while fetching user' });
    }
});

app.post('/api/user/register', async (req, res) => {
    try {
        const { discordId, username, bio } = req.body;
        const existingUser = await User.findOne({ discordId: discordId });
        if (existingUser) {
            return res.status(409).json({ error: 'User is already registered' });
        }
        const newUser = new User({ discordId, username, bio });
        await newUser.save();
        console.log('New user registered:', newUser);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});


// -- Server Settings Routes --

// GET: The route for the bot to fetch a server's settings.
app.get('/api/settings/:guildId', async (req, res) => {
    try {
        const { guildId } = req.params;
        const settings = await ServerSettings.findOne({ guildId: guildId });

        if (settings) {
            res.status(200).json(settings);
        } else {
            res.status(404).json({ error: 'Settings not found for this server.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error while fetching settings.' });
    }
});

// POST: The route for the website dashboard to save a server's settings.
app.post('/api/settings', async (req, res) => {
    try {
        const { guildId, verificationChannelId, unverifiedRoleId, verifiedRoleId } = req.body;

        // Find existing settings for this guild and update them,
        // or create new settings if they don't exist.
        const settings = await ServerSettings.findOneAndUpdate(
            { guildId: guildId },
            { verificationChannelId, unverifiedRoleId, verifiedRoleId },
            { new: true, upsert: true } // `new` returns the updated doc, `upsert` creates if it doesn't exist
        );

        console.log('Server settings updated:', settings);
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Server error while saving settings.' });
    }
});


// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
