// routes/auth.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User'); // Import the User model

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = 'https://api.ulti-bot.com/auth/discord/callback';

router.get('/discord', (req, res) => {
    const authorizationUri = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
    res.redirect(authorizationUri);
});

router.get('/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided.');

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code: code, redirect_uri: redirectUri,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const discordUser = userResponse.data;

        let user = await User.findOne({ discordId: discordUser.id });
        let destination;
        if (user) {
            destination = '/dashboard.html';
        } else {
            user = new User({ discordId: discordUser.id, username: discordUser.username, avatar: discordUser.avatar, isVerified: false });
            await user.save();
            destination = `/complete-profile.html?discordId=${discordUser.id}`;
        }
        
        res.redirect(`https://www.ulti-bot.com/auth-callback.html?accessToken=${accessToken}&destination=${encodeURIComponent(destination)}`);
    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});

module.exports = router;