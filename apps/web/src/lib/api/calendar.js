import { apiRequest } from "./http";

function collectionFrom(data, keys) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  throw new Error("The API returned an unexpected list response.");
}

export async function getCalendarEvents(month) {
  const data = await apiRequest(`/calendar?month=${encodeURIComponent(month)}`);
  return collectionFrom(data, ["items", "events", "results"]);
}

export async function getReminders() {
  const data = await apiRequest("/reminders");
  return collectionFrom(data, ["items", "reminders", "results"]);
}

export function createReminder(payload) {
  return apiRequest("/reminders", { method: "POST", body: payload });
}

export function saveReminderPreferences(payload) {
  return apiRequest("/reminders/preferences", { method: "PUT", body: payload });
}

export function getReminderPreferences() {
  return apiRequest("/reminders/preferences");
}
