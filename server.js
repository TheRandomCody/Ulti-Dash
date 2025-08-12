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

// This is needed to correctly read the user's IP address when behind a proxy like Render.
app.set('trust proxy', 1);
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB Atlas:', error));

// --- DATABASE SCHEMAS & MODELS ---
// Updated User Schema with new fields for profile completion and IP tracking.
const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    // New fields for the registration form
    fullName: { type: String },
    birthday: { type: Date },
    location: { type: String },
    isVerified: { type: Boolean, default: false }, // To track if they've completed the form
    // IP Tracking
    ipHistory: [{
        ip: String,
        isVpn: Boolean,
        loginDate: { type: Date, default: Date.now }
    }],
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

// Updated callback route with IP tracking and new user flow
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided.');

    try {
        // --- Step 1: Get Discord Tokens ---
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenResponse.data.access_token;

        // --- Step 2: Get User Info from Discord ---
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const discordUser = userResponse.data;

        // --- Step 3: Track IP and Check for VPN ---
        const userIp = req.ip;
        let isVpn = false;
        try {
            const ipApiResponse = await axios.get(`http://ip-api.com/json/${userIp}?fields=proxy`);
            if (ipApiResponse.data.proxy) {
                isVpn = true;
            }
        } catch (ipError) {
            console.error("IP-API check failed:", ipError.message);
        }
        const ipLog = { ip: userIp, isVpn: isVpn };

        // --- Step 4: Check if user exists in our database ---
        let user = await User.findOne({ discordId: discordUser.id });

        if (user) {
            // If user exists, update their IP history and redirect to dashboard
            user.ipHistory.push(ipLog);
            await user.save();
            console.log(`Existing user logged in: ${user.username}`);
            // In a real app, you'd create a session token and send it here
            res.redirect('https://www.ulti-bot.com/dashboard');
        } else {
            // If user is new, create a basic, unverified profile
            user = new User({
                discordId: discordUser.id,
                username: discordUser.username,
                avatar: discordUser.avatar,
                ipHistory: [ipLog],
                isVerified: false // They haven't filled out the form yet
            });
            await user.save();
            console.log(`New user created: ${user.username}`);
            // **UPDATED:** Redirect them to the registration page with their Discord ID in the URL
            res.redirect(`https://www.ulti-bot.com/complete-profile.html?discordId=${discordUser.id}`);
        }

    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});


// --- API ROUTES ---

// NEW Route for the frontend to submit the completed profile
app.post('/api/user/complete-profile', async (req, res) => {
    // In a real app, you'd verify the user's session/token here first
    const { discordId, fullName, birthday, location } = req.body;
    if (!discordId || !fullName || !birthday || !location) {
        return res.status(400).json({ error: 'Missing required profile fields.' });
    }

    try {
        const user = await User.findOneAndUpdate(
            { discordId: discordId },
            {
                fullName: fullName,
                birthday: new Date(birthday),
                location: location,
                isVerified: true // Mark them as verified
            },
            { new: true } // Return the updated document
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found to update.' });
        }

        console.log(`User profile completed: ${user.username}`);
        res.status(200).json({ message: 'Profile completed successfully!', user: user });

    } catch (error) {
        console.error('Error completing profile:', error);
        res.status(500).json({ error: 'Server error while completing profile.' });
    }
});


// (Your existing API routes for the bot go here)
app.get('/api/settings/:guildId', async (req, res) => { /* ... */ });
app.post('/api/settings', async (req, res) => { /* ... */ });


// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
