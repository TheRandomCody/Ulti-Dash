// models/PunishmentLog.js
const mongoose = require('mongoose');

const punishmentLogSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    moderatorId: { type: String, required: true },
    targetId: { type: String, required: true, index: true },
    action: { type: String, enum: ['kick', 'ban', 'warn', 'mute'], required: true },
    reason: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.models.PunishmentLog || mongoose.model('PunishmentLog', punishmentLogSchema);
