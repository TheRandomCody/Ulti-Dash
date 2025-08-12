// server.js

// --- SETUP ---
// This is the foundation for your website's backend.
// It uses Express.js, a popular and powerful framework for building web servers with Node.js.

const express = require('express');
const app = express();
const port = 3000; // The port your server will run on

// This allows your server to understand JSON in request bodies
app.use(express.json());


// --- DATABASE (PLACEHOLDER) ---
// In a real application, this data would come from a database (like MongoDB or PostgreSQL).
// For now, we'll use a simple object to simulate user data.
const fakeDatabase = {
    "123456789012345678": {
        username: "UserFromWebsite",
        level: 42,
        bio: "This is a test bio loaded directly from the website's API!",
        joined: "2025-01-15"
    },
    // You can add your own Discord User ID here to test with your account
    "1350971528765902909": {
        username: "YourWebsiteUsername",
        level: 99,
        bio: "I am the owner of this awesome bot and website!",
        joined: "2025-01-01"
    }
};


// --- API ROUTES ---
// These are the URLs that your bot (and later, your website's front-end) can talk to.

// A simple test route to make sure the server is running
app.get('/', (req, res) => {
    res.send('The website server is running!');
});

// The API endpoint to get a user's profile
// The ":discordId" part is a parameter, meaning it can change for each request.
app.get('/api/user/:discordId', (req, res) => {
    const { discordId } = req.params;
    const userData = fakeDatabase[discordId];

    if (userData) {
        // If the user is found in our fake database, send their data back
        res.status(200).json(userData);
    } else {
        // If the user is not found, send a 404 (Not Found) error
        res.status(404).json({ error: 'User not found' });
    }
});


// --- START THE SERVER ---
// This tells your server to start listening for requests on the port we defined.
app.listen(port, () => {
    console.log(`Website server listening at http://localhost:${port}`);
});
