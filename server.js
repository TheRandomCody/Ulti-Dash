// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = 'https://api.ulti-bot.com/auth/discord/callback';

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
        let destination;

        if (user) {
            user.ipHistory.push(ipLog);
            await user.save();
            console.log(`Existing user logged in: ${user.username}`);
            destination = '/dashboard.html';
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
            destination = `/complete-profile.html?discordId=${discordUser.id}`;
        }
        
        // Redirect to a special callback page on the frontend to store the token
        res.redirect(`https://www.ulti-bot.com/auth-callback.html?accessToken=${accessToken}&destination=${encodeURIComponent(destination)}`);

    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});

// --- API ROUTES (No changes needed here) ---
// ... your existing /api/user/complete-profile, /api/settings, etc. routes

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
