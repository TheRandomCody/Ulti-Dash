// routes/verification.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Server = require('../models/Server');

const botToken = process.env.BOT_TOKEN;

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    req.token = token;
    next();
};

router.post('/verification', verifyToken, async (req, res) => {
    try {
        const { guildId, settings } = req.body;
        await Server.findOneAndUpdate(
            { guildId: guildId },
            { $set: { 
                'verification': settings
            }},
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Verification settings saved!' });
    } catch (error) {
        console.error('Error saving verification settings:', error);
        res.status(500).json({ error: 'Server error while saving settings.' });
    }
});

// New route for the dashboard to command the bot to post the embed
router.post('/verification/embed', verifyToken, async (req, res) => {
    try {
        const { guildId } = req.body;
        const settings = await Server.findOne({ guildId });

        if (!settings || !settings.verification || !settings.verification.verificationChannelId) {
            return res.status(400).json({ error: 'Verification channel is not set.' });
        }
        
        const channelId = settings.verification.verificationChannelId;
        const message = settings.verification.verificationEmbedMessage;

        // The backend acts as the bot to post the message
        await axios.post(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            embeds: [{
                title: 'Server Verification',
                description: message,
                color: 0x5865F2, // Discord Blurple
            }],
            components: [{
                type: 1, // Action Row
                components: [{
                    type: 2, // Button
                    style: 5, // Link
                    label: 'Verify with Ulti-Bot',
                    url: 'https://www.ulti-bot.com/' // This links to your main site login
                }]
            }]
        }, {
            headers: { 'Authorization': `Bot ${botToken}` }
        });

        res.status(200).json({ message: 'Embed post command sent successfully!' });
    } catch (error) {
        console.error('Error handling verification embed request:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Server error while handling embed request.' });
    }
});

module.exports = router;
