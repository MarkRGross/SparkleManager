const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const router = express.Router();

router.get('/auth/register', (req, res) => {
  res.render('register');
});

router.post('/auth/register', async (req, res) => {
  try {
    const { username, password, email, location, businessName, numberOfEmployees } = req.body;
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("Email already in use:", email);
      return res.status(400).send('Email already in use. Please use a different email.');
    }
    // User model will automatically hash the password using bcrypt
    const newUser = await User.create({ username, password, email, location, businessName, numberOfEmployees });
    console.log("User registered successfully with username:", username);
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    console.error(error.stack); // Log the full error stack for debugging
    res.status(500).send('Registration failed. Please try again.');
  }
});

router.get('/auth/login', (req, res) => {
  res.render('login');
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      console.log("User not found for username:", username);
      return res.status(400).send('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.userId = user._id;
      console.log("User logged in successfully with username:", username);
      return res.redirect('/');
    } else {
      console.log("Incorrect password for username:", username);
      return res.status(400).send('Password is incorrect');
    }
  } catch (error) {
    console.error('Login error:', error);
    console.error(error.stack); // Log the full error stack for debugging
    return res.status(500).send('Login failed. Please try again.');
  }
});

router.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error during session destruction:', err);
      console.error(err.stack); // Log the full error stack for debugging
      return res.status(500).send('Error logging out');
    }
    console.log("User logged out successfully");
    res.redirect('/auth/login');
  });
});

module.exports = router;