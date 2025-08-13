// routes/moderation.js
const express = require('express');
const router = express.Router();
const Server = require('../models/Server'); // Correctly import the model

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    req.token = token;
    next();
};

router.post('/moderation', verifyToken, async (req, res) => {
    try {
        const { guildId, settings } = req.body;
        
        // Convert comma-separated strings to arrays where necessary
        if (settings.joinGate && settings.joinGate.bannedUsernames) {
            settings.joinGate.bannedUsernames = settings.joinGate.bannedUsernames.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (settings.contentFiltering && settings.contentFiltering.bannedWords) {
            settings.contentFiltering.bannedWords = settings.contentFiltering.bannedWords.split(',').map(s => s.trim()).filter(Boolean);
        }

        await Server.findOneAndUpdate(
            { guildId: guildId },
            { $set: { 
                'moderation': settings
            }},
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Moderation settings saved!' });
    } catch (error) {
        console.error('Error saving moderation settings:', error);
        res.status(500).json({ error: 'Server error while saving settings.' });
    }
});

module.exports = router;
