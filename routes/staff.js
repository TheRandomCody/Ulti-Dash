// routes/staff.js
const express = require('express');
const router = express.Router();
const Server = require('../models/Server');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    req.token = token;
    next();
};

router.post('/staff', verifyToken, async (req, res) => {
    try {
        const { guildId, isEnabled, ownerRoleId, emergencyOverrideEnabled, teams } = req.body;
        await Server.findOneAndUpdate(
            { guildId: guildId },
            { $set: {
                'staff.isEnabled': isEnabled,
                'staff.ownerRoleId': ownerRoleId,
                'staff.emergencyOverrideEnabled': emergencyOverrideEnabled,
                'staff.teams': teams
            }},
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Staff settings saved!' });
    } catch (error) {
        console.error('Error saving staff settings:', error);
        res.status(500).json({ error: 'Server error while saving staff settings.' });
    }
});

module.exports = router;
