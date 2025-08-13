// routes/guilds.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const Server = require('../models/Server'); // Import the Server model

const botToken = process.env.BOT_TOKEN;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    req.token = token;
    next();
};

router.get('/auth/user', verifyToken, async (req, res) => {
    try {
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(userResponse.data);
    } catch (error) {
        res.sendStatus(403);
    }
});

router.get('/auth/guilds', verifyToken, async (req, res) => {
    try {
        const userGuildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        const botGuildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bot ${botToken}` }
        });
        const userGuilds = userGuildsResponse.data;
        const botGuildsSet = new Set(botGuildsResponse.data.map(g => g.id));
        const enrichedGuilds = userGuilds.map(guild => {
            const permissions = BigInt(guild.permissions);
            const canManage = (permissions & 8n) === 8n || (permissions & 32n) === 32n;
            return { ...guild, botInGuild: botGuildsSet.has(guild.id), canManage };
        });
        enrichedGuilds.sort((a, b) => {
            const scoreA = (a.botInGuild && a.canManage) ? 3 : (!a.botInGuild && a.canManage) ? 2 : 1;
            const scoreB = (b.botInGuild && b.canManage) ? 3 : (!b.botInGuild && b.canManage) ? 2 : 1;
            return scoreB - scoreA;
        });
        res.json(enrichedGuilds);
    } catch (error) {
        res.sendStatus(500);
    }
});

router.get('/guild/:guildId/details', verifyToken, async (req, res) => {
    const { guildId } = req.params;
    try {
        const authHeaders = { 'Authorization': `Bot ${botToken}` };
        const guildPromise = axios.get(`https://discord.com/api/guilds/${guildId}`, { headers: authHeaders });
        const channelsPromise = axios.get(`https://discord.com/api/guilds/${guildId}/channels`, { headers: authHeaders });
        const rolesPromise = axios.get(`https://discord.com/api/guilds/${guildId}/roles`, { headers: authHeaders });
        const settingsPromise = Server.findOne({ guildId: guildId });

        const [guildResponse, channelsResponse, rolesResponse, savedSettings] = await Promise.all([
            guildPromise, channelsPromise, rolesPromise, settingsPromise
        ]);

        const textChannels = channelsResponse.data.filter(c => c.type === 0);

        res.json({
            guild: guildResponse.data,
            channels: textChannels,
            roles: rolesResponse.data,
            savedSettings: savedSettings 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch server details.' });
    }
});

module.exports = router;
