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
                        action: verificationSettings.ageGate.action,
                        reason: `User's age (${age}) is outside the allowed range.`
                    });
                }
            } else {
                 return res.json({
                    action: verificationSettings.unverifiedUserAction,
                    reason: 'User is unverified and could not be checked against the age gate.',
                    rolesToAdd: [verificationSettings.unverifiedRoleId]
                });
            }
        }

        // 2. Check Verification Status
        if (userProfile && userProfile.isStripeVerified) {
            if (verificationSettings.verifiedUserAction === 'give_role') {
                return res.json({
                    action: 'give_role',
                    rolesToAdd: [verificationSettings.verifiedRoleId]
                });
            }
        } else {
            return res.json({
                action: verificationSettings.unverifiedUserAction,
                reason: 'User is not verified with Ulti-Bot.',
                rolesToAdd: [verificationSettings.unverifiedRoleId]
            });
        }

        res.json({ action: 'none' });

    } catch (error) {
        console.error('Error in member-join check:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// This endpoint is called by the bot's commands to check permissions
router.post('/guild/:guildId/check-permissions', verifyBotRequest, async (req, res) => {
    const { guildId } = req.params;
    const { userId, userRoles, commandName } = req.body; // commandName will be 'ban', 'kick', etc.

    try {
        const settings = await Server.findOne({ guildId });
        if (!settings || !settings.staff || !settings.staff.isEnabled) {
            return res.json({ permission: 'use_default' });
        }

        if (userRoles.includes(settings.staff.ownerRoleId)) {
            return res.json({ permission: 'full' });
        }

        let highestPermission = 'none';
        for (const team of settings.staff.teams) {
            const userIsInTeam = team.roles.some(roleId => userRoles.includes(roleId));
            if (userIsInTeam) {
                highestPermission = team.permissions[commandName] || 'none';
                break;
            }
        }
        
        res.json({ permission: highestPermission });

    } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Error checking permissions.' });
    }
});

module.exports = router;
