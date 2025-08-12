// server.js

// --- SETUP ---
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // This line loads the .env file
const app = express();

// Render provides the PORT environment variable.
const port = process.env.PORT || 3000;

// We now get the mongoURI from the environment variables.
const mongoURI = process.env.MONGO_URI;

app.use(express.json());

// --- DATABASE CONNECTION ---
// The connection string is now safely stored as an environment variable.
mongoose.connect(mongoURI)
    .then(() => console.log('Successfully connected to MongoDB Atlas!'))
    .catch(error => console.error('Error connecting to MongoDB Atlas:', error));


// --- DATABASE SCHEMA & MODEL ---
// A Schema defines the structure of your documents within a collection.
const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    level: { type: Number, default: 1 },
    bio: { type: String, default: 'No bio set.' },
    joined: { type: Date, default: Date.now }
});

// A Model is a constructor compiled from a Schema definition. 
// An instance of a model is a document, which can be saved to the database.
const User = mongoose.model('User', userSchema);


// --- API ROUTES ---
// These routes now interact with the MongoDB database using the User model.

// GET: The API endpoint to get a user's profile
app.get('/api/user/:discordId', async (req, res) => {
    try {
        const { discordId } = req.params;
        const user = await User.findOne({ discordId: discordId });

        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error while fetching user' });
    }
});

// POST: The API endpoint for a user to register a new profile
app.post('/api/user/register', async (req, res) => {
    try {
        const { discordId, username, bio } = req.body;

        // Check if the user is already registered
        const existingUser = await User.findOne({ discordId: discordId });
        if (existingUser) {
            return res.status(409).json({ error: 'User is already registered' });
        }

        // Create a new user document
        const newUser = new User({
            discordId: discordId,
            username: username,
            bio: bio,
        });

        // Save the new user to the database
        await newUser.save();
        
        console.log('New user registered:', newUser);
        res.status(201).json(newUser);

    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
});


// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Website server listening on port ${port}`);
});