const express = require('express');
const User = require('../models/User');
const GoogleAuth = require('../models/GoogleAuth'); // Added to check Google Calendar connection status
const { isAuthenticated } = require('./middleware/authMiddleware');

const router = express.Router();

// Route for displaying the user profile settings form
router.get('/profile/settings', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const googleAuth = await GoogleAuth.findOne({ user: req.session.userId }); // Check if the user is connected to Google Calendar
    const isConnectedToGoogle = !!googleAuth; // Convert the existence of googleAuth document into a boolean
    
    if (!user) {
      console.log("User not found");
      return res.status(404).send('User not found.');
    }
    console.log("Displaying profile settings for user:", user.username);
    res.render('profileSettings', { user, isConnectedToGoogle }); // Pass the connection status to the template
  } catch (error) {
    console.error('Error fetching user for profile settings:', error.message, error.stack);
    res.status(500).send('Error fetching user profile settings.');
  }
});

// Route for updating the user profile settings, including the preferred timezone
router.post('/profile/settings', isAuthenticated, async (req, res) => {
  const { preferredTimezone } = req.body;
  try {
    await User.findByIdAndUpdate(req.session.userId, { preferredTimezone });
    console.log(`Profile updated for user: ${req.session.userId}, Timezone set to: ${preferredTimezone}`);
    res.redirect('/profile/settings');
  } catch (error) {
    console.error('Error updating user profile settings:', error.message, error.stack);
    res.status(500).send('Error updating profile settings.');
  }
});

module.exports = router;