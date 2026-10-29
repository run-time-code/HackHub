import { api } from "./http";
import {
  normalizeProfile,
  normalizeTeam,
  normalizeRequest,
  normalizeHackathon,
} from "./contracts";

export async function discoverUsers(filters = {}, { signal } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "skills" || key === "interests") {
      if (Array.isArray(value) && value.length) params.set(key, value.join(","));
      continue;
    }
    params.set(key, String(value));
  }
  const query = params.toString();
  const data = await api.get(`/users/discover${query ? `?${query}` : ""}`, { signal });
  return {
    items: Array.isArray(data?.items)
      ? data.items.map((item) => ({
          ...normalizeProfile(item),
          matchScore: Number(item?.matchScore) || 0,
          matchCount: Number(item?.matchCount) || 0,
          matchedSkills: Array.isArray(item?.matchedSkills) ? item.matchedSkills : [],
          matchedInterests: Array.isArray(item?.matchedInterests) ? item.matchedInterests : [],
        }))
      : [],
    total: Number(data?.total) || 0,
    page: Number(data?.page) || 1,
    limit: Number(data?.limit) || 20,
  };
}

export async function listHackathons(filters = {}, { signal } = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  const data = await api.get(`/hackathons${query ? `?${query}` : ""}`, { signal });
  return {
    items: Array.isArray(data?.items) ? data.items.map(normalizeHackathon) : [],
    total: Number(data?.total) || 0,
    page: Number(data?.page) || 1,
    limit: Number(data?.limit) || 20,
  };
}

export async function getHackathon(id, { signal } = {}) {
  return normalizeHackathon(await api.get(`/hackathons/${encodeURIComponent(id)}`, { signal }));
}

export async function listMyTeams({ signal } = {}) {
  const data = await api.get("/teams/mine", { signal });
  return (data?.items || []).map(normalizeTeam);
}

export async function listTeams({ hackathonId, status, page = 1, limit = 24 } = {}, { signal } = {}) {
  const params = new URLSearchParams({ hackathonId, page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  const data = await api.get(`/teams?${params.toString()}`, { signal });
  return {
    items: (data?.items || []).map(normalizeTeam),
    total: Number(data?.total) || 0,
    page: Number(data?.page) || page,
    limit: Number(data?.limit) || limit,
  };
}

export async function getTeam(id, { signal } = {}) {
  return normalizeTeam(await api.get(`/teams/${encodeURIComponent(id)}`, { signal }));
}

export async function createTeam(values) {
  return normalizeTeam(await api.post("/teams", values));
}

export async function updateTeam(id, values) {
  return normalizeTeam(await api.patch(`/teams/${encodeURIComponent(id)}`, values));
}

export async function transferLeadership(id, userId) {
  return normalizeTeam(await api.patch(`/teams/${encodeURIComponent(id)}/leader`, { userId }));
}

export async function removeTeamMember(id, userId) {
  return normalizeTeam(
    await api.delete(`/teams/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`)
  );
}

export async function disbandTeam(id) {
  return api.delete(`/teams/${encodeURIComponent(id)}`);
}

export async function requestToJoin(id, values) {
  return api.post(`/teams/${encodeURIComponent(id)}/requests`, values);
}

export async function inviteToTeam(id, values) {
  return api.post(`/teams/${encodeURIComponent(id)}/invitations`, values);
}

export async function listTeamRequests(id, type = "request", { signal } = {}) {
  const data = await api.get(
    `/teams/${encodeURIComponent(id)}/requests?type=${encodeURIComponent(type)}`,
    { signal }
  );
  return (data?.items || []).map(normalizeRequest);
}

export async function listTeamInvitations(id) {
  return listTeamRequests(id, "invite");
}
