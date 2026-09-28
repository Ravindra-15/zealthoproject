// src/data/location.js
//
// Country → State → City cascade for Profile Step 2, backed by
// `countries-states-cities-service` (MIT — data bundled at build time from
// dr5hn/countries-states-cities-database, ODbL; no network calls at runtime).
//
// Each level is dynamically imported on first use so the ~2.4MB (gzipped)
// city dataset never sits in the main app bundle — it's only fetched as its
// own chunk once someone actually opens the city dropdown on this page.

let countriesMod = null;
let statesMod = null;
let citiesMod = null;

const sortName = { sort: { mode: "alphabetical", key: "name" } };

export const loadCountries = async () => {
  if (!countriesMod) countriesMod = await import("countries-states-cities-service/countries");
  return countriesMod.Countries.getCountries(sortName).map((c) => ({
    code: c.iso2,
    name: c.name,
    currency: c.currency,
  }));
};

export const loadStates = async (countryCode) => {
  if (!statesMod) statesMod = await import("countries-states-cities-service/states");
  return statesMod.States.getStates({
    filters: { country_code: countryCode },
    ...sortName,
  }).map((s) => ({ code: s.state_code, name: s.name }));
};

export const loadCities = async (countryCode, stateCode) => {
  if (!citiesMod) citiesMod = await import("countries-states-cities-service/cities");
  return citiesMod.Cities.getCities({
    filters: { country_code: countryCode, state_code: stateCode },
    ...sortName,
  }).map((c) => ({ code: String(c.id), name: c.name }));
};
