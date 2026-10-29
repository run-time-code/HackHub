import { http, HttpResponse, delay } from "msw";
import { BASE_URL } from "../lib/api/http";
import {
  CURRENT_USER_ID,
  DEMO_HACKATHONS,
  DEMO_SKILL_TAXONOMY,
  DEMO_STATS,
  currentUser,
  findHackathon,
  findTeam,
  findUser,
  hackathons,
  newId,
  notifications,
  reminderPreferences,
  reminders,
  requests,
  savedHackathons,
  teams,
  users,
} from "./data";

const API = BASE_URL.replace(/\/$/, "");
const endpoint = (path) => `${API}${path}`;
const DAY = 86_400_000;

async function settle(ms = 120) {
  await delay(ms);
}

function ok(data, status = 200) {
  return HttpResponse.json(data, { status });
}

function fail(message, status = 400, code = "VALIDATION_ERROR") {
  return HttpResponse.json({ message, code }, { status });
}

function missing(what = "Record") {
  return fail(`${what} not found`, 404, "NOT_FOUND");
}

async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function nowIso() {
  return new Date().toISOString();
}

function findHackathonAny(value) {
  return (
    DEMO_HACKATHONS.find(
      (hackathon) => hackathon.id === value || hackathon.slug === value
    ) || null
  );
}

function hackathonCard(hackathon) {
  if (!hackathon) return null;
  return {
    ...hackathon,
    eventStartDate: hackathon.startsAt || null,
    isActive: hackathon.isActive !== false,
  };
}

function savedForApi(entry) {
  const hackathon = findHackathonAny(entry.hackathon);
  return {
    id: entry.id,
    _id: entry.id,
    savedId: entry.id,
    hackathon: hackathonCard(hackathon) || {
      id: entry.hackathon,
      slug: entry.hackathon,
      title: "Hackathon",
    },
    status: entry.status || "saved",
    notes: entry.notes || "",
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function reminderTitle(eventType) {
  if (eventType === "submission") return "Submission deadline reminder";
  if (eventType === "event") return "Hackathon start reminder";
  return "Registration deadline reminder";
}

function reminderForApi(entry) {
  const hackathon = findHackathonAny(entry.hackathon);
  return {
    id: entry.id,
    _id: entry.id,
    title: `${reminderTitle(entry.eventType)} · ${hackathon?.title || "Hackathon"}`,
    hackathonId: hackathon?.id || entry.hackathon,
    hackathonSlug: hackathon?.slug || "",
    hackathonTitle: hackathon?.title || "",
    eventType: entry.eventType || "registration",
    daysBefore: entry.daysBefore,
    channel: entry.channel || "email",
    remindAt: entry.remindAt,
    active: entry.active !== false,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function istMonthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

function calendarEvent(hackathon, type, value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const label =
    type === "registration"
      ? "Registration deadline"
      : type === "submission"
        ? "Submission deadline"
        : "Event date";
  return {
    id: `${hackathon.id}:${type}`,
    _id: `${hackathon.id}:${type}`,
    type,
    label,
    title: label,
    date: date.toISOString(),
    hackathonId: hackathon.id,
    hackathonSlug: hackathon.slug,
    description: hackathon.description || "",
    hackathon: hackathonCard(hackathon),
  };
}

function isExpired(request) {
  return Boolean(request.expiresAt && new Date(request.expiresAt).getTime() <= Date.now());
}

function teamForApi(team) {
  if (!team) return null;
  const members = team.members.map((member) => ({ ...member }));
  const size = 1 + members.length;
  const openSlots = Math.max((Number(team.maxTeamSize) || 4) - size, 0);
  const hackathon = findHackathon(team.hackathon);
  return {
    id: team.id,
    name: team.name,
    description: team.description || "",
    hackathon: team.hackathon,
    hackathonTitle: hackathon?.title || "",
    leader: team.leader,
    members,
    rolesNeeded: [...(team.rolesNeeded || [])],
    maxTeamSize: Number(team.maxTeamSize) || 4,
    size,
    openSlots,
    status: team.status === "closed" || openSlots === 0 ? "closed" : "open",
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

function teamSummary(team) {
  if (!team) return null;
  const serialized = teamForApi(team);
  return {
    id: serialized.id,
    name: serialized.name,
    leader: serialized.leader,
    status: serialized.status,
    openSlots: serialized.openSlots,
    hackathon: serialized.hackathon,
  };
}

function userSummary(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    headline: user.headline || "",
    avatarUrl: user.avatarUrl || "",
    skills: [...(user.skills || [])],
    availability: user.availability,
    college: user.college || "",
    location: user.location || "",
    year: user.year || "",
  };
}

function requestForApi(request) {
  const team = findTeam(request.team);
  const user = findUser(request.user);
  return {
    id: request.id,
    team: teamSummary(team) || { id: request.team },
    user: userSummary(user) || { id: request.user },
    type: request.type,
    initiatedBy: request.initiatedBy,
    role: request.role || "member",
    message: request.message || "",
    status: request.status,
    expiresAt: request.expiresAt || null,
    respondedAt: request.respondedAt || null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function ownProfile(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    bio: user.bio || "",
    college: user.college || "",
    location: user.location || "",
    headline: user.headline || "",
    year: user.year || "",
    links: { ...user.links },
    pastHackathons: user.pastHackathons.map((entry) => ({ ...entry })),
    skills: [...user.skills],
    skillProficiency: { ...user.skillProficiency },
    preferences: {
      ...user.preferences,
      interests: [...(user.preferences.interests || [])],
    },
    avatarUrl: user.avatarUrl || "",
    availability: user.availability,
    lookingForTeam: Boolean(user.lookingForTeam),
    discoverable: Boolean(user.discoverable),
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function publicProfile(user) {
  return {
    id: user.id,
    name: user.name,
    bio: user.bio || "",
    college: user.college || "",
    location: user.location || "",
    headline: user.headline || "",
    year: user.year || "",
    skills: [...user.skills],
    skillProficiency: { ...user.skillProficiency },
    links: { ...user.links },
    pastHackathons: user.pastHackathons.map((entry) => ({ ...entry })),
    avatarUrl: user.avatarUrl || "",
    availability: user.availability,
    lookingForTeam: Boolean(user.lookingForTeam),
    createdAt: user.createdAt,
  };
}

function discoveryProfile(user, matchedSkills, matchedInterests, score) {
  const matchCount = matchedSkills.length + matchedInterests.length;
  return {
    id: user.id,
    name: user.name,
    headline: user.headline || "",
    bio: user.bio || "",
    college: user.college || "",
    location: user.location || "",
    year: user.year || "",
    avatarUrl: user.avatarUrl || "",
    skills: [...user.skills],
    skillProficiency: { ...user.skillProficiency },
    availability: user.availability,
    lookingForTeam: Boolean(user.lookingForTeam),
    updatedAt: user.updatedAt,
    matchScore: score,
    matchCount,
    matchedSkills,
    matchedInterests,
  };
}

function notificationForApi(note) {
  return {
    id: note.id,
    type: note.type,
    title: note.title,
    message: note.message,
    read: Boolean(note.read),
    createdAt: note.createdAt,
    data: { ...note.data },
  };
}

function findRequest(id) {
  return requests().find((entry) => entry.id === id) || null;
}

function teamMemberIds(team) {
  return [team.leader, ...team.members.map((member) => member.user)];
}

function isTeamMember(team, userId) {
  return teamMemberIds(team).includes(userId);
}

function cancelPendingForTeam(teamId, exceptId = null) {
  for (const request of requests()) {
    if (request.team !== teamId) continue;
    if (request.status !== "pending") continue;
    if (exceptId && request.id === exceptId) continue;
    request.status = "cancelled";
    request.respondedAt = nowIso();
    request.updatedAt = nowIso();
  }
}

function addNotification({ type, title, message, data }) {
  const note = {
    id: newId("note"),
    type,
    title,
    message,
    read: false,
    createdAt: nowIso(),
    data: data || {},
  };
  notifications().unshift(note);
  return note;
}

async function avatarAsDataUrl(file, fallback) {
  if (!file || typeof file.arrayBuffer !== "function") return fallback;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return `data:${file.type || "image/png"};base64,${btoa(binary)}`;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Session and profile
// ---------------------------------------------------------------------------

const sessionHandlers = [
  http.get(endpoint("/auth/csrf-token"), async () => {
    return ok({ csrfToken: "demo-csrf-token" });
  }),

  http.post(endpoint("/auth/login"), async ({ request }) => {
    await settle(250);
    const input = await body(request);
    if (!input.email || !input.password) {
      return fail("Email and password are required", 400);
    }
    const me = currentUser();
    return ok({
      message: "Welcome back. Demo mode is signed in as Asha.",
      user: {
        id: me.id,
        name: me.name,
        email: me.email,
        role: me.role,
      },
    });
  }),

  http.post(endpoint("/auth/register"), async ({ request }) => {
    await settle(250);
    const input = await body(request);
    if (!input.email || !input.password) {
      return fail("Email and password are required", 400);
    }
    return ok(
      {
        message: "Account created. Demo mode does not send verification email.",
        user: { email: input.email, name: input.name || "Builder" },
      },
      201
    );
  }),

  http.post(endpoint("/auth/forgot-password"), async () => {
    await settle(180);
    return ok({ message: "If that email exists, a reset link is on its way." });
  }),

  http.post(endpoint("/auth/reset-password"), async ({ request }) => {
    await settle(180);
    const input = await body(request);
    if (!input.password) return fail("A new password is required", 400);
    return ok({ message: "Password updated. You can sign in again." });
  }),

  http.get(endpoint("/auth/verify-email"), async () => {
    await settle(180);
    return ok({ message: "Email verified. Welcome to the field guide." });
  }),

  http.post(endpoint("/auth/refresh"), async () => {
    return ok({ message: "Session refreshed", user: { id: CURRENT_USER_ID } });
  }),

  http.post(endpoint("/auth/logout"), async () => {
    await settle(120);
    return ok({ message: "Signed out" });
  }),

  http.get(endpoint("/users/me"), async () => {
    await settle(90);
    return ok({ message: "Profile retrieved", user: ownProfile(currentUser()) });
  }),

  http.put(endpoint("/users/me"), async ({ request }) => {
    await settle(260);
    const input = await body(request);
    const me = currentUser();
    const editable = [
      "name",
      "bio",
      "college",
      "location",
      "headline",
      "year",
      "avatarUrl",
      "availability",
      "lookingForTeam",
      "discoverable",
    ];
    for (const key of editable) {
      if (input[key] !== undefined) me[key] = input[key];
    }
    if (input.links) me.links = { ...me.links, ...input.links };
    if (input.preferences) {
      me.preferences = {
        ...me.preferences,
        ...input.preferences,
        interests: Array.isArray(input.preferences.interests)
          ? [...input.preferences.interests]
          : me.preferences.interests,
      };
    }
    if (Array.isArray(input.pastHackathons)) {
      me.pastHackathons = input.pastHackathons.map((entry) => ({
        name: entry.name || "",
        year: entry.year || "",
        projectUrl: entry.projectUrl || "",
      }));
    }
    if (input.skillProficiency && typeof input.skillProficiency === "object") {
      me.skillProficiency = { ...input.skillProficiency };
    }
    me.updatedAt = nowIso();
    return ok({ message: "Profile updated", user: ownProfile(me) });
  }),

  http.put(endpoint("/users/me/change-password"), async ({ request }) => {
    await settle(240);
    const input = await body(request);
    if (!input.currentPassword) return fail("Current password is required");
    if (typeof input.newPassword !== "string" || input.newPassword.length < 8) {
      return fail("New password must be at least 8 characters");
    }
    if (input.currentPassword === input.newPassword) {
      return fail("Choose a password you have not used before");
    }
    return ok({ message: "Password changed" });
  }),

  http.get(endpoint("/users/me/export"), async () => {
    await settle(220);
    return ok({
      exportedAt: nowIso(),
      profile: ownProfile(currentUser()),
      teams: teams().filter(
        (team) =>
          team.leader === CURRENT_USER_ID ||
          team.members.some((member) => member.user === CURRENT_USER_ID)
      ),
      requests: requests().filter(
        (entry) =>
          entry.user === CURRENT_USER_ID || entry.initiatedBy === CURRENT_USER_ID
      ),
    });
  }),

  http.delete(endpoint("/users/me"), async () => {
    await settle(260);
    return ok({ message: "Account queued for deletion" });
  }),

  http.put(endpoint("/users/me/onboarding"), async ({ request }) => {
    await settle(280);
    const input = await body(request);
    const me = currentUser();
    if (typeof input.location === "string") me.location = input.location;
    if (Array.isArray(input.skills)) {
      me.skills = input.skills.slice(0, 10);
      me.skillProficiency = Object.fromEntries(me.skills.map((skill) => [skill, "intermediate"]));
    }
    if (Array.isArray(input.interests) || input.preferredMode) {
      me.preferences = {
        ...me.preferences,
        ...(Array.isArray(input.interests) ? { interests: [...input.interests] } : {}),
        ...(input.preferredMode ? { preferredMode: input.preferredMode } : {}),
      };
    }
    me.updatedAt = nowIso();
    return ok({ message: "Preferences saved", user: ownProfile(me) });
  }),

  http.get(endpoint("/users/skills"), async () => {
    return ok({ skills: DEMO_SKILL_TAXONOMY });
  }),

  http.put(endpoint("/users/skills"), async ({ request }) => {
    await settle(220);
    const input = await body(request);
    if (!Array.isArray(input.skills)) return fail("skills must be an array");
    if (input.skills.length > 10) return fail("Choose at most ten skills");
    const me = currentUser();
    me.skills = [...new Set(input.skills.filter((skill) => typeof skill === "string"))];
    me.skillProficiency = Object.fromEntries(
      Object.entries(me.skillProficiency).filter(([skill]) => me.skills.includes(skill))
    );
    me.updatedAt = nowIso();
    return ok({ message: "Skills updated", skills: [...me.skills] });
  }),

  http.put(endpoint("/users/avatar"), async ({ request }) => {
    await settle(300);
    const me = currentUser();
    let form;
    try {
      form = await request.formData();
    } catch {
      form = null;
    }
    const file = form?.get("avatar");
    const avatarUrl = await avatarAsDataUrl(file, me.avatarUrl);
    me.avatarUrl = avatarUrl;
    me.updatedAt = nowIso();
    return ok({ message: "Avatar updated", avatarUrl });
  }),

  http.get(endpoint("/users/public/:id"), async ({ params }) => {
    await settle(110);
    const user = findUser(params.id);
    if (!user) return missing("Builder");
    return ok({ message: "Public profile retrieved", user: publicProfile(user) });
  }),

  http.get(endpoint("/users/discover"), async ({ request }) => {
    await settle(150);
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") || "").trim().toLowerCase();
    const skillFilters = (params.get("skills") || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const interestFilters = (params.get("interests") || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const availability = params.get("availability");
    const lookingParam = params.get("lookingForTeam");
    const lookingForTeam = lookingParam === null ? true : lookingParam === "true";
    const page = Math.max(Number(params.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 50);

    const me = currentUser();
    const mySkills = me.skills.map((skill) => skill.toLowerCase());
    const myInterests = (me.preferences.interests || []).map((interest) =>
      interest.toLowerCase()
    );

    const matched = users()
      .filter((user) => user.id !== CURRENT_USER_ID)
      .filter((user) => user.discoverable)
      .filter((user) => Boolean(user.lookingForTeam) === lookingForTeam)
      .filter((user) => !availability || user.availability === availability)
      .filter((user) => {
        if (!skillFilters.length) return true;
        return user.skills.some((skill) => skillFilters.includes(skill.toLowerCase()));
      })
      .filter((user) => {
        if (!interestFilters.length) return true;
        const interests = (user.preferences.interests || []).map((entry) =>
          entry.toLowerCase()
        );
        return interests.some((interest) => interestFilters.includes(interest));
      })
      .filter((user) => {
        if (!query) return true;
        return [user.name, user.headline, user.bio, user.college, user.location, ...user.skills]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .map((user) => {
        const matchedSkills = user.skills.filter((skill) =>
          mySkills.includes(skill.toLowerCase())
        );
        const matchedInterests = (user.preferences.interests || []).filter((interest) =>
          myInterests.includes(interest.toLowerCase())
        );
        const skillShare = mySkills.length
          ? matchedSkills.length / Math.min(mySkills.length, 5)
          : 0;
        const interestShare = myInterests.length
          ? matchedInterests.length / myInterests.length
          : 0;
        const score = Math.max(
          0,
          Math.min(99, Math.round(skillShare * 70 + interestShare * 30))
        );
        return discoveryProfile(user, matchedSkills, matchedInterests, score);
      })
      .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));

    return ok({
      items: matched.slice((page - 1) * limit, page * limit),
      total: matched.length,
      page,
      limit,
    });
  }),
];

// ---------------------------------------------------------------------------
// Hackathons, stats and feedback
// ---------------------------------------------------------------------------

const metadataHandlers = [
  http.get(endpoint("/hackathons"), async ({ request }) => {
    await settle(80);
    const params = new URL(request.url).searchParams;
    const page = Math.max(Number(params.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 50);
    const active = params.get("active");
    const list = hackathons().filter((hackathon) =>
      active === null ? true : hackathon.isActive === (active === "true")
    );
    return ok({
      items: list.slice((page - 1) * limit, page * limit),
      total: list.length,
      page,
      limit,
    });
  }),

  http.get(endpoint("/hackathons/:id"), async ({ params }) => {
    await settle(80);
    const hackathon = DEMO_HACKATHONS.find(
      (entry) => entry.id === params.id || entry.slug === params.id
    );
    if (!hackathon) return missing("Hackathon");
    return ok(hackathon);
  }),

  http.get(endpoint("/stats"), async () => {
    await settle(70);
    return ok(DEMO_STATS);
  }),

  http.post(endpoint("/feedback"), async ({ request }) => {
    await settle(300);
    const input = await body(request);
    if (!input.message || !String(input.message).trim()) {
      return fail("Tell us a little more before sending");
    }
    return ok(
      {
        id: newId("feedback"),
        message: "Thank you. A human will read this.",
      },
      201
    );
  }),

  http.get(endpoint("/dashboard/summary"), async () => {
    return ok({
      statusCounts: [
        { _id: "ongoing", count: 2 },
        { _id: "completed", count: 1 },
      ],
      upcomingDeadlines: hackathons()
        .filter((entry) => entry.isActive)
        .slice(0, 3)
        .map((entry) => ({
          hackathon: entry.id,
          title: entry.title,
          registration_deadline: entry.registrationDeadline,
        })),
    });
  }),
];

// ---------------------------------------------------------------------------
// Calendar, reminders and saved hackathons
// ---------------------------------------------------------------------------

const SAVED_STATUSES = ["saved", "registered", "ongoing", "completed"];
const REMINDER_CHANNELS = ["email", "in_app"];

const integrationHandlers = [
  http.get(endpoint("/calendar"), async ({ request }) => {
    await settle(90);
    const month = new URL(request.url).searchParams.get("month") || "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return fail("month must use the YYYY-MM format");
    }
    const items = [];
    for (const hackathon of DEMO_HACKATHONS) {
      for (const [type, value] of [
        ["registration", hackathon.registrationDeadline],
        ["submission", hackathon.submissionDeadline],
        ["event", hackathon.startsAt],
      ]) {
        const event = calendarEvent(hackathon, type, value);
        if (event && istMonthKey(event.date) === month) items.push(event);
      }
    }
    items.sort((a, b) => a.date.localeCompare(b.date));
    return ok({ month, items });
  }),

  http.get(endpoint("/reminders/preferences"), async () => {
    await settle(70);
    return ok({ ...reminderPreferences() });
  }),

  http.put(endpoint("/reminders/preferences"), async ({ request }) => {
    await settle(180);
    const input = await body(request);
    const current = reminderPreferences();
    if (input.defaultDaysBefore !== undefined) {
      const days = Number(input.defaultDaysBefore);
      if (!Number.isInteger(days) || days < 0 || days > 365) {
        return fail("Default lead time must be a whole number from 0 to 365");
      }
      current.defaultDaysBefore = days;
    }
    if (input.channels !== undefined) {
      if (!Array.isArray(input.channels) || !input.channels.length) {
        return fail("Choose at least one notification channel");
      }
      current.channels = [...new Set(input.channels)];
    }
    if (input.quietHours !== undefined) {
      const { start, end } = input.quietHours || {};
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end || "")) {
        return fail("Quiet hours must use HH:MM");
      }
      current.quietHours = { start, end };
    }
    return ok({ ...current });
  }),

  http.get(endpoint("/reminders"), async () => {
    await settle(80);
    const items = reminders()
      .slice()
      .sort((a, b) => String(a.remindAt).localeCompare(String(b.remindAt)))
      .map(reminderForApi);
    return ok({ items });
  }),

  http.post(endpoint("/reminders"), async ({ request }) => {
    await settle(200);
    const input = await body(request);
    const hackathon = findHackathonAny(input.hackathonId);
    if (!hackathon) return missing("Hackathon");
    const eventType = input.eventType || "registration";
    if (!["registration", "submission", "event"].includes(eventType)) {
      return fail("eventType must be registration, submission or event");
    }
    const daysBefore = Number(input.daysBefore);
    if (!Number.isInteger(daysBefore) || daysBefore < 0 || daysBefore > 365) {
      return fail("daysBefore must be a whole number from 0 to 365");
    }
    const channel = input.channel || "email";
    if (!REMINDER_CHANNELS.includes(channel)) {
      return fail("channel must be email or in_app");
    }
    const deadline =
      eventType === "submission"
        ? hackathon.submissionDeadline
        : eventType === "event"
          ? hackathon.startsAt
          : hackathon.registrationDeadline;
    const deadlineTime = deadline ? new Date(deadline).getTime() : NaN;
    if (Number.isNaN(deadlineTime)) {
      return fail("This hackathon does not have a date for that reminder type", 400, "NO_DEADLINE");
    }
    const exists = reminders().find(
      (entry) =>
        entry.hackathon === hackathon.id &&
        entry.eventType === eventType &&
        entry.daysBefore === daysBefore &&
        entry.channel === channel
    );
    if (exists) {
      return fail("That reminder already exists", 409, "REMINDER_EXISTS");
    }
    const entry = {
      id: newId("reminder"),
      hackathon: hackathon.id,
      eventType,
      daysBefore,
      channel,
      remindAt: new Date(deadlineTime - daysBefore * DAY).toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    reminders().push(entry);
    return ok(reminderForApi(entry), 201);
  }),

  http.delete(endpoint("/reminders/:id"), async ({ params }) => {
    await settle(160);
    const list = reminders();
    const index = list.findIndex((entry) => entry.id === params.id);
    if (index === -1) return missing("Reminder");
    list.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(endpoint("/saved"), async () => {
    await settle(80);
    const items = savedHackathons()
      .slice()
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map(savedForApi);
    return ok({ items });
  }),

  http.post(endpoint("/saved"), async ({ request }) => {
    await settle(180);
    const input = await body(request);
    const hackathon = findHackathonAny(input.hackathonId);
    if (!hackathon) return missing("Hackathon");
    const existing = savedHackathons().find((entry) => entry.hackathon === hackathon.id);
    if (existing) return ok(savedForApi(existing));
    const entry = {
      id: newId("saved"),
      hackathon: hackathon.id,
      status: "saved",
      notes: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    savedHackathons().push(entry);
    return ok(savedForApi(entry), 201);
  }),

  http.patch(endpoint("/saved/:id"), async ({ params, request }) => {
    await settle(180);
    const entry = savedHackathons().find((item) => item.id === params.id);
    if (!entry) return missing("Saved hackathon");
    const input = await body(request);
    if (input.status !== undefined) {
      if (!SAVED_STATUSES.includes(input.status)) {
        return fail(`status must be one of ${SAVED_STATUSES.join(", ")}`);
      }
      entry.status = input.status;
    }
    if (input.notes !== undefined) {
      if (typeof input.notes !== "string" || input.notes.length > 2000) {
        return fail("Notes must be a string of at most 2000 characters");
      }
      entry.notes = input.notes;
    }
    entry.updatedAt = nowIso();
    return ok(savedForApi(entry));
  }),

  http.delete(endpoint("/saved/:id"), async ({ params }) => {
    await settle(160);
    const list = savedHackathons();
    const index = list.findIndex((entry) => entry.id === params.id);
    if (index === -1) return missing("Saved hackathon");
    list.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

const teamHandlers = [
  http.get(endpoint("/teams/mine"), async () => {
    await settle(110);
    const mine = teams()
      .filter((team) => isTeamMember(team, CURRENT_USER_ID))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return ok({ items: mine.map(teamForApi), total: mine.length });
  }),

  http.get(endpoint("/teams"), async ({ request }) => {
    await settle(140);
    const params = new URL(request.url).searchParams;
    const hackathonId = params.get("hackathonId");
    if (!hackathonId) return fail("hackathonId is required");
    const page = Math.max(Number(params.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 50);
    const status = params.get("status");
    const list = teams()
      .filter((team) => team.hackathon === hackathonId)
      .filter((team) => !status || teamForApi(team).status === status)
      .sort((a, b) => teamForApi(b).openSlots - teamForApi(a).openSlots);
    return ok({
      items: list.slice((page - 1) * limit, page * limit).map(teamForApi),
      total: list.length,
      page,
      limit,
    });
  }),

  http.post(endpoint("/teams"), async ({ request }) => {
    await settle(320);
    const input = await body(request);
    const name = String(input.name || "").trim();
    if (name.length < 3 || name.length > 80) {
      return fail("Give the crew a name between three and eighty characters");
    }
    if (!findHackathon(input.hackathonId)) return fail("Choose a valid hackathon");
    if (
      teams().some(
        (team) =>
          team.hackathon === input.hackathonId &&
          team.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return fail("A crew with that name already exists in this hackathon", 409, "DUPLICATE_NAME");
    }
    const maxTeamSize = Math.min(Math.max(Number(input.maxTeamSize) || 4, 2), 10);
    if (!Array.isArray(input.rolesNeeded) || input.rolesNeeded.length > 10) {
      return fail("A crew can list at most ten roles");
    }
    const team = {
      id: newId("team"),
      name,
      description: String(input.description || "").slice(0, 500),
      hackathon: input.hackathonId,
      leader: CURRENT_USER_ID,
      members: [],
      rolesNeeded: input.rolesNeeded.map((role) => String(role).trim()).filter(Boolean),
      maxTeamSize,
      status: "open",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    teams().push(team);
    return ok(teamForApi(team), 201);
  }),

  http.get(endpoint("/teams/:id"), async ({ params }) => {
    await settle(110);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    return ok(teamForApi(team));
  }),

  http.patch(endpoint("/teams/:id"), async ({ params, request }) => {
    await settle(280);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    if (team.leader !== CURRENT_USER_ID) {
      return fail("Only the team leader can edit this crew", 403, "TEAM_FORBIDDEN");
    }
    const input = await body(request);
    const size = 1 + team.members.length;
    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (name.length < 3 || name.length > 80) {
        return fail("Give the crew a name between three and eighty characters");
      }
      team.name = name;
    }
    if (input.description !== undefined) {
      team.description = String(input.description).slice(0, 500);
    }
    if (Array.isArray(input.rolesNeeded)) {
      if (input.rolesNeeded.length > 10) return fail("A crew can list at most ten roles");
      team.rolesNeeded = input.rolesNeeded.map((role) => String(role).trim()).filter(Boolean);
    }
    if (input.maxTeamSize !== undefined) {
      const maxTeamSize = Number(input.maxTeamSize);
      if (!Number.isFinite(maxTeamSize) || maxTeamSize < size || maxTeamSize > 10) {
        return fail(`Keep the seat count between ${size} and ten`);
      }
      team.maxTeamSize = maxTeamSize;
    }
    if (input.status !== undefined) {
      if (!["open", "closed"].includes(input.status)) {
        return fail("status must be open or closed");
      }
      if (input.status === "open" && size >= team.maxTeamSize) {
        return fail("Open a seat before reopening requests", 409, "TEAM_FULL");
      }
      team.status = input.status;
      if (input.status === "closed") cancelPendingForTeam(team.id);
    }
    team.updatedAt = nowIso();
    return ok(teamForApi(team));
  }),

  http.delete(endpoint("/teams/:id"), async ({ params }) => {
    await settle(260);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    if (team.leader !== CURRENT_USER_ID) {
      return fail("Only the team leader can disband this crew", 403, "TEAM_FORBIDDEN");
    }
    const index = teams().indexOf(team);
    teams().splice(index, 1);
    for (let cursor = requests().length - 1; cursor >= 0; cursor -= 1) {
      if (requests()[cursor].team === team.id) requests().splice(cursor, 1);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(endpoint("/teams/:id/leader"), async ({ params, request }) => {
    await settle(280);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    if (team.leader !== CURRENT_USER_ID) {
      return fail("Only the team leader can transfer leadership", 403, "TEAM_FORBIDDEN");
    }
    const input = await body(request);
    const target = team.members.find((member) => member.user === input.userId);
    if (!target) return fail("Select a current member of this crew");
    const previousLeader = team.leader;
    team.members = team.members.filter((member) => member.user !== input.userId);
    team.members.push({ user: previousLeader, role: "Member", joinedAt: nowIso() });
    team.leader = input.userId;
    team.updatedAt = nowIso();
    addNotification({
      type: "leader_changed",
      title: `${findUser(input.userId)?.name || "A builder"} now leads ${team.name}`,
      message: "The crew has a new captain. Responsibilities moved with the title.",
      data: { teamId: team.id },
    });
    return ok(teamForApi(team));
  }),

  http.delete(endpoint("/teams/:id/members/:userId"), async ({ params }) => {
    await settle(240);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    if (params.userId === team.leader) {
      return fail("The leader must transfer leadership or disband the crew", 409, "LEADER_CANNOT_LEAVE");
    }
    const canManage =
      team.leader === CURRENT_USER_ID || params.userId === CURRENT_USER_ID;
    if (!canManage) {
      return fail("Only the leader or the member can do that", 403, "TEAM_FORBIDDEN");
    }
    const index = team.members.findIndex((member) => member.user === params.userId);
    if (index < 0) return missing("Member");
    team.members.splice(index, 1);
    team.updatedAt = nowIso();
    return ok(teamForApi(team));
  }),

  http.get(endpoint("/teams/:id/requests"), async ({ params, request }) => {
    await settle(120);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    if (team.leader !== CURRENT_USER_ID) {
      return fail("Only the team leader can view requests", 403, "TEAM_FORBIDDEN");
    }
    const type = new URL(request.url).searchParams.get("type") || "request";
    if (!["request", "invite"].includes(type)) return fail("type must be request or invite");
    const items = requests()
      .filter(
        (entry) => entry.team === team.id && entry.type === type && entry.status === "pending"
      )
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map(requestForApi);
    return ok({ items, total: items.length });
  }),

  http.get(endpoint("/teams/:id/invitations"), async ({ params }) => {
    await settle(100);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    if (team.leader !== CURRENT_USER_ID) {
      return fail("Only the team leader can view invitations", 403, "TEAM_FORBIDDEN");
    }
    const items = requests()
      .filter(
        (entry) => entry.team === team.id && entry.type === "invite" && entry.status === "pending"
      )
      .map(requestForApi);
    return ok({ items, total: items.length });
  }),

  http.post(endpoint("/teams/:id/requests"), async ({ params, request }) => {
    await settle(280);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    const me = currentUser();
    if (isTeamMember(team, me.id)) {
      return fail("You are already part of this crew", 409, "ALREADY_MEMBER");
    }
    if (teamForApi(team).status !== "open" || teamForApi(team).openSlots < 1) {
      return fail("This crew is not taking requests right now", 409, "TEAM_CLOSED");
    }
    const duplicate = requests().find(
      (entry) =>
        entry.team === team.id &&
        entry.user === me.id &&
        entry.type === "request" &&
        entry.status === "pending"
    );
    if (duplicate) {
      return fail("Your request is already on the leader's wire", 409, "REQUEST_EXISTS");
    }
    const input = await body(request);
    const entry = {
      id: newId("req"),
      team: team.id,
      user: me.id,
      type: "request",
      initiatedBy: me.id,
      role: String(input.role || team.rolesNeeded[0] || "member").slice(0, 60),
      message: String(input.message || "").slice(0, 500),
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * DAY).toISOString(),
      respondedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    requests().push(entry);
    return ok(requestForApi(entry), 201);
  }),

  http.post(endpoint("/teams/:id/invitations"), async ({ params, request }) => {
    await settle(280);
    const team = findTeam(params.id);
    if (!team) return missing("Team");
    if (team.leader !== CURRENT_USER_ID) {
      return fail("Only the team leader can invite builders", 403, "TEAM_FORBIDDEN");
    }
    const input = await body(request);
    const target = findUser(input.userId);
    if (!target) return missing("Builder");
    if (isTeamMember(team, target.id)) {
      return fail("That builder is already in the crew", 409, "ALREADY_MEMBER");
    }
    if (teamForApi(team).status !== "open" || teamForApi(team).openSlots < 1) {
      return fail("This crew has no open seats", 409, "TEAM_FULL");
    }
    const duplicate = requests().find(
      (entry) =>
        entry.team === team.id &&
        entry.user === target.id &&
        entry.status === "pending"
    );
    if (duplicate) {
      return fail("There is already a pending invitation or request for that builder", 409, "REQUEST_EXISTS");
    }
    const entry = {
      id: newId("req"),
      team: team.id,
      user: target.id,
      type: "invite",
      initiatedBy: CURRENT_USER_ID,
      role: String(input.role || team.rolesNeeded[0] || "member").slice(0, 60),
      message: String(input.message || "").slice(0, 500),
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * DAY).toISOString(),
      respondedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    requests().push(entry);
    return ok(requestForApi(entry), 201);
  }),
];

// ---------------------------------------------------------------------------
// The wire
// ---------------------------------------------------------------------------

const requestHandlers = [
  http.get(endpoint("/team-requests/mine"), async ({ request }) => {
    await settle(130);
    const params = new URL(request.url).searchParams;
    const page = Math.max(Number(params.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 100);
    const status = params.get("status");

    const items = requests()
      .filter((entry) => {
        const own = entry.user === CURRENT_USER_ID || entry.initiatedBy === CURRENT_USER_ID;
        const team = findTeam(entry.team);
        const forMyTeam =
          entry.type === "request" && team?.leader === CURRENT_USER_ID;
        return own || forMyTeam;
      })
      .filter((entry) => !status || entry.status === status)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return ok({
      items: items.slice((page - 1) * limit, page * limit).map(requestForApi),
      total: items.length,
      page,
      limit,
    });
  }),

  http.patch(endpoint("/team-requests/:id"), async ({ params, request }) => {
    await settle(260);
    const entry = findRequest(params.id);
    if (!entry) return missing("Request");
    if (isExpired(entry) && entry.status === "pending") {
      entry.status = "expired";
      entry.respondedAt = nowIso();
      entry.updatedAt = nowIso();
      return fail("This request has expired", 410, "REQUEST_EXPIRED");
    }
    if (entry.status !== "pending") {
      return fail(`This request is already ${entry.status}`, 409, "REQUEST_NOT_PENDING");
    }
    const team = findTeam(entry.team);
    if (!team) return missing("Team");
    if (entry.type === "request" && team.leader !== CURRENT_USER_ID) {
      return fail("Only the team leader can respond to join requests", 403, "FORBIDDEN");
    }
    if (entry.type === "invite" && entry.user !== CURRENT_USER_ID) {
      return fail("Only the invited builder can respond to this invitation", 403, "FORBIDDEN");
    }

    const input = await body(request);
    if (!["accept", "decline"].includes(input.action)) {
      return fail("action must be accept or decline");
    }

    if (input.action === "decline") {
      entry.status = "declined";
      entry.respondedAt = nowIso();
      entry.updatedAt = nowIso();
      return ok(requestForApi(entry));
    }

    if (teamForApi(team).status !== "open" || teamForApi(team).openSlots < 1) {
      return fail("This crew no longer has an open seat", 409, "TEAM_FULL");
    }

    const joiningUser = entry.type === "request" ? entry.user : CURRENT_USER_ID;
    if (!isTeamMember(team, joiningUser)) {
      team.members.push({
        user: joiningUser,
        role: entry.role || "member",
        joinedAt: nowIso(),
      });
      if (teamForApi(team).openSlots === 0) {
        team.status = "closed";
        cancelPendingForTeam(team.id, entry.id);
      }
      // The demo inbox belongs to Asha. Only surface a notification when she
      // is the one who joined; a leader accepting a request notifies someone
      // else, which is outside this single-inbox fixture.
      if (joiningUser === CURRENT_USER_ID) {
        addNotification({
          type: "request_accepted",
          title: `You joined ${team.name}`,
          message: "The crew is now on your team board.",
          data: { teamId: team.id },
        });
      }
    }

    entry.status = "accepted";
    entry.respondedAt = nowIso();
    entry.updatedAt = nowIso();
    team.updatedAt = nowIso();
    return ok(requestForApi(entry));
  }),

  http.delete(endpoint("/team-requests/:id"), async ({ params }) => {
    await settle(220);
    const entry = findRequest(params.id);
    if (!entry) return missing("Request");
    if (entry.initiatedBy !== CURRENT_USER_ID) {
      return fail("Only the sender can withdraw this request", 403, "FORBIDDEN");
    }
    if (entry.status !== "pending") {
      return fail(`This request is already ${entry.status}`, 409, "REQUEST_NOT_PENDING");
    }
    entry.status = "cancelled";
    entry.respondedAt = nowIso();
    entry.updatedAt = nowIso();
    return ok(requestForApi(entry));
  }),
];

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const notificationHandlers = [
  http.get(endpoint("/notifications"), async ({ request }) => {
    await settle(80);
    const params = new URL(request.url).searchParams;
    const limit = Math.min(Math.max(Number(params.get("limit")) || 10, 1), 50);
    const unreadOnly = params.get("unreadOnly") === "true";
    const all = notifications()
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const items = (unreadOnly ? all.filter((entry) => !entry.read) : all)
      .slice(0, limit)
      .map(notificationForApi);
    return ok({
      items,
      unread: all.filter((entry) => !entry.read).length,
      total: all.length,
    });
  }),

  http.patch(endpoint("/notifications/read-all"), async () => {
    await settle(160);
    for (const note of notifications()) note.read = true;
    return ok({ message: "All notifications marked read" });
  }),

  http.patch(endpoint("/notifications/:id/read"), async ({ params }) => {
    await settle(120);
    const note = notifications().find((entry) => entry.id === params.id);
    if (!note) return missing("Notification");
    note.read = true;
    return ok(notificationForApi(note));
  }),
];

export const handlers = [
  ...sessionHandlers,
  ...metadataHandlers,
  ...integrationHandlers,
  ...teamHandlers,
  ...requestHandlers,
  ...notificationHandlers,
];
