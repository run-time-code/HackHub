import { api } from "./http";
import { normalizeProfile } from "./contracts";

/**
 * Canonical WA3 response shapes. Kept as JSDoc typedefs so editors surface
 * the contract without a build step, while the client remains plain JS.
 *
 * @typedef {Object} OwnProfile
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} bio
 * @property {string} college
 * @property {string} location
 * @property {string} headline
 * @property {string} year
 * @property {{github:string, linkedin:string, portfolio:string}} links
 * @property {Array<{name:string, year:string, projectUrl:string}>} pastHackathons
 * @property {string[]} skills
 * @property {Record<string,"beginner"|"intermediate"|"advanced"|"expert">} skillProficiency
 * @property {{interests?:string[], preferredMode?:string}} preferences
 * @property {string} avatarUrl
 * @property {"available"|"limited"|"unavailable"} availability
 * @property {boolean} lookingForTeam
 * @property {boolean} discoverable
 * @property {boolean} emailVerified
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} hackathon
 * @property {string|null} hackathonTitle
 * @property {string} leader
 * @property {Array<{user:string, role:string, joinedAt:string}>} members
 * @property {string[]} rolesNeeded
 * @property {number} maxTeamSize
 * @property {number} size
 * @property {number} openSlots
 * @property {"open"|"closed"} status
 *
 * @typedef {Object} TeamRequest
 * @property {string} id
 * @property {{id:string, name?:string, status?:string, leader?:string}} team
 * @property {{id:string, name?:string, skills?:string[], availability?:string}} user
 * @property {"request"|"invite"} type
 * @property {string} initiatedBy
 * @property {string} role
 * @property {string} message
 * @property {"pending"|"accepted"|"declined"|"cancelled"|"expired"} status
 * @property {string} expiresAt
 * @property {string|null} respondedAt
 * @property {string} createdAt
 */

export async function getMyProfile() {
  const payload = await api.get("/users/me");
  return normalizeProfile(payload?.user || payload);
}

export async function getPublicProfile(id) {
  const payload = await api.get(`/users/public/${encodeURIComponent(id)}`);
  return normalizeProfile(payload?.user || payload);
}

export async function updateMyProfile(values) {
  const payload = await api.put("/users/me", values);
  return normalizeProfile(payload?.user || payload);
}

export async function getSkillTaxonomy() {
  const payload = await api.get("/users/skills");
  return payload?.skills || {};
}

export async function updateMySkills(skills) {
  const payload = await api.put("/users/skills", { skills });
  return payload?.skills || skills;
}

export async function uploadAvatar(file) {
  const form = new FormData();
  form.append("avatar", file);
  const payload = await api.put("/users/avatar", form);
  return payload?.avatarUrl || "";
}

export async function saveOnboarding(values) {
  return api.put("/users/me/onboarding", values);
}
