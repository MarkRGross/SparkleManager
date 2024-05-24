const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

feedbackSchema.post('save', function(doc, next) {
  console.log(`Feedback from ${doc.email} saved successfully.`);
  next();
});

feedbackSchema.post('save', function(error, doc, next) {
  if (error) {
    console.error('Error saving feedback:', error);
    next(error);
  } else {
    next();
  }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;