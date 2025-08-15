// routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

router.post('/create-verification-session', async (req, res) => {
    // Make sure the user is logged in first
    if (!req.session.user) {
        return res.status(401).json({ error: 'You must be logged in to verify.' });
    }

    try {
        const { discordId } = req.session.user; // Get the ID from the secure session
        // ...

        const verificationSession = await stripe.identity.verificationSessions.create({
            type: 'document',
            metadata: {
                discord_id: discordId,
            },
            return_url: 'https://www.ulti-bot.com/dashboard.html',
        });

        res.status(200).json({
            url: verificationSession.url 
        });
    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.status(500).json({ error: 'Failed to create verification session.' });
    }
});

router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'identity.verification_session.verified') {
        const session = event.data.object;
        const discordId = session.metadata.discord_id;
        
        await User.findOneAndUpdate(
            { discordId: discordId },
            { $set: { verificationStatus: 1 } }
        );
    }

    res.status(200).send();
});

module.exports = router;
