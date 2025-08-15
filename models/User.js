// File: models/User.js
// UPDATED with a more comprehensive schema for future features.

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- Core Identity ---
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  discordUsername: {
    type: String,
    required: true,
  },
  discordAvatar: {
    type: String,
  },
  discordAccountCreatedAt: {
    type: Date
  },

  // --- Platform Status & Integration ---
  verificationStatus: {
    type: Number,
    required: true,
    default: 0 // 0 = Unverified, 1 = Verified
  },
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents to have a null value, but unique if set
  },
  stripeVerifiedData: {
    isAgeVerified: { type: Boolean, default: false },
    country: { type: String } // Storing country is safer than city/state
  },
  networkStanding: {
    type: String,
    enum: ['Good', 'At Risk', 'Blacklisted'],
    default: 'Good'
  },

  // --- Premium & Subscription Details ---
  premiumDetails: {
    isPremiumUser: { type: Boolean, default: false },
    ownedPremiumServers: { type: Number, default: 0 }
  },

  // --- User Customization ---
  profile: {
    displayName: { type: String },
    bio: { type: String, maxLength: 250 }
  }
}, {
  // Automatically add createdAt and updatedAt timestamps
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);