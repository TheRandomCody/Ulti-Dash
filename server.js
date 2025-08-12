// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const app = express();

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
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
    ipHistory: [{
        ip: String,
        isVpn: Boolean,
        loginDate: { type: Date, default: Date.now }
    }],
    joined: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

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
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const discordUser = userResponse.data;

        const userIp = req.ip;
        let isVpn = false;
        try {
            const ipApiResponse = await axios.get(`http://ip-api.com/json/${userIp}?fields=proxy`);
            if (ipApiResponse.data.proxy) isVpn = true;
        } catch (ipError) {
            console.error("IP-API check failed:", ipError.message);
        }
        const ipLog = { ip: userIp, isVpn: isVpn };

        let user = await User.findOne({ discordId: discordUser.id });
        let destination;

        if (user) {
            user.ipHistory.push(ipLog);
            await user.save();
            destination = '/dashboard.html';
        } else {
            user = new User({
                discordId: discordUser.id,
                username: discordUser.username,
                avatar: discordUser.avatar,
                ipHistory: [ipLog],
                isVerified: false
            });
            await user.save();
            destination = `/complete-profile.html?discordId=${discordUser.id}`;
        }
        
        res.redirect(`https://www.ulti-bot.com/auth-callback.html?accessToken=${accessToken}&destination=${encodeURIComponent(destination)}`);

    } catch (error) {
        console.error('Error during Discord OAuth2 flow:', error);
        res.status(500).send('An error occurred during authentication.');
    }
});

// --- NEW AUTHENTICATED API ROUTES ---

// Middleware to verify the access token for protected routes
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (token == null) return res.sendStatus(401); // if there isn't any token

    // We will just pass the token to the next route. 
    // The actual verification happens by using the token to talk to Discord's API.
    req.token = token;
    next();
};

// GET: The route for the dashboard to fetch the logged-in user's Discord info
app.get('/api/auth/user', verifyToken, async (req, res) => {
    try {
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        res.json(userResponse.data);
    } catch (error) {
        console.error("Failed to fetch user from Discord API");
        res.sendStatus(403); // Token is likely invalid or expired
    }
});

// GET: The route for the dashboard to fetch the user's servers
app.get('/api/auth/guilds', verifyToken, async (req, res) => {
    try {
        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { 'Authorization': `Bearer ${req.token}` }
        });
        
        // Filter to only show servers where the user can manage the server
        const manageableGuilds = guildsResponse.data.filter(guild => {
            const permissions = BigInt(guild.permissions);
            return (permissions & 8n) === 8n; // 8n is the bit for ADMINISTRATOR
        });

        res.json(manageableGuilds);
    } catch (error) {
        console.error("Failed to fetch guilds from Discord API");
        res.sendStatus(403);
    }
});

// --- Other API routes (no changes needed) ---
// ...

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});
