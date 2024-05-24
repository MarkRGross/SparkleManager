const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  location: { type: String, required: true }, // city, state, zip code as a single string
  businessName: { type: String, required: true },
  numberOfEmployees: { type: Number, required: false }, // This field is not required
  preferredTimezone: { type: String, required: false } // Added field for storing user's preferred timezone, not required to accommodate existing users
});

userSchema.pre('save', function(next) {
  const user = this;
  if (!user.isModified('password')) return next();
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      return next(err);
    }
    user.password = hash;
    next();
  });
});

userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error(`Duplicate key error collection: ${error.message}`);
    next(new Error('Email must be unique'));
  } else {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;