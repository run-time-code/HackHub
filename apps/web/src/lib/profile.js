import {
  Award,
  CalendarClock,
  Code2,
  Compass,
  Handshake,
  Languages,
  Sparkles,
} from "lucide-react";

const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

export const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export function skillLevel(value) {
  const index = LEVELS.indexOf(String(value || "").toLowerCase());
  return index >= 0 ? index : 1;
}

export function profileChecklist(profile) {
  const links = profile?.links || {};
  const items = [
    {
      key: "identity",
      label: "Add your name and one-line headline",
      to: "/profile#identity",
      done: Boolean(profile?.name && profile?.headline),
    },
    {
      key: "story",
      label: "Write a bio of at least 40 characters",
      to: "/profile#story",
      done: String(profile?.bio || "").trim().length >= 40,
    },
    {
      key: "skills",
      label: "Choose at least three skills",
      to: "/profile#skills",
      done: (profile?.skills || []).length >= 3,
    },
    {
      key: "links",
      label: "Link one place people can see your work",
      to: "/profile#links",
      done: Boolean(links.github || links.linkedin || links.portfolio),
    },
    {
      key: "history",
      label: "Add a past build or hackathon",
      to: "/profile#history",
      done: (profile?.pastHackathons || []).length > 0,
    },
    {
      key: "visibility",
      label: "Turn on discovery when you are ready",
      to: "/profile#visibility",
      done: Boolean(profile?.discoverable),
    },
  ];
  const done = items.filter((item) => item.done).length;
  return {
    items,
    done,
    total: items.length,
    percent: Math.round((done / items.length) * 100),
  };
}

export function publicProfileBadges(profile) {
  if (!profile) return [];
  const badges = [];
  const created = profile.createdAt ? new Date(profile.createdAt) : null;
  const ageInDays =
    created && !Number.isNaN(created.getTime())
      ? Math.floor((Date.now() - created.getTime()) / 86_400_000)
      : null;

  if (ageInDays !== null && ageInDays <= 120) {
    badges.push({
      key: "early",
      icon: Sparkles,
      title: "Early builder",
      copy: "Joined while the field guide is still being written.",
    });
  }
  if (profile.pastHackathons?.length) {
    badges.push({
      key: "shipped",
      icon: Award,
      title: "Shipped",
      copy: `${profile.pastHackathons.length} past ${profile.pastHackathons.length === 1 ? "build" : "builds"} on the record.`,
    });
  }
  if ((profile.skills || []).length >= 6) {
    badges.push({
      key: "polyglot",
      icon: Languages,
      title: "Polyglot",
      copy: "Comfortable across six or more tools.",
    });
  }
  if (profile.lookingForTeam) {
    badges.push({
      key: "open",
      icon: Handshake,
      title: "Team player",
      copy: "Open to a crew and ready to be asked.",
    });
  }
  if (profile.location) {
    badges.push({
      key: "local",
      icon: Compass,
      title: "On the map",
      copy: `Building from ${profile.location}.`,
    });
  }
  if ((profile.pastHackathons || []).length >= 2 && (profile.skills || []).length >= 4) {
    badges.push({
      key: "reliable",
      icon: CalendarClock,
      title: "Repeat finisher",
      copy: "A record of showing up and shipping.",
    });
  }
  if ((profile.skills || []).length >= 3) {
    badges.push({
      key: "maker",
      icon: Code2,
      title: "Maker",
      copy: "A toolkit deep enough to start without waiting.",
    });
  }
  return badges.slice(0, 4);
}

export function profileLinkEntries(profile) {
  const links = profile?.links || {};
  return [
    { key: "github", label: "GitHub", value: links.github, icon: "github" },
    { key: "linkedin", label: "LinkedIn", value: links.linkedin, icon: "linkedin" },
    { key: "portfolio", label: "Portfolio", value: links.portfolio, icon: "globe" },
  ].filter((entry) => entry.value);
}

export function profileMeta(profile) {
  return [
    profile?.college,
    profile?.year ? `Class of ${profile.year}` : "",
    profile?.location,
  ].filter(Boolean);
}
