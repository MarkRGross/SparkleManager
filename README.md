# Sparkle Manager

Sparkle Manager is a Customer Relationship Management (CRM) tool tailored specifically for face painting business owners. It streamlines operations such as tracking leads, managing bookings, and generating financial reports, all within a user-friendly platform crafted for the unique needs of the face painting industry.

## Overview

The application is built on a Node.js backend with Express, utilizing MongoDB for data persistence and EJS for dynamic content rendering. The frontend leverages Bootstrap for responsive design and vanilla JavaScript for interactivity. This architecture supports user registration and profile management, event tracking, and feedback submission.

## Features

- **User Registration and Profile Creation:** Allows business owners to register and manage their profile.
- **Tracking Leads and Booked Gigs:** Users can input and track event details and client information.
- **Financial Tracking:** Facilitates income and expense logging.
- **Feature Request and Feedback:** A mechanism for users to provide feedback or request new functionalities.
- **Google Calendar Integration:** Now supports two-way synchronization. Events created or updated in the Sparkle_Manager_ application are automatically synced to the user's connected Google Calendar, and vice versa.

## Getting started

### Requirements

- Node.js
- MongoDB
- Internet connection (for Bootstrap and JavaScript CDN)
- Google Cloud Platform project with the Calendar API enabled and OAuth 2.0 credentials created
 
### Quickstart

1. Clone the repository.
2. Copy `.env.example` to `.env` and configure the environment variables. Ensure to include your database connection string, Google OAuth 2.0 credentials (Client ID, Client Secret, and Redirect URI), and other necessary configurations.
3. Install dependencies with `npm install`.
4. Start the application with `npm start`.
5. Access the web application at `http://localhost:3000`.

### Additional Setup for Google Calendar Integration

1. In the Google Cloud Console, enable the Calendar API for your project.
2. Create OAuth 2.0 credentials in the Credentials section. Download the JSON file and place it in the root directory of your project.
3. Update the `.env` file with your Google Client ID, Client Secret, and Redirect URI.

### License

Copyright © 2024.
