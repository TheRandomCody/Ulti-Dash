// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios'); // For making requests to Discord's API
require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = 'https://api.ulti-bot.com/auth/discord/callback';

app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB Atlas:', error));

// --- DATABASE SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    level: { type: Number, default: 1 },
    bio: { type: String, default: 'No bio set.' },
    joined: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const serverSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    verificationChannelId: { type: String, required: true },
    unverifiedRoleId: { type: String, required: true },
    verifiedRoleId: { type: String, required: true }
});
const ServerSettings = mongoose.model('ServerSettings', serverSettingsSchema);

// --- DISCORD OAUTH2 ROUTES ---

// Route to start the login process
app.get('/auth/discord', (req, res) => {
    const authorizationUri = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
    res.redirect(authorizationUri);
});

// Route to handle the callback from Discord
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('No code provided.');
    }

    try {
        // Exchange the code for an access token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // Use the access token to get user info
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const discordUser = userResponse.data;

        // Here you would typically save the user to your database or create a session
        // For now, we'll just redirect to the frontend with a success message
        console.log('User successfully logged in:', discordUser.username);
        res.redirect('https://www.ulti-bot.com?login=success'); // Redirect back to the frontend

    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});


// --- API ROUTES ---
// (Your existing API routes for the bot go here)
app.get('/api/user/:discordId', async (req, res) => { /* ... */ });
app.post('/api/user/register', async (req, res) => { /* ... */ });
app.get('/api/settings/:guildId', async (req, res) => { /* ... */ });
app.post('/api/settings', async (req, res) => { /* ... */ });


// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});