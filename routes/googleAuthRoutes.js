const express = require('express');
const { google } = require('googleapis');
const GoogleAuth = require('../models/GoogleAuth');
const googleConfig = require('../googleConfig'); // Import the Google configuration

const router = express.Router();

const client = new google.auth.OAuth2(
  googleConfig.GOOGLE_CLIENT_ID,
  googleConfig.GOOGLE_CLIENT_SECRET,
  googleConfig.GOOGLE_REDIRECT_URI // Use the redirect URI from the Google configuration
);

// Redirect to Google's OAuth 2.0 server
router.get('/auth/google', (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  console.log("Redirecting user to Google's OAuth 2.0 server.");
  res.redirect(url);
});

// Handle the OAuth 2.0 server response
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { tokens } = await client.getToken(req.query.code);
    client.setCredentials(tokens);

    // Assuming req.session.userId is available and valid
    const userId = req.session.userId;

    // Save or update tokens in the database
    const existingAuth = await GoogleAuth.findOne({ user: userId });
    if (existingAuth) {
      existingAuth.accessToken = tokens.access_token;
      existingAuth.refreshToken = tokens.refresh_token || existingAuth.refreshToken;
      existingAuth.accessTokenExpiry = new Date(tokens.expiry_date);
      await existingAuth.save();
      console.log("Google OAuth tokens updated in the database for the existing user.");
    } else {
      await GoogleAuth.create({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiry: new Date(tokens.expiry_date),
        user: userId,
      });
      console.log("Google OAuth tokens saved in the database for the new user.");
    }

    console.log("Google OAuth flow completed successfully. Redirecting to the profile page.");
    res.redirect('/profile'); // Redirect to a success page
  } catch (error) {
    console.error('Error during Google Auth callback:', error.message, error.stack);
    res.redirect('/auth/error'); // Redirect to an error page
  }
});

// Route to handle disconnection
router.get('/auth/google/disconnect', async (req, res) => {
  try {
    await GoogleAuth.findOneAndRemove({ user: req.session.userId });
    console.log("Disconnected user from Google Calendar.");
    res.redirect('/profile/settings'); // Redirect back to the profile settings page
  } catch (error) {
    console.error('Error disconnecting from Google Calendar:', error.message, error.stack);
    res.status(500).send('Error disconnecting from Google Calendar. Please try again.');
  }
});

module.exports = router;