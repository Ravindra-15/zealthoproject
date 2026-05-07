// services/doctorOptionsService.js

import doctorApi from "./doctorAuthService";

export const fetchDoctorOptions = async () => {
  const response = await doctorApi.get("/doctor/options");
  return response.data.data;
};