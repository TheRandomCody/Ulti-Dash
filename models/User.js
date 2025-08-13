// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String },
    fullName: { type: String },
    birthday: { type: Date },
    location: { type: String },
    isVerified: { type: Boolean, default: false },
    joined: { type: Date, default: Date.now }
});

// This line checks if the model is already compiled and uses the existing one if it is.
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
