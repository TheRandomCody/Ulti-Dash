// routes/bot.js
const express = require('express');
const router = express.Router();
const Server = require('../models/Server');
const User = require('../models/User');

const botToken = process.env.BOT_TOKEN;

// Middleware to ensure requests are coming from our bot
const verifyBotRequest = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bot ${botToken}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// This endpoint is called by the bot whenever a new member joins a server
router.post('/member-join', verifyBotRequest, async (req, res) => {
    const { guildId, userId } = req.body;

    try {
        const serverSettings = await Server.findOne({ guildId });
        const userProfile = await User.findOne({ discordId: userId });

        if (!serverSettings || !serverSettings.verification) {
            // If no settings, tell the bot to do nothing
            return res.json({ action: 'none' });
        }

        const verificationSettings = serverSettings.verification;

        // 1. Check Age Gate
        if (verificationSettings.ageGate && verificationSettings.ageGate.isEnabled) {
            if (userProfile && userProfile.birthday) {
                const birthDate = new Date(userProfile.birthday);
                const ageDifMs = Date.now() - birthDate.getTime();
                const ageDate = new Date(ageDifMs);
                const age = Math.abs(ageDate.getUTCFullYear() - 1970);

                if (age < verificationSettings.ageGate.minAge || age > verificationSettings.ageGate.maxAge) {
                    return res.json({
                        action: verificationSettings.ageGate.action, // 'kick' or 'ban'
                        reason: `User's age (${age}) is outside the allowed range of ${verificationSettings.ageGate.minAge}-${verificationSettings.ageGate.maxAge}.`
                    });
                }
            } else {
                // If user has no birthday on record, treat as unverified
                 return res.json({
                    action: verificationSettings.unverifiedUserAction,
                    reason: 'User is unverified and could not be checked against the age gate.',
                    rolesToAdd: [verificationSettings.unverifiedRoleId]
                });
            }
        }

        // 2. Check Verification Status
        if (userProfile && userProfile.isStripeVerified) {
            // User is verified
            if (verificationSettings.verifiedUserAction === 'give_role') {
                return res.json({
                    action: 'give_role',
                    rolesToAdd: [verificationSettings.verifiedRoleId]
                });
            }
        } else {
            // User is unverified
            return res.json({
                action: verificationSettings.unverifiedUserAction,
                reason: 'User is not verified with Ulti-Bot.',
                rolesToAdd: [verificationSettings.unverifiedRoleId]
            });
        }

        // Default case: do nothing
        res.json({ action: 'none' });

    } catch (error) {
        console.error('Error in member-join check:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
