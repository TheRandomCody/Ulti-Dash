// File: routes/auth.js
// UPDATED: The /me endpoint now fetches fresh data from the database.

const express = require('express');
const axios = require('axios');
const User = require('../models/User');

// Create separate routers for different logical groups of endpoints
const authRouter = express.Router();
const usersRouter = express.Router();

// === DISCORD OAUTH2 FLOW ===

// Route 1: The initial login redirect.
// Path: /api/auth/discord/login
authRouter.get('/discord/login', (req, res) => {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(discordAuthUrl);
});

// Route 2: The callback from Discord.
// Path: /api/auth/discord/callback
authRouter.get('/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Error: No code provided from Discord.');
    }

    try {
        // Exchange the code for an access token
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.REDIRECT_URI,
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        // Use the access token to get the user's Discord profile
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const discordUser = userResponse.data;

        // Check if the user exists in our database, or create them
        let user = await User.findOne({ discordId: discordUser.id });

        if (!user) {
            // Calculate account creation date from Discord ID (Snowflake)
            const accountCreationTimestamp = (BigInt(discordUser.id) >> 22n) + 1420070400000n;
            const accountCreationDate = new Date(Number(accountCreationTimestamp));

            user = new User({
                discordId: discordUser.id,
                discordUsername: `${discordUser.username}#${discordUser.discriminator === '0' ? '' : discordUser.discriminator}`,
                discordAvatar: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
                discordAccountCreatedAt: accountCreationDate,
                verificationStatus: 0
            });
            await user.save();
            console.log(`New user created: ${user.discordUsername}`);
        } else {
            console.log(`User logged in: ${user.discordUsername}`);
        }

        // Store user info in the session
        req.session.user = {
            id: user._id.toString(),
            discordId: user.discordId,
            username: user.discordUsername,
            verificationStatus: user.verificationStatus
        };

        // Redirect back to the frontend
        res.redirect(process.env.FRONTEND_URL);

    } catch (error) {
        console.error('Error during Discord OAuth callback:', error.response ? error.response.data : error.message);
        res.status(500).send('An error occurred during authentication.');
    }
});

// Logout endpoint
// Path: /api/auth/logout
authRouter.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        // Redirecting to frontend after logout
        res.redirect(process.env.FRONTEND_URL);
    });
});


// === USER DATA ENDPOINT ===

// An endpoint for the frontend to check if a user is logged in
// and get their profile data.
// Path: /api/users/me
usersRouter.get('/me', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        // Fetch the most up-to-date user info from the database
        const user = await User.findById(req.session.user.id);
        if (!user) {
            // If user is not found (e.g., deleted), destroy the session
            req.session.destroy();
            return res.status(401).json({ message: 'User not found.' });
        }

        // Return the relevant, fresh user data
        res.json({
            id: user._id.toString(),
            discordId: user.discordId,
            username: user.discordUsername,
            verificationStatus: user.verificationStatus
        });

    } catch (error) {
        console.error('Error fetching user data for /me:', error);
        res.status(500).json({ message: 'Server error while fetching user data.' });
    }
});

// Export the routers so they can be used in server.js
module.exports = { authRouter, usersRouter };