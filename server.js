// Load environment variables from a .env file
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

// --- INITIALIZE APP ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE CONNECTION ---
// Make sure to add your MONGO_URI to the .env file
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- MIDDLEWARE SETUP ---

// 1. CORS - To control which domains can access the API
// In server.js

const corsOptions = {
  origin: [
    'https://www.ulti-bot.com', // Your production frontend
    'http://127.0.0.1:5500',    // Common local server address
    null                       // Allows opening index.html directly as a file
  ],
  credentials: true
};

// 2. Express Session - To manage user sessions
app.use(session({
  secret: process.env.SESSION_SECRET, // Make sure to add this to the .env file
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevents client-side JS from reading the cookie
    maxAge: 1000 * 60 * 60 * 24 // Cookie expires in 1 day
  }
}));

// 3. JSON Parser - To handle JSON payloads in requests
app.use(express.json());


// --- ROUTES ---
app.get('/', (req, res) => {
  res.send('Hello World! The API is running.');
});


// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});