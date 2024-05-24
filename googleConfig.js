const fs = require('fs');
const path = require('path');

let googleCredentials;

try {
  const credentialsPath = path.join(__dirname, 'client_secret_710689227611-tinoogdq056i3e6puml8bu1eqehnsvgu.apps.googleusercontent.com.json');
  const credentialsFile = fs.readFileSync(credentialsPath);
  googleCredentials = JSON.parse(credentialsFile);
} catch (error) {
  console.error('Error loading Google credentials file:', error.message, error.stack);
  process.exit(1); // Terminate the process as the credentials are essential for the application
}

const { client_id, client_secret, redirect_uris } = googleCredentials.web;

if (!client_id || !client_secret || !redirect_uris) {
  console.error("Missing required fields in Google credentials file. Please ensure 'client_id', 'client_secret', and 'redirect_uris' are correctly specified.");
  process.exit(1); // Terminate the process as these fields are essential
}

module.exports = {
  GOOGLE_CLIENT_ID: client_id,
  GOOGLE_CLIENT_SECRET: client_secret,
  GOOGLE_REDIRECT_URI: redirect_uris[0] // Assuming the first redirect URI is the one we want to use
};