// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors'); // Import the cors package
require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = 'https://api.ulti-bot.com/auth/discord/callback';

// --- MIDDLEWARE ---

// Configure CORS to allow requests from your frontend domain
const corsOptions = {
    origin: 'https://www.ulti-bot.com',
    optionsSuccessStatus: 200 // For legacy browser support
};
app.use(cors(corsOptions));

app.set('trust proxy', 1);
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
    fullName: { type: String },
    birthday: { type: Date },
    location: { type: String },
    isVerified: { type: Boolean, default: false },
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
app.get('/auth/discord', (req, res) => {
    const authorizationUri = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
    res.redirect(authorizationUri);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided.');

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const discordUser = userResponse.data;

        const userIp = req.ip;
        let isVpn = false;
        try {
            const ipApiResponse = await axios.get(`http://ip-api.com/json/${userIp}?fields=proxy`);
            if (ipApiResponse.data.proxy) isVpn = true;
        } catch (ipError) {
            console.error("IP-API check failed:", ipError.message);
        }
        const ipLog = { ip: userIp, isVpn: isVpn };

        let user = await User.findOne({ discordId: discordUser.id });

        if (user) {
            user.ipHistory.push(ipLog);
            await user.save();
            console.log(`Existing user logged in: ${user.username}`);
            res.redirect('https://www.ulti-bot.com/dashboard.html');
        } else {
            user = new User({
                discordId: discordUser.id,
                username: discordUser.username,
                avatar: discordUser.avatar,
                ipHistory: [ipLog],
                isVerified: false
            });
            await user.save();
            console.log(`New user created: ${user.username}`);
            res.redirect(`https://www.ulti-bot.com/complete-profile.html?discordId=${discordUser.id}`);
        }

    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});


// --- API ROUTES ---
app.post('/api/user/complete-profile', async (req, res) => {
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
                isVerified: true
            },
            { new: true }
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

app.get('/api/settings/:guildId', async (req, res) => { /* ... */ });
app.post('/api/settings', async (req, res) => { /* ... */ });


// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
