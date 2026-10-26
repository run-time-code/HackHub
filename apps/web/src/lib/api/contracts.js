/**
 * Canonical WA3 response shapes and normalizers.
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

const EMPTY_LINKS = { github: "", linkedin: "", portfolio: "" };

export function normalizeProfile(user) {
  if (!user) return null;
  return {
    id: user.id || user._id || "",
    name: user.name || "",
    email: user.email || "",
    bio: user.bio || "",
    college: user.college || "",
    location: user.location || "",
    headline: user.headline || "",
    year: user.year || "",
    links: { ...EMPTY_LINKS, ...(user.links || {}) },
    pastHackathons: Array.isArray(user.pastHackathons)
      ? user.pastHackathons.map((entry) => ({
          name: entry?.name || "",
          year: entry?.year || "",
          projectUrl: entry?.projectUrl || "",
        }))
      : [],
    skills: Array.isArray(user.skills) ? user.skills : [],
    skillProficiency:
      user.skillProficiency && typeof user.skillProficiency === "object"
        ? user.skillProficiency
        : {},
    preferences:
      user.preferences && typeof user.preferences === "object" ? user.preferences : {},
    avatarUrl: user.avatarUrl || "",
    availability: user.availability || "available",
    lookingForTeam: Boolean(user.lookingForTeam),
    discoverable: Boolean(user.discoverable),
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

export function normalizeTeam(team) {
  if (!team) return null;
  const members = Array.isArray(team.members)
    ? team.members.map((member) =>
        typeof member === "string"
          ? { user: member, role: "member", joinedAt: null }
          : {
              user: member?.user || member?.id || "",
              role: member?.role || "member",
              joinedAt: member?.joinedAt || null,
            }
      )
    : [];
  const maxTeamSize = Number(team.maxTeamSize) || 4;
  return {
    id: team.id || team._id || "",
    name: team.name || "",
    description: team.description || "",
    hackathon: team.hackathon?._id || team.hackathon || "",
    hackathonTitle: team.hackathonTitle || team.hackathon?.title || "",
    leader: team.leader?._id || team.leader || "",
    members,
    rolesNeeded: Array.isArray(team.rolesNeeded) ? team.rolesNeeded : [],
    maxTeamSize,
    size: Number(team.size) || 1 + members.length,
    openSlots:
      team.openSlots !== undefined
        ? Number(team.openSlots)
        : Math.max(maxTeamSize - (1 + members.length), 0),
    status: team.status === "closed" ? "closed" : "open",
    createdAt: team.createdAt || null,
    updatedAt: team.updatedAt || null,
  };
}

export function normalizeRequest(request) {
  if (!request) return null;
  return {
    id: request.id || request._id || "",
    team:
      typeof request.team === "string"
        ? { id: request.team }
        : { ...request.team, id: request.team?.id || request.team?._id || "" },
    user:
      typeof request.user === "string"
        ? { id: request.user }
        : { ...request.user, id: request.user?.id || request.user?._id || "" },
    type: request.type === "invite" ? "invite" : "request",
    initiatedBy: request.initiatedBy || "",
    role: request.role || "member",
    message: request.message || "",
    status: request.status || "pending",
    expiresAt: request.expiresAt || null,
    respondedAt: request.respondedAt || null,
    createdAt: request.createdAt || null,
    updatedAt: request.updatedAt || null,
  };
}

export function normalizeHackathon(hackathon) {
  if (!hackathon) return null;
  return {
    id: hackathon.id || hackathon._id || "",
    slug: hackathon.slug || hackathon.hackathon_id || "",
    title: hackathon.title || hackathon.name || "",
    registrationDeadline: hackathon.registrationDeadline || hackathon.registration_deadline || null,
    isActive: hackathon.isActive !== false,
    isFeatured: Boolean(hackathon.isFeatured),
  };
}
