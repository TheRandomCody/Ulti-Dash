// File: models/LevelingProfile.js
// NEW FILE: Stores XP and level data for each user in each server.

const mongoose = require('mongoose');

const levelingProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    serverId: { type: String, required: true, index: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 }
}, {
    // Create a compound index for efficient lookups
    _id: false,
    id: false
});
levelingProfileSchema.index({ serverId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('LevelingProfile', levelingProfileSchema);