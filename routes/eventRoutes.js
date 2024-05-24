const express = require('express');
const Event = require('../models/Event');
const FinancialRecord = require('../models/FinancialRecord'); // Import FinancialRecord model
const GoogleCalendarAPI = require('../utils/googleCalendarAPI'); // Import GoogleCalendarAPI utility
const { isAuthenticated } = require('./middleware/authMiddleware');
const moment = require('moment-timezone'); // Ensuring moment-timezone is utilized for timezone adjustments
const router = express.Router();
const User = require('../models/User'); // Import User model for timezone setting

// Display form to add a new event
router.get('/events/add', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).send('User not found.');
    }
    res.render('events/addEvent', { clientTimeZone: user.timezone || 'UTC' }); // Use user's preferred timezone
  } catch (error) {
    console.error('Error fetching user timezone:', error.message, error.stack);
    res.status(500).send('Error fetching user timezone.');
  }
});

// Submit the form for a new event
router.post('/events/add', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).send('User not found.');
    }
    const clientTimeZone = req.body.timezone; // Use the timezone field from the form

    // Structuring the eventDetails object from req.body and adding user information
    const eventDetails = {
      clientName: req.body.clientName,
      address: {
        city: req.body.address.city,
        state: req.body.address.state,
        zipCode: req.body.address.zipCode,
      },
      phoneNumber: req.body.phoneNumber,
      eventDate: moment.tz(req.body.eventDate, clientTimeZone).toISOString(), // Convert eventDate to the selected timezone's ISO string
      theme: req.body.theme,
      specialInstructions: req.body.specialInstructions,
      partyBeneficiary: req.body.partyBeneficiary,
      quoteGiven: req.body.quoteGiven,
      depositRequired: req.body.depositRequired === 'on' ? true : false,
      depositAmount: req.body.depositAmount,
      quotePaid: req.body.quotePaid === 'on' ? true : false, // Capture quotePaid status
      user: req.session.userId,
      timezone: clientTimeZone, // Store the timezone information
    };

    const event = await Event.create(eventDetails);

    // If the quote for the event is marked as paid, automatically create a financial record
    if (event.quotePaid) {
      await FinancialRecord.create({
        type: 'income',
        amount: event.quoteGiven,
        category: 'Event Payment',
        user: event.user,
      });
      console.log(`Financial record for event payment added successfully for event ${event._id}`);
    }

    // Synchronize the event with Google Calendar
    const googleCalendarAPI = new GoogleCalendarAPI(req.session.userId);
    await googleCalendarAPI.initializeClient();
    const googleEvent = {
      summary: `${eventDetails.clientName}'s Event`,
      location: `${eventDetails.address.city}, ${eventDetails.address.state}, ${eventDetails.address.zipCode}`,
      description: `Event Date: ${eventDetails.eventDate}\nTheme: ${eventDetails.theme}\nSpecial Instructions: ${eventDetails.specialInstructions}\nParty Beneficiary: ${eventDetails.partyBeneficiary}\nQuote Given: ${eventDetails.quoteGiven}\nDeposit Required: ${eventDetails.depositRequired ? 'Yes' : 'No'}\nDeposit Amount: ${eventDetails.depositAmount}`,
      start: {
        dateTime: moment.tz(eventDetails.eventDate, clientTimeZone).toISOString(),
        timeZone: clientTimeZone,
      },
      end: {
        dateTime: moment.tz(eventDetails.eventDate, clientTimeZone).add(2, 'hours').toISOString(), // Assuming the event lasts 2 hours for simplicity
        timeZone: clientTimeZone,
      },
      attendees: [
        {
          email: user.email // Re-added to ensure the user is notified
        }
      ],
    };

    await googleCalendarAPI.createEvent(googleEvent)
      .then(async googleEventResponse => {
        console.log('Event created in Google Calendar', googleEventResponse);
        // Update the Sparkle_Manager_ event record with the Google Calendar event ID
        await Event.findByIdAndUpdate(event._id, { $set: { googleEventId: googleEventResponse.id } });
        console.log('Google Calendar event ID saved to Sparkle_Manager_ event record.');
      })
      .catch(err => {
        console.error('Error synchronizing event with Google Calendar:', err.message, err.stack);
      });

    console.log('Event added successfully:', event);
    res.redirect('/events');
  } catch (error) {
    console.error('Error adding event:', error.message, error.stack);
    res.status(500).send('Error adding event. Please try again.');
  }
});

// List all events for the logged-in user
router.get('/events', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).send('User not found.');
    }
    const events = await Event.find({ user: req.session.userId }).sort({ eventDate: 1 });
    const clientTimeZone = user.timezone || 'UTC'; // Use the user's preferred timezone

    // Convert event dates from UTC to the client's local time zone before rendering
    const updatedEvents = events.map(event => {
      event.eventDate = moment(event.eventDate).tz(event.timezone || clientTimeZone).format('YYYY-MM-DD'); // Use the event's timezone if available
      return event;
    });

    console.log(`Found ${updatedEvents.length} events for the user with ID: ${req.session.userId}`);
    res.render('events/listEvents', { events: updatedEvents });
  } catch (error) {
    console.error('Error fetching events:', error.message, error.stack);
    res.status(500).send('Error fetching events. Please try again.');
  }
});

// Display form to update an existing event
router.get('/events/edit/:eventId', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).send('User not found.');
    }
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      console.log(`Event with ID ${req.params.eventId} not found`);
      return res.status(404).send('Event not found.');
    }
    res.render('events/editEvent', { event, clientTimeZone: user.timezone || 'UTC' }); // Use user's preferred timezone
  } catch (error) {
    console.error('Error fetching event for edit:', error.message, error.stack);
    res.status(500).send('Error fetching event for edit. Please try again.');
  }
});

// Route to update an existing event and synchronize the changes with Google Calendar
router.post('/events/update/:eventId', isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    const updatedData = {
      clientName: req.body.clientName,
      address: {
        city: req.body.address.city,
        state: req.body.address.state,
        zipCode: req.body.address.zipCode,
      },
      phoneNumber: req.body.phoneNumber,
      eventDate: moment.tz(req.body.eventDate, req.body.timezone).toISOString(), // Convert eventDate to the selected timezone's ISO string
      theme: req.body.theme,
      specialInstructions: req.body.specialInstructions,
      partyBeneficiary: req.body.partyBeneficiary,
      quoteGiven: req.body.quoteGiven,
      depositRequired: req.body.depositRequired === 'on',
      depositAmount: req.body.depositAmount,
      timezone: req.body.timezone,
    };

    await Event.findByIdAndUpdate(eventId, updatedData);
    console.log(`Event with ID ${eventId} updated successfully.`);

    // Synchronize the updated event details with Google Calendar
    const googleCalendarAPI = new GoogleCalendarAPI(req.session.userId);
    await googleCalendarAPI.initializeClient();
    const event = await Event.findById(eventId);
    if (event.googleEventId) {
      await googleCalendarAPI.updateEvent(event.googleEventId, {
        summary: updatedData.clientName + "'s Event",
        location: updatedData.address.city + ", " + updatedData.address.state + ", " + updatedData.address.zipCode,
        description: `Event Date: ${updatedData.eventDate}\nTheme: ${updatedData.theme}\nSpecial Instructions: ${updatedData.specialInstructions}\nParty Beneficiary: ${updatedData.partyBeneficiary}\nQuote Given: ${updatedData.quoteGiven}\nDeposit Required: ${updatedData.depositRequired ? 'Yes' : 'No'}\nDeposit Amount: ${updatedData.depositAmount}`,
        start: { dateTime: updatedData.eventDate, timeZone: updatedData.timezone },
        end: { dateTime: moment(updatedData.eventDate).add(2, 'hours').toISOString(), timeZone: updatedData.timezone },
      });
      console.log(`Event with ID ${eventId} updated in Google Calendar.`);
    } else {
      console.log(`Event with ID ${eventId} does not have a corresponding Google Calendar event.`);
    }

    res.redirect('/events');
  } catch (error) {
    console.error('Error updating event:', error.message, error.stack);
    res.status(500).send('Error updating event. Please try again.');
  }
});

module.exports = router;