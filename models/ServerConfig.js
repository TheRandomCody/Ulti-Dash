// File: models/ServerConfig.js
// This file is correct.

const mongoose = require('mongoose');

const simpleModuleSchema = {
    enabled: { type: Boolean, default: false }
};

const levelingModuleSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    xpPerMessage: { type: Number, default: 15 },
    xpCooldownSeconds: { type: Number, default: 60 },
    ignoredRoles: [{ type: String }],
    levelUpMessage: { type: String, default: 'Congratulations {user}, you have reached level {level}!' },
    levelUpChannel: { type: String, default: 'current' }, // 'current' or a channel ID
    roleRewards: [{
        level: { type: Number, required: true },
        roleId: { type: String, required: true }
    }],
    punishmentSettings: {
        onWarn: { type: String, enum: ['none', 'reset_xp', 'deduct_xp'], default: 'none' },
        onMute: { type: String, enum: ['none', 'reset_xp', 'deduct_xp', 'deduct_level'], default: 'none' },
        deductXpAmount: { type: Number, default: 500 }
    }
});

const verificationModuleSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    verificationRole: { type: String }, // Role to give after verification
    unverifiedRole: { type: String }, // Role to give to new members
    verificationChannel: { type: String }, // Channel where verification happens
    verificationType: { type: String, enum: ['button', 'command'], default: 'button' }
});

const serverConfigSchema = new mongoose.Schema({
    serverId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    ownerId: {
        type: String,
        required: true,
        index: true
    },
    modules: {
        // FIXED: Replaced the simple inline object with the detailed levelingModuleSchema
        leveling: levelingModuleSchema,
        economy: { enabled: { type: Boolean, default: false } },
        moderation: { enabled: { type: Boolean, default: false } },
        verification: { enabled: { type: Boolean, default: false } },
        welcome: { enabled: { type: Boolean, default: false } },
        inviteTracking: { enabled: { type: Boolean, default: false } },
        embeds: { enabled: { type: Boolean, default: false } },
        reactionRoles: { enabled: { type: Boolean, default: false } },
        autoRoles: { enabled: { type: Boolean, default: false } },
        birthdays: { enabled: { type: Boolean, default: false } },
        inServerGames: { enabled: { type: Boolean, default: false } },
        socialMediaAlerts: { enabled: { type: Boolean, default: false } },
        polls: { enabled: { type: Boolean, default: false } },
        tickets: { enabled: { type: Boolean, default: false } },
        autoModeration: { enabled: { type: Boolean, default: false } },
        announcements: { enabled: { type: Boolean, default: false } },
        autoresponder: { enabled: { type: Boolean, default: false } },
        logging: { enabled: { type: Boolean, default: false } }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ServerConfig', serverConfigSchema);