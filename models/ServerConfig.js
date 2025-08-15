// File: models/ServerConfig.js
// UPDATED: Added all new modules to the schema.

const mongoose = require('mongoose');

// Helper function to create a simple module schema
const moduleSchema = {
    enabled: { type: Boolean, default: false }
    // We can add more specific settings to each module later
};

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
        leveling: moduleSchema,
        economy: moduleSchema,
        moderation: moduleSchema,
        verification: moduleSchema,
        welcome: moduleSchema,
        inviteTracking: moduleSchema,
        embeds: moduleSchema,
        reactionRoles: moduleSchema,
        autoRoles: moduleSchema,
        birthdays: moduleSchema,
        inServerGames: moduleSchema,
        socialMediaAlerts: moduleSchema,
        polls: moduleSchema,
        tickets: moduleSchema,
        autoModeration: moduleSchema,
        announcements: moduleSchema,
        autoresponder: moduleSchema,
        logging: moduleSchema
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ServerConfig', serverConfigSchema);