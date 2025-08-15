// File: routes/servers.js
// UPDATED: Added new endpoints for fetching and updating a single server's config.

const express = require('express');
const axios = require('axios');
const ServerConfig = require('../models/ServerConfig');

const router = express.Router();

// --- Middleware for Bot-Only Routes ---
const requireBotAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const secret = authHeader && authHeader.split(' ')[1];

    if (secret === process.env.CLIENT_SECRET) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Invalid bot secret.' });
    }
};

// --- Helper Functions ---
const isAdmin = (permissions) => {
    return (permissions & 8) === 8;
};

// A middleware to verify user is an admin of the server they're trying to access
const verifyServerAdmin = async (req, res, next) => {
    if (!req.session.user || !req.session.user.accessToken) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    const { serverId } = req.params;
    try {
        const response = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${req.session.user.accessToken}` }
        });
        const userGuilds = response.data;
        const targetGuild = userGuilds.find(g => g.id === serverId);
        if (!targetGuild || !isAdmin(targetGuild.permissions)) {
            return res.status(403).json({ message: 'You do not have permission to manage this server.' });
        }
        // Attach guild info to the request object for later use
        req.guild = targetGuild;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Failed to verify server permissions.' });
    }
};


// --- User-Facing Routes (from the website) ---

// GET /api/servers/my-servers
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

// GET /api/servers/:serverId
// Fetches the config for a single server.
router.get('/:serverId', verifyServerAdmin, async (req, res) => {
    try {
        const config = await ServerConfig.findOne({ serverId: req.params.serverId });
        if (!config) {
            return res.status(404).json({ message: 'Server not configured.' });
        }
        res.json({
            name: req.guild.name,
            icon: req.guild.icon ? `https://cdn.discordapp.com/icons/${req.guild.id}/${req.guild.icon}.png` : null,
            modules: config.modules
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching server configuration.' });
    }
});

// PATCH /api/servers/:serverId/modules/:moduleName
// Toggles a module on or off.
router.patch('/:serverId/modules/:moduleName', verifyServerAdmin, async (req, res) => {
    const { serverId, moduleName } = req.params;
    const { enabled } = req.body; // Expecting { "enabled": true } or { "enabled": false }

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'Invalid "enabled" value.' });
    }

    try {
        const updateField = `modules.${moduleName}.enabled`;
        const result = await ServerConfig.updateOne(
            { serverId: serverId },
            { $set: { [updateField]: enabled } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Server not found.' });
        }
        res.status(200).json({ message: `${moduleName} module updated.` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating module.' });
    }
});


// --- Bot-Only Routes (for automatic syncing) ---

// POST /api/servers/sync
router.post('/sync', requireBotAuth, async (req, res) => {
    const { serverId, ownerId } = req.body;
    if (!serverId || !ownerId) {
        return res.status(400).json({ message: 'serverId and ownerId are required.' });
    }
    try {
        await ServerConfig.updateOne(
            { serverId: serverId },
            { $setOnInsert: { serverId: serverId, ownerId: ownerId } },
            { upsert: true }
        );
        res.status(200).json({ message: 'Server synced successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error during sync.' });
    }
});

// DELETE /api/servers/:serverId/sync
router.delete('/:serverId/sync', requireBotAuth, async (req, res) => {
    const { serverId } = req.params;
    try {
        await ServerConfig.deleteOne({ serverId: serverId });
        res.status(200).json({ message: 'Server removed successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error during removal.' });
    }
});


module.exports = router;
