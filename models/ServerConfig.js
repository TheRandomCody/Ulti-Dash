// File: models/ServerConfig.js
// NEW FILE: Defines the schema for server-specific settings.

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
        welcomeMessage: {
            enabled: { type: Boolean, default: false },
            channelId: { type: String },
            message: { type: String }
        },
        moderation: {
            enabled: { type: Boolean, default: false },
            logChannelId: { type: String }
        }
        // Add other modules here as they are developed
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ServerConfig', serverConfigSchema);