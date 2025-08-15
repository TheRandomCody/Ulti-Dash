// File: models/User.js
// This defines the schema for our 'User' documents in MongoDB.
// No changes needed here.

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true // Index for fast lookups
  },
  discordUsername: {
    type: String,
    required: true,
  },
  discordAvatar: {
    type: String,
  },
  verificationStatus: {
    type: Number,
    required: true,
    default: 0 // 0 = Unverified, 1 = Verified
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);