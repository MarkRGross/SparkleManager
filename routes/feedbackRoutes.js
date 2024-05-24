const express = require('express');
const Feedback = require('../models/Feedback');
const router = express.Router();

// Route to display the feedback form
router.get('/feedback', (req, res) => {
  res.render('feedback/form');
});

// Route to handle feedback form submission
router.post('/feedback', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    await Feedback.create({ name, email, message });
    console.log('Feedback submitted successfully:', { name, email });
    res.send('Thank you for your feedback!');
  } catch (error) {
    console.error('Feedback submission error:', error.message, error.stack);
    res.status(500).send('An error occurred while submitting your feedback. Please try again.');
  }
});

module.exports = router;