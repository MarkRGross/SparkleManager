const express = require('express');
const { google } = require('googleapis');
const GoogleAuth = require('../models/GoogleAuth');
const User = require('../models/User'); // Import User model
require('dotenv').config();

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID, 
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.BASE_URL 
);

// Redirect to Google's OAuth 2.0 server
router.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  console.log("Redirecting user to Google's OAuth 2.0 server.");
  res.redirect(url);
});

// Handle the OAuth 2.0 server response
router.get('/auth/google/callback', async (req, res) => {
  if (req.query.error) {
    console.error('User cancelled the Google OAuth flow or an error occurred:', req.query.error);
    return res.redirect('/auth/error');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);

    const userId = req.session.userId;

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
    res.redirect('/profile');
  } catch (error) {
    console.error('Error during Google Auth callback:', error.message, error.stack);
    res.redirect('/auth/error');
  }
});

// Route to serve the profile page
router.get('/profile', async (req, res) => {
  if (!req.session || !req.session.userId) {
    console.log("User session not found, redirecting to login.");
    return res.redirect('/auth/login');
  }
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log("User not found, redirecting to login.");
      return res.redirect('/auth/login');
    }
    const googleAuth = await GoogleAuth.findOne({ user: user._id });
    const isConnectedToGoogle = !!googleAuth;
    console.log("Displaying profile page for user:", user.username);
    res.render('profile', { user, isConnectedToGoogle });
  } catch (error) {
    console.error('Error fetching user for profile page:', error.message, error.stack);
    res.status(500).send('An error occurred while trying to display the profile page.');
  }
});

// Custom route to handle authentication errors
router.get('/auth/error', (req, res) => {
  res.render('authError'); // Render the authentication error page
});

module.exports = router;