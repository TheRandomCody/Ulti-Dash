// routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    req.token = token;
    next();
};

// This route creates the Stripe Identity session
router.post('/create-verification-session', verifyToken, async (req, res) => {
    try {
        const { discordId } = req.body;
        if (!discordId) {
            return res.status(400).json({ error: 'Discord ID is required.' });
        }

        const verificationSession = await stripe.identity.verificationSessions.create({
            type: 'document',
            metadata: {
                discord_id: discordId,
            },
            return_url: 'https://www.ulti-bot.com/dashboard.html',
        });

        // Send back the direct URL to the Stripe verification flow
        res.status(200).json({
            url: verificationSession.url 
        });
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.status(500).json({ error: 'Failed to create verification session.' });
    }
});

// This route handles the webhook notifications from Stripe
router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'identity.verification_session.verified') {
        const session = event.data.object;
        const discordId = session.metadata.discord_id;
        
        console.log(`Verification successful for Discord ID: ${discordId}`);

        await User.findOneAndUpdate(
            { discordId: discordId },
            { $set: { isStripeVerified: true } }
        );
    }

    res.status(200).send();
});

module.exports = router;
