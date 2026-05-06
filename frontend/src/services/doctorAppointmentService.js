/**
 * DOCTOR MODULE — Appointment API Service
 * Doctor-side: list day's appointments, set Google Meet link, mark sent.
 * Reuses doctor JWT instance (doctorAuthService).
 */

import doctorApi from "./doctorAuthService";

// ============================================
// 📋 LIST DOCTOR'S APPOINTMENTS BY DATE
// ============================================
/**
 * @param {string} date - YYYY-MM-DD (defaults to today on backend if omitted)
 * @returns {Promise<{ appointments, date }>}
 */
export const fetchDoctorAppointments = async (date) => {
  const response = await doctorApi.get("/doctor/appointments", {
    params: date ? { date } : {},
  });
  return response.data.data;
};

// ============================================
// 🔗 SET MEETING LINK (saves but does not send)
// ============================================
export const setMeetingLink = async (appointmentId, meetingLink) => {
  const response = await doctorApi.patch(
    `/doctor/appointments/${appointmentId}/meeting-link`,
    { meetingLink }
  );
  return response.data.data.appointment;
};

// ============================================
// 📤 SEND MEETING LINK TO PATIENT
// ============================================
export const sendMeetingLink = async (appointmentId) => {
  const response = await doctorApi.post(
    `/doctor/appointments/${appointmentId}/send-meeting-link`
  );
  return response.data.data.appointment;
};