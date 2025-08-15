// File: routes/servers.js
// UPDATED: Added new bot-only endpoints for automatic syncing.

const express = require('express');
const axios = require('axios');
const ServerConfig = require('../models/ServerConfig');

const router = express.Router();

// --- Middleware for Bot-Only Routes ---
// This ensures only our bot can access these sensitive endpoints.
const requireBotAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const secret = authHeader && authHeader.split(' ')[1];

    if (secret === process.env.BOT_API_SECRET) {
        next(); // The secret is valid, proceed.
    } else {
        res.status(401).json({ message: 'Unauthorized: Invalid bot secret.' });
    }
};


// --- User-Facing Routes (from the website) ---

// A helper function to check for administrator permissions
const isAdmin = (permissions) => {
    return (permissions & 8) === 8; // 8 is the bitwise flag for Administrator
};

// GET /api/servers/my-servers
// Fetches all servers the logged-in user is an admin of.
router.get('/my-servers', async (req, res) => {
    if (!req.session.user || !req.session.user.accessToken) {
        return res.status(401).json({ message: 'Not authenticated or access token missing.' });
    }

    try {
        const response = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${req.session.user.accessToken}` }
        });
        const userGuilds = response.data;
        const adminGuilds = userGuilds.filter(guild => isAdmin(guild.permissions));
        const configuredServerIds = (await ServerConfig.find({
            serverId: { $in: adminGuilds.map(g => g.id) }
        })).map(config => config.serverId);

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


// --- Bot-Only Routes (for automatic syncing) ---

// POST /api/servers/sync
// Called by the bot on 'ready' and 'guildCreate' events.
router.post('/sync', requireBotAuth, async (req, res) => {
    const { serverId, ownerId } = req.body;
    if (!serverId || !ownerId) {
        return res.status(400).json({ message: 'serverId and ownerId are required.' });
    }

    try {
        // 'upsert: true' will create the document if it doesn't exist.
        // This is a single, efficient database operation.
        await ServerConfig.updateOne(
            { serverId: serverId },
            { $setOnInsert: { serverId: serverId, ownerId: ownerId } },
            { upsert: true }
        );
        res.status(200).json({ message: 'Server synced successfully.' });
    } catch (error) {
        console.error(`Error syncing server ${serverId}:`, error);
        res.status(500).json({ message: 'Internal server error during sync.' });
    }
});

// DELETE /api/servers/:serverId/sync
// Called by the bot on the 'guildDelete' event.
router.delete('/:serverId/sync', requireBotAuth, async (req, res) => {
    const { serverId } = req.params;
    try {
        await ServerConfig.deleteOne({ serverId: serverId });
        res.status(200).json({ message: 'Server removed successfully.' });
    } catch (error) {
        console.error(`Error removing server ${serverId}:`, error);
        res.status(500).json({ message: 'Internal server error during removal.' });
    }
});


module.exports = router;
