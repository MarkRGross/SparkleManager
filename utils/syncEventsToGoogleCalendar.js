const { google } = require('googleapis');
const Event = require('../models/Event');
const GoogleAuth = require('../models/GoogleAuth');
const dateFns = require('date-fns');

class SyncEventsToGoogleCalendar {
  constructor() {
    this.calendar = google.calendar({ version: 'v3' });
  }

  async initClient(userId) {
    const authData = await GoogleAuth.findOne({ user: userId });
    if (!authData || !authData.accessToken || dateFns.isPast(new Date(authData.accessTokenExpiry))) {
      console.error('Google Auth data missing or access token expired for user:', userId);
      throw new Error('Authentication required');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.BASE_URL
    );

    oauth2Client.setCredentials({
      access_token: authData.accessToken,
      refresh_token: authData.refreshToken,
      expiry_date: authData.accessTokenExpiry,
    });

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async syncToGoogleCalendar(userId) {
    await this.initClient(userId);

    const eventsInDb = await Event.find({ user: userId });
    const googleEvents = await this.listGoogleEvents(userId);
    const googleEventIds = googleEvents.map(event => event.id);

    // Create or update events in Google Calendar based on Sparkle_Manager_ events
    for (const event of eventsInDb) {
      const eventIndex = googleEventIds.indexOf(event.googleEventId);
      if (eventIndex === -1) {
        // Event not found in Google Calendar, create it
        try {
          const googleEvent = await this.createGoogleEvent(event);
          event.googleEventId = googleEvent.id;
          await event.save();
          console.log('Event created in Google Calendar:', event.title);
        } catch (error) {
          console.error('Error creating event in Google Calendar:', error.message, error.stack);
        }
      } else {
        // Event found, update it
        try {
          await this.updateGoogleEvent(event);
          console.log('Event updated in Google Calendar:', event.title);
        } catch (error) {
          console.error('Error updating event in Google Calendar:', error.message, error.stack);
        }
        // Remove the event from googleEventIds to avoid deletion
        googleEventIds.splice(eventIndex, 1);
      }
    }

    // Delete events from Google Calendar not found in Sparkle_Manager_
    for (const eventId of googleEventIds) {
      try {
        await this.deleteGoogleEvent(eventId);
        console.log('Event deleted from Google Calendar:', eventId);
      } catch (error) {
        console.error('Error deleting event from Google Calendar:', error.message, error.stack);
      }
    }
  }

  async createGoogleEvent(event) {
    const googleEvent = {
      summary: event.title,
      location: event.location,
      description: event.description,
      start: {
        dateTime: event.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: 'UTC',
      },
    };

    const { data } = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: googleEvent,
    });

    return data;
  }

  async updateGoogleEvent(event) {
    const googleEvent = {
      summary: event.title,
      location: event.location,
      description: event.description,
      start: {
        dateTime: event.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: event.endDateTime,
        timeZone: 'UTC',
      },
    };

    const { data } = await this.calendar.events.update({
      calendarId: 'primary',
      eventId: event.googleEventId,
      resource: googleEvent,
    });

    return data;
  }

  async listGoogleEvents(userId) {
    await this.initClient(userId);
    const { data } = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return data.items;
  }

  async deleteGoogleEvent(eventId) {
    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
  }
}

module.exports = SyncEventsToGoogleCalendar;