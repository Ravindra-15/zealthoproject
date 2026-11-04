/**
 * GOOGLE MEET SERVICE
 * Generates a Google Meet link using a single company Google account
 * (one refresh token, shared by all doctors).
 * Reads credentials from .env — never hardcode secrets.
 *
 * Why an "open" room: the company account is the meeting's owner, and it is
 * never in the call. With a normal room the doctor AND the patient both get
 * "Ask to join" and nobody is there to let them in. So we create the room
 * through the Meet REST API with accessType OPEN — anyone with the link
 * joins straight away, no knocking. The link is only shared with the
 * doctor and that appointment's patient.
 *
 * If the Meet API isn't set up yet (API not enabled / old refresh token
 * without the Meet scope), we fall back to the old Calendar-event method so
 * link generation never breaks — those rooms still "knock", see the log.
 *
 * Required .env:
 *   GOOGLE_MEET_CLIENT_ID
 *   GOOGLE_MEET_CLIENT_SECRET
 *   GOOGLE_MEET_REFRESH_TOKEN   — scopes:
 *       https://www.googleapis.com/auth/meetings.space.created  (open rooms)
 *       https://www.googleapis.com/auth/calendar                (fallback)
 *
 * Google Cloud project: enable "Google Meet REST API" (and Calendar API).
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
// 🚪 OPEN ROOM via Meet REST API — anyone with the link joins without knocking
// ============================================
const createOpenSpace = async (auth) => {
  const meet = google.meet({ version: "v2", auth });
  const response = await meet.spaces.create({
    requestBody: {
      config: {
        accessType: "OPEN",
        entryPointAccess: "ALL",
      },
    },
  });

  const link = response.data?.meetingUri || null;
  if (!link) throw new Error("Meet API returned no meeting link");

  // Google may silently apply a stricter access type (e.g. account policy) —
  // log it so it's visible in the server logs
  const accessType = response.data?.config?.accessType;
  if (accessType && accessType !== "OPEN") {
    console.log(`GOOGLE MEET: room created with accessType ${accessType} (wanted OPEN)`);
  }

  return { meetingLink: link, eventId: null, spaceName: response.data.name };
};

// ============================================
// 📅 FALLBACK — Calendar event with a Meet conference (old method; rooms knock)
// ============================================
const createCalendarMeeting = async (auth, { summary, startTime, durationMinutes }) => {
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

// ============================================
// 🎥 CREATE A GOOGLE MEET LINK
// Open room first; Calendar-event room if the Meet API isn't available.
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

  try {
    return await createOpenSpace(auth);
  } catch (err) {
    console.log(
      "GOOGLE MEET: open room failed, using Calendar fallback (doctor & patient will need to ask to join) —",
      err.message
    );
  }

  return createCalendarMeeting(auth, { summary, startTime, durationMinutes });
};

module.exports = { createMeetingLink };