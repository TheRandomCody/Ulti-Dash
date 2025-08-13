// models/Server.js
const mongoose = require('mongoose');

const staffTeamSchema = new mongoose.Schema({
    teamId: { type: String, required: true },
    teamName: String,
    roles: [String],
    permissions: {
        ban: { type: String, enum: ['full', 'auth', 'none'], default: 'none' },
        kick: { type: String, enum: ['full', 'auth', 'none'], default: 'none' },
        mute: { type: String, enum: ['full', 'auth', 'none'], default: 'none' },
        warn: { type: String, enum: ['full', 'auth', 'none'], default: 'none' },
        blacklist: { type: String, enum: ['full', 'auth', 'none'], default: 'none' }
    },
    canAuthorize: [String]
});

const warningTierSchema = new mongoose.Schema({
    warnCount: Number,
    action: { type: String, enum: ['mute', 'kick', 'ban'] },
    duration: Number,
    durationUnit: { type: String, enum: ['minutes', 'hours', 'days'] }
});

const serverSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    verification: {
        verificationChannelId: String,
        unverifiedRoleId: String,
        verifiedRoleId: String,
        // New fields for conditional actions
        verifiedUserAction: { type: String, enum: ['none', 'give_role'], default: 'none' },
        unverifiedUserAction: { type: String, enum: ['kick', 'ban', 'give_role'], default: 'give_role' },
        // New fields for age gate
        ageGate: {
            isEnabled: { type: Boolean, default: false },
            minAge: { type: Number, default: 13 },
            maxAge: { type: Number, default: 99 },
            action: { type: String, enum: ['kick', 'ban'], default: 'kick' }
        }
    },
    staff: {
        isEnabled: { type: Boolean, default: false },
        ownerRoleId: String,
        emergencyOverrideEnabled: { type: Boolean, default: false },
        teams: [staffTeamSchema]
    },
    moderation: {
        joinGate: {
            noAvatarAction: { type: String, enum: ['none', 'kick', 'ban'], default: 'none' },
            minAccountAgeDays: { type: Number, default: 0 },
            bannedUsernames: [String]
        },
        contentFiltering: {
            bannedWords: [String],
            blockInvites: { type: Boolean, default: false },
            blockMassMention: { type: Boolean, default: false },
            blockCaps: { type: Boolean, default: false }
        },
        warningSystem: {
            tiers: [warningTierSchema]
        },
        mutedRoleId: String,
        modLogChannelId: String
    },
    logging: {
        actionLogChannelId: String,
        messageLogChannelId: String
    },
    autoRole: {
        joinRoleId: String
    }
});

module.exports = mongoose.models.Server || mongoose.model('Server', serverSchema);


// This line checks if the model is already compiled and uses the existing one if it is.
module.exports = mongoose.models.Server || mongoose.model('Server', serverSchema);
