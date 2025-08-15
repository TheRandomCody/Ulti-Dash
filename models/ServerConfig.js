// File: models/ServerConfig.js
// This file is correct.

const mongoose = require('mongoose');

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
        leveling: { enabled: { type: Boolean, default: false } },
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