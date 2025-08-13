// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;
const baseMongoURI = process.env.MONGO_URI;
const dbName = 'ulti-bot-db';
const uriParts = baseMongoURI.split('?');
let baseUri = uriParts[0];
if (baseUri.endsWith('/')) {
    baseUri = baseUri.slice(0, -1);
}
const mongoURI = `${baseUri}/${dbName}?${uriParts[1] || 'retryWrites=true&w=majority'}`;

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const botToken = process.env.BOT_TOKEN;
const redirectUri = 'https://api.ulti-bot.com/auth/discord/callback';

// --- MIDDLEWARE ---
const corsOptions = {
    origin: 'https://www.ulti-bot.com',
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.set('trust proxy', 1);
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB Atlas:', error));

// --- DATABASE SCHEMAS & MODELS ---
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
const User = mongoose.model('User', userSchema);

const ipLogSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    ip: String,
    isVpn: Boolean,
    loginDate: { type: Date, default: Date.now }
});
const IPLog = mongoose.model('IPLog', ipLogSchema);

const staffTeamSchema = new mongoose.Schema({
    teamName: String,
    roles: [String],
    permissions: String // e.g., 'full', 'auth', 'none'
});

const serverSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    verification: {
        verificationChannelId: String,
        unverifiedRoleId: String,
        verifiedRoleId: String
    },
    staff: {
        isEnabled: { type: Boolean, default: false },
        ownerRoleId: String,
        emergencyOverrideEnabled: { type: Boolean, default: false },
        teams: [staffTeamSchema]
    }
});
const Server = mongoose.model('Server', serverSchema);

// --- DISCORD OAUTH2 ROUTES ---
app.get('/auth/discord', (req, res) => {
    const authorizationUri = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;
    res.redirect(authorizationUri);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided.');

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code', code: code, redirect_uri: redirectUri,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const discordUser = userResponse.data;

        const userIp = req.ip;
        let isVpn = false;
        try {
            const ipApiResponse = await axios.get(`http://ip-api.com/json/${userIp}?fields=proxy`);
            if (ipApiResponse.data.proxy) isVpn = true;
        } catch (ipError) { console.error("IP-API check failed:", ipError.message); }
        
        await IPLog.create({ userId: discordUser.id, ip: userIp, isVpn: isVpn });

        let user = await User.findOne({ discordId: discordUser.id });
        let destination;
        if (user) {
            destination = '/dashboard.html';
        } else {
            user = new User({ discordId: discordUser.id, username: discordUser.username, avatar: discordUser.avatar, isVerified: false });
            await user.save();
            destination = `/complete-profile.html?discordId=${discordUser.id}`;
        }
        
        res.redirect(`https://www.ulti-bot.com/auth-callback.html?accessToken=${accessToken}&destination=${encodeURIComponent(destination)}`);
    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});

// --- AUTHENTICATED API ROUTES ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    req.token = token;
    next();
};

app.get('/api/auth/user', verifyToken, async (req, res) => {
    try {
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(userResponse.data);
    } catch (error) {
        res.sendStatus(403);
    }
});

app.get('/api/auth/guilds', verifyToken, async (req, res) => {
    try {
        const userGuildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        const botGuildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bot ${botToken}` }
        });
        const userGuilds = userGuildsResponse.data;
        const botGuildsSet = new Set(botGuildsResponse.data.map(g => g.id));
        const enrichedGuilds = userGuilds.map(guild => {
            const permissions = BigInt(guild.permissions);
            const canManage = (permissions & 8n) === 8n || (permissions & 32n) === 32n;
            return { ...guild, botInGuild: botGuildsSet.has(guild.id), canManage };
        });
        enrichedGuilds.sort((a, b) => {
            const scoreA = (a.botInGuild && a.canManage) ? 3 : (!a.botInGuild && a.canManage) ? 2 : 1;
            const scoreB = (b.botInGuild && b.canManage) ? 3 : (!b.botInGuild && b.canManage) ? 2 : 1;
            return scoreB - scoreA;
        });
        res.json(enrichedGuilds);
    } catch (error) {
        res.sendStatus(500);
    }
});

app.get('/api/guild/:guildId/details', verifyToken, async (req, res) => {
    const { guildId } = req.params;
    try {
        const authHeaders = { 'Authorization': `Bot ${botToken}` };
        const guildPromise = axios.get(`https://discord.com/api/guilds/${guildId}`, { headers: authHeaders });
        const channelsPromise = axios.get(`https://discord.com/api/guilds/${guildId}/channels`, { headers: authHeaders });
        const rolesPromise = axios.get(`https://discord.com/api/guilds/${guildId}/roles`, { headers: authHeaders });
        const settingsPromise = Server.findOne({ guildId: guildId });

        const [guildResponse, channelsResponse, rolesResponse, savedSettings] = await Promise.all([
            guildPromise, channelsPromise, rolesPromise, settingsPromise
        ]);

        const textChannels = channelsResponse.data.filter(c => c.type === 0);

        res.json({
            guild: guildResponse.data,
            channels: textChannels,
            roles: rolesResponse.data,
            savedSettings: savedSettings 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch server details.' });
    }
});

// --- SETTINGS SAVE ROUTES ---
app.post('/api/settings/verification', verifyToken, async (req, res) => {
    try {
        const { guildId, verificationChannelId, unverifiedRoleId, verifiedRoleId } = req.body;
        await Server.findOneAndUpdate(
            { guildId: guildId },
            { $set: { 
                'verification.verificationChannelId': verificationChannelId, 
                'verification.unverifiedRoleId': unverifiedRoleId, 
                'verification.verifiedRoleId': verifiedRoleId 
            }},
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Verification settings saved!' });
    } catch (error) {
        res.status(500).json({ error: 'Server error while saving settings.' });
    }
});

app.post('/api/settings/staff', verifyToken, async (req, res) => {
    try {
        const { guildId, isEnabled, ownerRoleId, emergencyOverrideEnabled, teams } = req.body;
        await Server.findOneAndUpdate(
            { guildId: guildId },
            { $set: {
                'staff.isEnabled': isEnabled,
                'staff.ownerRoleId': ownerRoleId,
                'staff.emergencyOverrideEnabled': emergencyOverrideEnabled,
                'staff.teams': teams
            }},
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Staff settings saved!' });
    } catch (error) {
        console.error('Error saving staff settings:', error);
        res.status(500).json({ error: 'Server error while saving staff settings.' });
    }
});

// --- OTHER API ROUTES ---
app.post('/api/user/complete-profile', async (req, res) => {
    const { discordId, fullName, birthday, location } = req.body;
    if (!discordId || !fullName || !birthday || !location) {
        return res.status(400).json({ error: 'Missing required profile fields.' });
    }
    try {
        const user = await User.findOneAndUpdate(
            { discordId: discordId },
            { fullName, birthday: new Date(birthday), location, isVerified: true },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'User not found to update.' });
        res.status(200).json({ message: 'Profile completed successfully!', user: user });
    } catch (error) {
        res.status(500).json({ error: 'Server error while completing profile.' });
    }
});

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
