// File: routes/servers.js
// NEW FILE: Handles all logic for fetching and managing server data.

const express = require('express');
const axios = require('axios');
const ServerConfig = require('../models/ServerConfig');

const router = express.Router();

// A helper function to check for administrator permissions
const isAdmin = (permissions) => {
    // The permission integer for Administrator is 8
    return (permissions & 8) === 8;
};

// GET /api/servers/my-servers
// Fetches all servers the logged-in user is an admin of.
router.get('/my-servers', async (req, res) => {
    // 1. Check if the user is logged in
    if (!req.session.user || !req.session.user.accessToken) {
        return res.status(401).json({ message: 'Not authenticated or access token missing.' });
    }

    try {
        // 2. Fetch the user's guilds from the Discord API
        const response = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${req.session.user.accessToken}` }
        });

        const userGuilds = response.data;

        // 3. Filter for guilds where the user is an administrator
        const adminGuilds = userGuilds.filter(guild => isAdmin(guild.permissions));

        // 4. Check our database to see which of these servers have the bot configured
        const configuredServerIds = (await ServerConfig.find({
            serverId: { $in: adminGuilds.map(g => g.id) }
        })).map(config => config.serverId);

        // 5. Combine the data to send to the frontend
        const result = adminGuilds.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
            isManaged: configuredServerIds.includes(guild.id)
        }));

        res.json(result);

    } catch (error) {
        console.error('Error fetching user guilds:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to fetch servers from Discord.' });
    }
});

module.exports = router;
