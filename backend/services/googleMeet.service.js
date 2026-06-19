/**
 * GOOGLE MEET SERVICE
 * Generates a Google Meet link via the Google Calendar API using a single
 * company Google account (one refresh token, shared by all doctors).
 * Reads credentials from .env — never hardcode secrets.
 *
 * Required .env:
 *   GOOGLE_MEET_CLIENT_ID
 *   GOOGLE_MEET_CLIENT_SECRET
 *   GOOGLE_MEET_REFRESH_TOKEN
 */

const { google } = require("googleapis");

// 🔐 OAuth2 client authenticated as the company account (refresh token)
const buildAuthClient = () => {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_MEET_CLIENT_ID,
    process.env.GOOGLE_MEET_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground" // redirect (matches token origin)
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_MEET_REFRESH_TOKEN,
  });
  return oAuth2Client;
};

// ============================================
// 🎥 CREATE A GOOGLE MEET LINK
// Creates a Calendar event with a Meet conference and returns the join URL.
// ============================================
const createMeetingLink = async ({ summary, startTime, durationMinutes = 30 }) => {
  if (
    !process.env.GOOGLE_MEET_CLIENT_ID ||
    !process.env.GOOGLE_MEET_CLIENT_SECRET ||
    !process.env.GOOGLE_MEET_REFRESH_TOKEN
  ) {
    throw new Error("Google Meet credentials are not configured");
  }

  const auth = buildAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  // Unique token so each event gets its own Meet room
  const requestId = `zealtho-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const event = {
    summary: summary || "Zealtho Consultation",
    start: { dateTime: start.toISOString(), timeZone: "UTC" },
    end: { dateTime: end.toISOString(), timeZone: "UTC" },
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
    conferenceDataVersion: 1,
  });

  // Extract the Meet link
  const link =
    response.data?.hangoutLink ||
    response.data?.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video"
    )?.uri ||
    null;

  if (!link) {
    throw new Error("Failed to generate Google Meet link");
  }

  return {
    meetingLink: link,
    eventId: response.data.id,
  };
};

module.exports = { createMeetingLink };