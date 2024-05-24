const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  address: {
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  phoneNumber: { type: String, required: true },
  eventDate: { type: Date, required: true },
  theme: { type: String, required: true },
  specialInstructions: { type: String, required: false },
  partyBeneficiary: { type: String, required: false },
  quoteGiven: { type: Number, required: true },
  depositRequired: { type: Boolean, required: true },
  depositAmount: { type: Number, required: function() { return this.depositRequired; } },
  quotePaid: { type: Boolean, required: true, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timezone: { type: String, required: true } // Added timezone field
});

eventSchema.post('save', (error, doc, next) => {
  if (error) {
    console.error(`Error saving event: ${error.message}`, error);
    next(error); // Forward the error to the next middleware
  } else {
    console.log(`Event saved successfully: ${doc.clientName} on ${doc.eventDate}`);
    next();
  }
});

eventSchema.post('validate', (doc, next) => {
  if (!doc.depositRequired && doc.depositAmount > 0) {
    console.error('Validation error: Deposit amount specified without deposit being required');
    next(new Error('Deposit amount specified without deposit being required'));
  } else if (doc.quotePaid && doc.quoteGiven <= 0) {
    console.error('Validation error: Quote paid status true with no quote given');
    next(new Error('Quote paid status true with no quote given'));
  } else {
    console.log('Validation succeeded for event');
    next();
  }
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;