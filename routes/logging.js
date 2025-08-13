// routes/logging.js
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

router.post('/logging', verifyToken, async (req, res) => {
    try {
        const { guildId, settings } = req.body;
        
        await Server.findOneAndUpdate(
            { guildId: guildId },
            { $set: { 
                'logging': settings
            }},
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Logging settings saved!' });
    } catch (error) {
        console.error('Error saving logging settings:', error);
        res.status(500).json({ error: 'Server error while saving settings.' });
    }
});

module.exports = router;
