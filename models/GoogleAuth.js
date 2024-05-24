const mongoose = require('mongoose');
const dateFns = require('date-fns');
const { google } = require('googleapis');

const googleAuthSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  accessTokenExpiry: { type: Date, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

// Method to check if the access token is expired
googleAuthSchema.methods.isAccessTokenExpired = function() {
  const isExpired = dateFns.isPast(this.accessTokenExpiry);
  console.log(`Access token expired: ${isExpired}`);
  return isExpired;
};

// Method to update access token and its expiry
googleAuthSchema.methods.updateAccessToken = async function(newAccessToken, newExpiry) {
  try {
    this.accessToken = newAccessToken;
    this.accessTokenExpiry = dateFns.addSeconds(new Date(), newExpiry);
    await this.save();
    console.log('Access token updated successfully.');
  } catch (error) {
    console.error('Error updating access token:', error);
    console.error(error.stack);
    throw error;
  }
};

// Method to refresh access token using refresh token
googleAuthSchema.methods.refreshAccessToken = async function() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.BASE_URL
  );

  oauth2Client.setCredentials({
    refresh_token: this.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const expiryDate = credentials.expiry_date;
    await this.updateAccessToken(credentials.access_token, (expiryDate - Date.now()) / 1000);
    // If a new refresh token is provided, update it in the database
    if (credentials.refresh_token) {
      this.refreshToken = credentials.refresh_token;
      await this.save();
    }
    console.log('Access token refreshed successfully.');
  } catch (error) {
    console.error('Error refreshing access token:', error);
    console.error(error.stack);
    throw error;
  }
};

const GoogleAuth = mongoose.model('GoogleAuth', googleAuthSchema);

module.exports = GoogleAuth;