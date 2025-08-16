// File: routes/servers.js
// UPDATED: The PATCH endpoint for leveling settings is now simpler and more reliable.

const express = require('express');
const axios = require('axios');
const ServerConfig = require('../models/ServerConfig');
const LevelingProfile = require('../models/LevelingProfile');
const User = require('../models/User');

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
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    
    const { serverId } = req.params;
    const userDiscordId = req.session.user.discordId;

    try {
        const config = await ServerConfig.findOne({ serverId: serverId });
        if (!config) {
            return res.status(404).json({ message: 'Server not found in our system.' });
        }

        // Security Check: Is the logged-in user the owner of this server config?
        if (config.ownerId !== userDiscordId) {
            return res.status(403).json({ message: 'You do not have permission to manage this server.' });
        }
        
        // If they are the owner, attach the config to the request object and proceed.
        req.serverConfig = config;
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
        const response = await axios.get('[https://discord.com/api/users/@me/guilds](https://discord.com/api/users/@me/guilds)', {
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
        const response = await axios.get(`https://discord.com/api/guilds/${req.params.serverId}`, {
            headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` }
        });
        const guild = response.data;

        res.json({
            name: guild.name,
            icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
            modules: req.serverConfig.modules
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching server details from Discord.' });
    }
});

// GET /api/servers/:serverId/data
// Fetches server data like roles and channels for populating dropdowns.
router.get('/:serverId/data', verifyServerAdmin, async (req, res) => {
    try {
        // Fetch roles
        const rolesResponse = await axios.get(`https://discord.com/api/guilds/${req.params.serverId}/roles`, {
            headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` }
        });
        // Fetch channels
        const channelsResponse = await axios.get(`https://discord.com/api/guilds/${req.params.serverId}/channels`, {
            headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` }
        });

        // Filter for text channels only (type 0)
        const textChannels = channelsResponse.data.filter(c => c.type === 0);

        res.json({
            roles: rolesResponse.data,
            channels: textChannels
        });
    } catch (error) {
        console.error('Error fetching server data:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching server data from Discord.' });
    }
});


// PATCH /api/servers/:serverId/modules/:moduleName
// Toggles a module on or off.
router.patch('/:serverId/modules/:moduleName', verifyServerAdmin, async (req, res) => {
    const { serverId, moduleName } = req.params;
    const { enabled } = req.body;

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

// --- Leveling Module Endpoints ---

// GET /api/servers/:serverId/modules/leveling
// Gets the detailed settings for the leveling module.
router.get('/:serverId/modules/leveling', verifyServerAdmin, async (req, res) => {
    const config = req.serverConfig;
    
    if (!config.modules.leveling) {
        config.modules.leveling = {}; 
        await config.save();
    }
    
    res.json(config.modules.leveling);
});

// PATCH /api/servers/:serverId/modules/leveling
// Updates the detailed settings for the leveling module.
router.patch('/:serverId/modules/leveling', verifyServerAdmin, async (req, res) => {
    const { serverId } = req.params;
    const settings = req.body;

    try {
        const result = await ServerConfig.updateOne(
            { serverId },
            { $set: { "modules.leveling": settings } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Server not found.' });
        }
        res.status(200).json({ message: 'Leveling settings updated.' });
    } catch (error) {
        console.error('Error updating leveling settings:', error);
        res.status(500).json({ message: 'Error updating leveling settings.' });
    }
});

// GET /api/servers/:serverId/leaderboard
// Fetches the leveling leaderboard for a server.
router.get('/:serverId/leaderboard', verifyServerAdmin, async (req, res) => {
    const { serverId } = req.params;
    try {
        const topUsers = await LevelingProfile.find({ serverId })
            .sort({ level: -1, xp: -1 })
            .limit(10);
        
        const userIds = topUsers.map(u => u.userId);
        const userProfiles = await User.find({ discordId: { $in: userIds } });

        const leaderboard = topUsers.map(profile => {
            const user = userProfiles.find(p => p.discordId === profile.userId);
            return {
                username: user ? user.discordUsername : 'Unknown User',
                avatar: user ? user.discordAvatar : null,
                level: profile.level,
                xp: profile.xp
            };
        });

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leaderboard.' });
    }
});

// POST /api/servers/:serverId/roles
// Creates a new role in the Discord server.
router.post('/:serverId/roles', verifyServerAdmin, async (req, res) => {
    const { serverId } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Role name is required.' });
    }

    try {
        const response = await axios.post(`https://discord.com/api/guilds/${serverId}/roles`, 
            { name: name },
            { headers: { 'Authorization': `Bot ${process.env.BOT_TOKEN}` } }
        );
        res.status(201).json(response.data); // Return the newly created role object
    } catch (error) {
        res.status(500).json({ message: 'Failed to create role in Discord.' });
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
