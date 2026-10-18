import { apiRequest } from "./client";

function collectionFrom(data, keys) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  throw new Error("The API returned an unexpected list response.");
}

export async function getHackathons(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, Array.isArray(value) ? value.join(",") : value);
    }
  }
  const query = params.toString();
  const data = await apiRequest(`/hackathons${query ? `?${query}` : ""}`);
  return {
    items: collectionFrom(data, ["items", "results", "hackathons"]),
    pagination: data?.pagination,
  };
}

export async function getSavedHackathons() {
  const data = await apiRequest("/saved");
  return collectionFrom(data, ["items", "results", "saved", "hackathons"]);
}

export function saveHackathon(hackathonId) {
  return apiRequest("/saved", { method: "POST", body: { hackathonId } });
}

export function updateSavedHackathon(id, updates) {
  return apiRequest(`/saved/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: updates,
  });
}

export function removeSavedHackathon(id) {
  return apiRequest(`/saved/${encodeURIComponent(id)}`, { method: "DELETE" });
}
