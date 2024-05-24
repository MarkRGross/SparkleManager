const { google } = require('googleapis');
const GoogleAuth = require('../models/GoogleAuth');
const Event = require('../models/Event'); // Import the Event model

class GoogleCalendarAPI {
  constructor(userId) {
    this.userId = userId;
    this.calendar = google.calendar({ version: 'v3' });
  }

  async initializeClient() {
    const authData = await GoogleAuth.findOne({ user: this.userId });
    if (!authData) {
      console.error('No Google Auth data found for user');
      throw new Error('No Google Auth data found for user');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.BASE_URL
    );

    oauth2Client.setCredentials({
      access_token: authData.accessToken,
      refresh_token: authData.refreshToken,
      expiry_date: authData.accessTokenExpiry.getTime(),
    });

    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        // If the access token is refreshed, update it in the database
        authData.accessToken = tokens.access_token;
        authData.refreshToken = tokens.refresh_token;
        authData.accessTokenExpiry = new Date(tokens.expiry_date);
        await authData.save();
        console.log('Google OAuth tokens updated in the database for the existing user.');
      }
    });

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Check if the current access token is expired
    if (authData.isAccessTokenExpired()) {
      await authData.refreshAccessToken();
      console.log('Access token was expired and has been refreshed.');
    }
  }

  async listEvents() {
    await this.initializeClient();
    const now = new Date();
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items.map(event => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date, // Use dateTime for specific times or date for all-day events
      end: event.end.dateTime || event.end.date,
      description: event.description || '',
    }));
  }

  async createEvent(eventDetails) {
    try {
      await this.initializeClient();
      const event = {
        summary: eventDetails.summary,
        location: eventDetails.location,
        description: eventDetails.description,
        start: {
          dateTime: eventDetails.start.dateTime,
          timeZone: eventDetails.timezone,
        },
        end: {
          dateTime: eventDetails.end.dateTime,
          timeZone: eventDetails.timezone,
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log('Event created in Google Calendar', response.data);

      // Update the Sparkle_Manager_ event record with the Google Calendar event ID
      await Event.findOneAndUpdate({ _id: eventDetails.databaseId }, { $set: { googleEventId: response.data.id } });

      return response.data;
    } catch (error) {
      console.error('Error creating event in Google Calendar:', error.message, error.stack);
      if (error.response) {
        console.error('API response error:', error.response.data);
      }
      throw error;
    }
  }

  async updateEvent(eventId, eventDetails) {
    try {
      await this.initializeClient();
      const event = {
        summary: eventDetails.summary,
        location: eventDetails.location,
        description: eventDetails.description,
        start: {
          dateTime: eventDetails.start.dateTime,
          timeZone: eventDetails.timezone,
        },
        end: {
          dateTime: eventDetails.end.dateTime,
          timeZone: eventDetails.timezone,
        },
      };

      console.log(`Attempting to update event in Google Calendar with ID ${eventId}`);
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
      });

      console.log('Event updated in Google Calendar', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating event in Google Calendar:', error.message, error.stack);
      if (error.response) {
        console.error('API response error:', error.response.data);
      }
      throw error;
    }
  }

  async deleteEvent(eventId) {
    try {
      await this.initializeClient();
      console.log(`Attempting to delete event from Google Calendar with ID ${eventId}`);
      const response = await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      console.log('Event deleted from Google Calendar', response.data);

      // Remove the Google Calendar event ID from the Sparkle_Manager_ event record
      await Event.findOneAndUpdate({ googleEventId: eventId }, { $unset: { googleEventId: "" } });

      return response.data;
    } catch (error) {
      console.error('Error deleting event from Google Calendar:', error.message, error.stack);
      throw error;
    }
  }
}

module.exports = GoogleCalendarAPI;