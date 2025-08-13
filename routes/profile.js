// routes/profile.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const PunishmentLog = require('../models/PunishmentLog');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    req.token = token;
    next();
};

// This new endpoint combines data from our DB and Discord
router.get('/details', verifyToken, async (req, res) => {
    try {
        // Get user's Discord ID from the token
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        const discordId = userResponse.data.id;

        // Fetch the user's profile from our database
        const userProfile = await User.findOne({ discordId });

        // Fetch the user's ban count from the punishment logs
        const banCount = await PunishmentLog.countDocuments({ targetId: discordId, action: 'ban' });

        if (!userProfile) {
            return res.status(404).json({ error: 'User profile not found in our database.' });
        }

        // Send back the combined data
        res.json({
            birthday: userProfile.birthday,
            isVerified: userProfile.isVerified,
            banCount: banCount
        });

    } catch (error) {
        console.error("Error fetching profile details:", error);
        res.status(500).json({ error: 'Server error while fetching profile details.' });
    }
});

module.exports = router;