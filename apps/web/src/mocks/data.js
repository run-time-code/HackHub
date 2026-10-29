// Demo fixtures for the VITE_USE_MOCKS / --mode demo experience.
// Everything is in-memory and resets on a reload. The data is deliberately
// opinionated: a leader with requests waiting, an invite to answer, an
// outgoing request, and enough history to exercise every wire tab.

const NOW = Date.now();
const DAY = 86_400_000;

function iso(offsetDays, offsetHours = 0) {
  return new Date(NOW + offsetDays * DAY + offsetHours * 3_600_000).toISOString();
}

function avatar(initials, background, foreground = "#fbf7ef") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="0" fill="${background}"/><circle cx="150" cy="42" r="52" fill="${foreground}" opacity=".13"/><text x="96" y="116" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="70" fill="${foreground}">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const CURRENT_USER_ID = "user-asha";

export const DEMO_USERS = [
  {
    id: CURRENT_USER_ID,
    name: "Asha Raman",
    email: "asha@hackhub.demo",
    role: "user",
    headline: "Full-stack builder turning messy data into quiet interfaces.",
    bio: "I build the unglamorous middle of a product: APIs that make sense, interfaces that stay out of the way, and maps that help people decide where to go next. Looking for a crew that cares about the last ten percent.",
    college: "IIT Madras",
    location: "Chennai, India",
    year: "Final year",
    links: {
      github: "https://github.com/asha-raman",
      linkedin: "https://linkedin.com/in/asha-raman",
      portfolio: "https://asha.build",
    },
    pastHackathons: [
      { name: "Floodline", year: "2025", projectUrl: "https://asha.build/floodline" },
      { name: "Night Bus", year: "2024", projectUrl: "https://asha.build/night-bus" },
    ],
    skills: ["React", "Node.js", "JavaScript", "CSS", "Machine Learning"],
    skillProficiency: {
      React: "advanced",
      "Node.js": "advanced",
      JavaScript: "expert",
      CSS: "intermediate",
      "Machine Learning": "beginner",
    },
    preferences: {
      interests: ["AI / Machine Learning", "Climate", "Civic Tech"],
      preferredMode: "hybrid",
    },
    avatarUrl: avatar("AR", "#1f3b34"),
    availability: "available",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-68),
    updatedAt: iso(-1, -4),
  },
  {
    id: "user-maya",
    name: "Maya Chen",
    email: "maya@hackhub.demo",
    role: "user",
    headline: "Product designer for systems that need to explain themselves.",
    bio: "I map the whole system before I move a single pixel. Most of my work lives at the intersection of public services, maps and the small moments that make a tool feel human.",
    college: "NID Ahmedabad",
    location: "Ahmedabad, India",
    year: "4th year",
    links: {
      github: "https://github.com/maya-chen",
      linkedin: "https://linkedin.com/in/maya-chen",
      portfolio: "https://mayachen.design",
    },
    pastHackathons: [
      { name: "Civic Signals", year: "2025", projectUrl: "https://mayachen.design/civic-signals" },
    ],
    skills: ["CSS", "HTML", "React", "UI/UX Design", "Figma"],
    skillProficiency: {
      CSS: "expert",
      HTML: "advanced",
      React: "intermediate",
      "UI/UX Design": "expert",
      Figma: "expert",
    },
    preferences: {
      interests: ["Civic Tech", "Design Systems", "Education"],
      preferredMode: "hybrid",
    },
    avatarUrl: avatar("MC", "#b34a2e"),
    availability: "available",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-96),
    updatedAt: iso(-2, -2),
  },
  {
    id: "user-kabir",
    name: "Kabir Shah",
    email: "kabir@hackhub.demo",
    role: "user",
    headline: "Backend engineer who likes boring databases and brave ideas.",
    bio: "I make systems hold up when the demo ends. Postgres, queues, auth and the kind of error handling nobody puts on a slide. Also a decent chai maker.",
    college: "BITS Pilani",
    location: "Bengaluru, India",
    year: "3rd year",
    links: {
      github: "https://github.com/kabir-shah",
      linkedin: "https://linkedin.com/in/kabir-shah",
      portfolio: "",
    },
    pastHackathons: [
      { name: "Ledgerline", year: "2025", projectUrl: "https://github.com/kabir-shah/ledgerline" },
      { name: "Queue Party", year: "2024", projectUrl: "https://github.com/kabir-shah/queue-party" },
    ],
    skills: ["Node.js", "PostgreSQL", "Docker", "Python", "AWS"],
    skillProficiency: {
      "Node.js": "expert",
      PostgreSQL: "advanced",
      Docker: "advanced",
      Python: "advanced",
      AWS: "intermediate",
    },
    preferences: {
      interests: ["Fintech", "Developer Tools", "AI / Machine Learning"],
      preferredMode: "online",
    },
    avatarUrl: avatar("KS", "#3e4a2f"),
    availability: "limited",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-142),
    updatedAt: iso(-4),
  },
  {
    id: "user-leila",
    name: "Leila Haddad",
    email: "leila@hackhub.demo",
    role: "user",
    headline: "ML engineer looking for problems with a human at the end.",
    bio: "Computer vision by training, careful product thinking by choice. I want to work on tools that make public information legible instead of adding another dashboard nobody opens.",
    college: "IIIT Hyderabad",
    location: "Hyderabad, India",
    year: "Final year",
    links: {
      github: "https://github.com/leila-haddad",
      linkedin: "https://linkedin.com/in/leila-haddad",
      portfolio: "https://leila.ml",
    },
    pastHackathons: [
      { name: "Seeing Signs", year: "2025", projectUrl: "https://leila.ml/seeing-signs" },
    ],
    skills: ["Python", "Machine Learning", "Deep Learning", "Computer Vision", "NLP"],
    skillProficiency: {
      Python: "expert",
      "Machine Learning": "advanced",
      "Deep Learning": "advanced",
      "Computer Vision": "advanced",
      NLP: "intermediate",
    },
    preferences: {
      interests: ["AI / Machine Learning", "Healthtech", "Civic Tech"],
      preferredMode: "hybrid",
    },
    avatarUrl: avatar("LH", "#2f5360"),
    availability: "available",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-211),
    updatedAt: iso(-1, -9),
  },
  {
    id: "user-rohan",
    name: "Rohan Iyer",
    email: "rohan@hackhub.demo",
    role: "user",
    headline: "Frontend developer chasing the feeling of a fast page.",
    bio: "I care about interaction detail, accessible components and the moment a prototype stops feeling like a prototype. Currently learning how to make maps behave on a phone.",
    college: "VIT Vellore",
    location: "Vellore, India",
    year: "3rd year",
    links: {
      github: "https://github.com/rohan-iyer",
      linkedin: "https://linkedin.com/in/rohan-iyer",
      portfolio: "https://rohan.codes",
    },
    pastHackathons: [],
    skills: ["JavaScript", "React", "CSS", "HTML"],
    skillProficiency: {
      JavaScript: "advanced",
      React: "advanced",
      CSS: "advanced",
      HTML: "advanced",
    },
    preferences: {
      interests: ["Developer Tools", "Climate", "Gaming"],
      preferredMode: "online",
    },
    avatarUrl: avatar("RI", "#8a4f2b"),
    availability: "limited",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-24),
    updatedAt: iso(-0, -3),
  },
  {
    id: "user-noor",
    name: "Noor Fatima",
    email: "noor@hackhub.demo",
    role: "user",
    headline: "Full-stack generalist with a soft spot for the data layer.",
    bio: "I like taking an idea from a sketch to a working endpoint. Happiest when a crew needs someone to connect the pieces, write the docs and keep the demo alive.",
    college: "Jamia Millia Islamia",
    location: "New Delhi, India",
    year: "Final year",
    links: {
      github: "https://github.com/noor-fatima",
      linkedin: "https://linkedin.com/in/noor-fatima",
      portfolio: "",
    },
    pastHackathons: [
      { name: "Open Ward", year: "2024", projectUrl: "https://github.com/noor-fatima/open-ward" },
    ],
    skills: ["MongoDB", "Node.js", "JavaScript", "React", "PostgreSQL"],
    skillProficiency: {
      MongoDB: "advanced",
      "Node.js": "advanced",
      JavaScript: "expert",
      React: "intermediate",
      PostgreSQL: "intermediate",
    },
    preferences: {
      interests: ["Healthtech", "Civic Tech", "Education"],
      preferredMode: "offline",
    },
    avatarUrl: avatar("NF", "#5c3a55"),
    availability: "available",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-113),
    updatedAt: iso(-3),
  },
  {
    id: "user-tara",
    name: "Tara Menon",
    email: "tara@hackhub.demo",
    role: "user",
    headline: "Cloud-minded engineer who likes the quiet parts of the stack.",
    bio: "Infrastructure, reliability and the small scripts that save a team at 3am. I want to build things that keep working after the judges leave the room.",
    college: "NIT Trichy",
    location: "Trichy, India",
    year: "4th year",
    links: {
      github: "https://github.com/tara-menon",
      linkedin: "https://linkedin.com/in/tara-menon",
      portfolio: "",
    },
    pastHackathons: [{ name: "Uptime Club", year: "2025", projectUrl: "" }],
    skills: ["Java", "AWS", "Docker", "Kubernetes", "MySQL"],
    skillProficiency: {
      Java: "advanced",
      AWS: "advanced",
      Docker: "advanced",
      Kubernetes: "intermediate",
      MySQL: "advanced",
    },
    preferences: {
      interests: ["Fintech", "Developer Tools", "Cybersecurity"],
      preferredMode: "hybrid",
    },
    avatarUrl: avatar("TM", "#4b425f"),
    availability: "limited",
    // Kept discoverable but not looking so the finder's "Open to teams"
    // toggle has a meaningful result on both sides.
    lookingForTeam: false,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-156),
    updatedAt: iso(-6),
  },
  {
    id: "user-zoya",
    name: "Zoya Khan",
    email: "zoya@hackhub.demo",
    role: "user",
    headline: "Interaction designer making public tools feel less public-sector.",
    bio: "I prototype in the browser and test with real people. Interested in forms, wayfinding and the ethics of making a complicated service feel simple.",
    college: "Srishti Manipal",
    location: "Bengaluru, India",
    year: "3rd year",
    links: {
      github: "https://github.com/zoya-khan",
      linkedin: "https://linkedin.com/in/zoya-khan",
      portfolio: "https://zoyakhan.studio",
    },
    pastHackathons: [
      { name: "Form / Field", year: "2025", projectUrl: "https://zoyakhan.studio/form-field" },
    ],
    skills: ["UI/UX Design", "HTML", "CSS", "React"],
    skillProficiency: {
      "UI/UX Design": "expert",
      HTML: "advanced",
      CSS: "advanced",
      React: "beginner",
    },
    preferences: {
      interests: ["Civic Tech", "Design Systems", "Accessibility"],
      preferredMode: "online",
    },
    avatarUrl: avatar("ZK", "#8c6b24"),
    availability: "available",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-39),
    updatedAt: iso(-1, -1),
  },
  {
    id: "user-ishaan",
    name: "Ishaan Rao",
    email: "ishaan@hackhub.demo",
    role: "user",
    headline: "Mobile builder who ships before the coffee gets cold.",
    bio: "Android and React Native, with a habit of building the smallest thing that can be tested. Looking for a team that wants to put something in real hands.",
    college: "PES University",
    location: "Bengaluru, India",
    year: "2nd year",
    links: {
      github: "https://github.com/ishaan-rao",
      linkedin: "",
      portfolio: "https://ishaan.app",
    },
    pastHackathons: [],
    skills: ["Java", "C++", "Python", "React Native", "JavaScript"],
    skillProficiency: {
      Java: "intermediate",
      "C++": "intermediate",
      Python: "beginner",
      "React Native": "advanced",
      JavaScript: "intermediate",
    },
    preferences: {
      interests: ["Gaming", "Education", "Healthtech"],
      preferredMode: "offline",
    },
    avatarUrl: avatar("IR", "#314b5b"),
    availability: "available",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-18),
    updatedAt: iso(-0, -7),
  },
  {
    id: "user-dev",
    name: "Dev Patel",
    email: "dev@hackhub.demo",
    role: "user",
    headline: "Data person who would rather show one honest chart than ten.",
    bio: "I turn messy public data into a small number of decisions. Python notebooks by night, production dashboards by day, and a long-running argument with spreadsheets.",
    college: "IIT Bombay",
    location: "Mumbai, India",
    year: "Final year",
    links: {
      github: "https://github.com/dev-patel",
      linkedin: "https://linkedin.com/in/dev-patel",
      portfolio: "https://devpatel.data",
    },
    pastHackathons: [
      { name: "Signal / Noise", year: "2024", projectUrl: "https://devpatel.data/signal-noise" },
    ],
    skills: ["Python", "Machine Learning", "NLP", "MySQL", "JavaScript"],
    skillProficiency: {
      Python: "expert",
      "Machine Learning": "advanced",
      NLP: "intermediate",
      MySQL: "advanced",
      JavaScript: "beginner",
    },
    preferences: {
      interests: ["AI / Machine Learning", "Civic Tech", "Climate"],
      preferredMode: "hybrid",
    },
    avatarUrl: avatar("DP", "#6a442f"),
    availability: "available",
    lookingForTeam: true,
    discoverable: true,
    emailVerified: true,
    createdAt: iso(-187),
    updatedAt: iso(-2),
  },
];

export const DEMO_HACKATHONS = [
  {
    id: "hack-monsoon",
    slug: "monsoon-build-weekend",
    title: "Monsoon Build Weekend",
    registrationDeadline: iso(12),
    submissionDeadline: iso(15),
    startsAt: iso(16),
    isActive: true,
    isFeatured: true,
    location: "Chennai + remote",
    theme: "Cities that hold up when it pours.",
    organizer: "Coastal Labs",
    mode: "HYBRID",
    prizePool: "₹1,50,000",
    skills: ["React", "Node.js", "Maps"],
    domains: ["Civic tech", "Climate"],
    url: "https://example.com/monsoon-build-weekend",
    description:
      "A flood-aware route planner for neighbourhoods, built in one monsoon-soaked weekend.",
  },
  {
    id: "hack-civic",
    slug: "ai-for-civic-good",
    title: "AI for Civic Good",
    registrationDeadline: iso(31),
    submissionDeadline: iso(36),
    startsAt: iso(38),
    isActive: true,
    isFeatured: false,
    location: "Online",
    theme: "Make public information useful.",
    organizer: "Civic Stack",
    mode: "ONLINE",
    prizePool: "$5,000",
    skills: ["Python", "NLP"],
    domains: ["AI", "GovTech"],
    url: "https://example.com/ai-for-civic-good",
    description:
      "Turn public records into tools people can actually read, search and act on.",
  },
  {
    id: "hack-orbit",
    slug: "orbital-drift-sprint",
    title: "Orbital Drift Sprint",
    registrationDeadline: iso(64),
    submissionDeadline: iso(68),
    startsAt: iso(70),
    isActive: true,
    isFeatured: false,
    location: "Bengaluru",
    theme: "Small tools for a very large sky.",
    organizer: "Orbit Collective",
    mode: "OFFLINE",
    prizePool: "₹2,00,000",
    skills: ["C++", "Data", "Three.js"],
    domains: ["Space", "Simulation"],
    url: "https://example.com/orbital-drift-sprint",
    description:
      "A 48-hour sprint for tools that make orbital data legible to people on the ground.",
  },
  {
    id: "hack-harvest",
    slug: "hack-the-harvest",
    title: "Hack the Harvest",
    registrationDeadline: iso(-40),
    submissionDeadline: iso(-37),
    startsAt: iso(-35),
    isActive: false,
    isFeatured: false,
    location: "Pune",
    theme: "Food systems, from soil to shelf.",
    organizer: "Agri Guild",
    mode: "OFFLINE",
    prizePool: "₹75,000",
    skills: ["IoT", "React"],
    domains: ["AgriTech"],
    url: "https://example.com/hack-the-harvest",
    description:
      "Food systems, from soil to shelf. A past edition kept for the archive.",
  },
];

export const DEMO_TEAMS = [
  {
    id: "team-paper-kites",
    name: "Paper Kites",
    description:
      "A flood-aware route planner that tells a neighbourhood which streets are passable and which bus is still running. We are building the map people wish existed at 2am.",
    hackathon: "hack-monsoon",
    leader: CURRENT_USER_ID,
    members: [
      { user: "user-maya", role: "Product design", joinedAt: iso(-11) },
      { user: "user-noor", role: "Backend", joinedAt: iso(-9) },
    ],
    rolesNeeded: ["Frontend", "Data"],
    maxTeamSize: 5,
    createdAt: iso(-14),
    updatedAt: iso(-1),
  },
  {
    id: "team-signal-garden",
    name: "Signal Garden",
    description:
      "Turning neighbourhood noise complaints into a public map that city planners can actually use. We have the model; now we need the interface and the story.",
    hackathon: "hack-civic",
    leader: "user-leila",
    members: [
      { user: CURRENT_USER_ID, role: "Frontend", joinedAt: iso(-8) },
      { user: "user-dev", role: "Data", joinedAt: iso(-7) },
    ],
    rolesNeeded: ["Product"],
    maxTeamSize: 4,
    createdAt: iso(-20),
    updatedAt: iso(-3),
  },
  {
    id: "team-northstar",
    name: "Northstar",
    description:
      "A volunteer dispatch tool for community kitchens during extreme weather. Fewer group chats, more meals delivered to the right door.",
    hackathon: "hack-monsoon",
    leader: "user-kabir",
    members: [
      { user: "user-tara", role: "Infrastructure", joinedAt: iso(-10) },
      { user: "user-ishaan", role: "Mobile", joinedAt: iso(-8) },
    ],
    rolesNeeded: ["Designer", "ML engineer"],
    maxTeamSize: 5,
    createdAt: iso(-16),
    updatedAt: iso(-2),
  },
  {
    id: "team-atlas",
    name: "Atlas of Small Things",
    description:
      "A living map of the small businesses that keep a neighbourhood alive. Built for the people who walk it, not just the people who study it.",
    hackathon: "hack-civic",
    leader: "user-maya",
    members: [{ user: "user-zoya", role: "Interaction design", joinedAt: iso(-5) }],
    rolesNeeded: ["Frontend", "Data"],
    maxTeamSize: 4,
    createdAt: iso(-9),
    updatedAt: iso(-1, -4),
  },
  {
    id: "team-loom",
    name: "Loom",
    description:
      "A shared rehearsal space for student theatre groups. Scheduling, scripts and a lighting board that does not require an electrician.",
    hackathon: "hack-monsoon",
    leader: "user-zoya",
    members: [
      { user: "user-tara", role: "Backend", joinedAt: iso(-12) },
      { user: "user-rohan", role: "Frontend", joinedAt: iso(-12) },
      { user: "user-ishaan", role: "Mobile", joinedAt: iso(-11) },
    ],
    rolesNeeded: [],
    maxTeamSize: 4,
    status: "closed",
    createdAt: iso(-22),
    updatedAt: iso(-4),
  },
  {
    id: "team-quiet-hours",
    name: "Quiet Hours",
    description:
      "A wearable-first way to find a calm room on a loud campus. Maps sound, not just space, and asks before it shares anything.",
    hackathon: "hack-civic",
    leader: "user-dev",
    members: [{ user: "user-maya", role: "Design", joinedAt: iso(-4) }],
    rolesNeeded: ["Hardware", "Frontend"],
    maxTeamSize: 3,
    createdAt: iso(-7),
    updatedAt: iso(-0, -5),
  },
];

export const DEMO_REQUESTS = [
  {
    id: "req-rohan-paper",
    team: "team-paper-kites",
    user: "user-rohan",
    type: "request",
    initiatedBy: "user-rohan",
    role: "Frontend",
    message:
      "I have been prototyping the same flood-map idea for a week. My maps are fast but ugly; I would love to make yours fast and legible.",
    status: "pending",
    expiresAt: iso(5),
    respondedAt: null,
    createdAt: iso(-1, -3),
    updatedAt: iso(-1, -3),
  },
  {
    id: "req-zoya-paper",
    team: "team-paper-kites",
    user: "user-zoya",
    type: "request",
    initiatedBy: "user-zoya",
    role: "Data",
    message:
      "I can help make the data trustworthy and the empty states feel designed. I have shipped two civic maps before.",
    status: "pending",
    expiresAt: iso(6),
    respondedAt: null,
    createdAt: iso(-0, -8),
    updatedAt: iso(-0, -8),
  },
  {
    id: "req-atlas-asha",
    team: "team-atlas",
    user: CURRENT_USER_ID,
    type: "invite",
    initiatedBy: "user-maya",
    role: "Frontend",
    message:
      "We need someone who can turn a map full of shopfronts into something that feels alive. Your Floodline work is exactly the energy.",
    status: "pending",
    expiresAt: iso(4),
    respondedAt: null,
    createdAt: iso(-2),
    updatedAt: iso(-2),
  },
  {
    id: "req-asha-northstar",
    team: "team-northstar",
    user: CURRENT_USER_ID,
    type: "request",
    initiatedBy: CURRENT_USER_ID,
    role: "Frontend",
    message:
      "The kitchen dispatch problem is close to my Floodline work. I can own the dashboard and the volunteer-facing map.",
    status: "pending",
    expiresAt: iso(6),
    respondedAt: null,
    createdAt: iso(-1, -1),
    updatedAt: iso(-1, -1),
  },
  {
    id: "req-asha-quiet",
    team: "team-quiet-hours",
    user: CURRENT_USER_ID,
    type: "request",
    initiatedBy: CURRENT_USER_ID,
    role: "Frontend",
    message: "I would love to help make the room map feel calm instead of clinical.",
    status: "declined",
    expiresAt: iso(-3),
    respondedAt: iso(-4),
    createdAt: iso(-10),
    updatedAt: iso(-4),
  },
  {
    id: "req-asha-loom",
    team: "team-loom",
    user: CURRENT_USER_ID,
    type: "request",
    initiatedBy: CURRENT_USER_ID,
    role: "Frontend",
    message: "I can help with the scheduling interface. I have a soft spot for backstage tools.",
    status: "cancelled",
    expiresAt: iso(1),
    respondedAt: null,
    createdAt: iso(-6),
    updatedAt: iso(-5),
  },
  {
    id: "req-asha-signal",
    team: "team-signal-garden",
    user: CURRENT_USER_ID,
    type: "request",
    initiatedBy: CURRENT_USER_ID,
    role: "Frontend",
    message: "The dashboard needs to feel like a conversation, not a spreadsheet. I can build that.",
    status: "accepted",
    expiresAt: iso(-1),
    respondedAt: iso(-8),
    createdAt: iso(-11),
    updatedAt: iso(-8),
  },
  {
    id: "req-invite-ishaan",
    team: "team-paper-kites",
    user: "user-ishaan",
    type: "invite",
    initiatedBy: CURRENT_USER_ID,
    role: "Frontend",
    message:
      "You ship small and fast, which is exactly what this map needs. We have two seats and a working prototype.",
    status: "pending",
    expiresAt: iso(5),
    respondedAt: null,
    createdAt: iso(-1, -5),
    updatedAt: iso(-1, -5),
  },
];

export const DEMO_NOTIFICATIONS = [
  {
    id: "note-rohan",
    type: "join_request",
    title: "Rohan wants to join Paper Kites",
    message: "A frontend builder with a soft spot for maps.",
    read: false,
    createdAt: iso(-1, -3),
    data: { teamId: "team-paper-kites" },
  },
  {
    id: "note-atlas",
    type: "team_invitation",
    title: "Atlas of Small Things invited you",
    message: "Maya left a seat open for a frontend builder.",
    read: false,
    createdAt: iso(-2),
    data: { teamId: "team-atlas" },
  },
  {
    id: "note-signal",
    type: "request_accepted",
    title: "Leila accepted your request",
    message: "Signal Garden is now on your team board.",
    read: false,
    createdAt: iso(-8),
    data: { teamId: "team-signal-garden" },
  },
  {
    id: "note-quiet",
    type: "request_declined",
    title: "Quiet Hours declined your request",
    message: "The seat was filled. The door stays open for the next one.",
    read: true,
    createdAt: iso(-4),
    data: { teamId: "team-quiet-hours" },
  },
];

export const DEMO_SKILL_TAXONOMY = {
  Programming: ["Python", "Java", "C++", "JavaScript"],
  "Web Development": ["React", "Node.js", "HTML", "CSS"],
  "AI / Machine Learning": ["Machine Learning", "Deep Learning", "NLP", "Computer Vision"],
  Database: ["MySQL", "PostgreSQL", "MongoDB"],
  "Cloud / DevOps": ["AWS", "Docker", "Kubernetes"],
};

export const DEMO_STATS = {
  hackathons: 42,
  teams: 386,
  builders: 1284,
  openTeams: 97,
  matches: 2741,
};

let liveUsers;
let liveTeams;
let liveRequests;
let liveNotifications;
let liveSaved;
let liveReminders;
let liveReminderPreferences;
let nextId = 1;

export function resetDemoState() {
  liveUsers = DEMO_USERS.map((user) => ({
    ...user,
    links: { ...user.links },
    pastHackathons: user.pastHackathons.map((entry) => ({ ...entry })),
    skills: [...user.skills],
    skillProficiency: { ...user.skillProficiency },
    preferences: { ...user.preferences, interests: [...user.preferences.interests] },
  }));
  liveTeams = DEMO_TEAMS.map((team) => ({
    ...team,
    members: team.members.map((member) => ({ ...member })),
    rolesNeeded: [...team.rolesNeeded],
  }));
  liveRequests = DEMO_REQUESTS.map((request) => ({ ...request }));
  liveNotifications = DEMO_NOTIFICATIONS.map((note) => ({
    ...note,
    data: { ...note.data },
  }));
  liveSaved = [
    {
      id: "saved-monsoon",
      hackathon: "hack-monsoon",
      status: "registered",
      notes: "Maya is on product. We need a data person before Friday.",
      createdAt: iso(-9),
      updatedAt: iso(-1),
    },
    {
      id: "saved-harvest",
      hackathon: "hack-harvest",
      status: "completed",
      notes: "Shipped the soil sensor dashboard. Archive the repo.",
      createdAt: iso(-52),
      updatedAt: iso(-31),
    },
  ];
  liveReminders = [
    {
      id: "reminder-monsoon",
      hackathon: "hack-monsoon",
      eventType: "registration",
      daysBefore: 3,
      channel: "email",
      remindAt: new Date(
        new Date(DEMO_HACKATHONS[0].registrationDeadline).getTime() - 3 * DAY
      ).toISOString(),
      createdAt: iso(-4),
      updatedAt: iso(-4),
    },
  ];
  liveReminderPreferences = {
    defaultDaysBefore: 3,
    channels: ["email"],
    quietHours: { start: "22:00", end: "08:00" },
  };
  nextId = 1;
}

resetDemoState();

export function users() {
  return liveUsers;
}

export function teams() {
  return liveTeams;
}

export function requests() {
  return liveRequests;
}

export function notifications() {
  return liveNotifications;
}

export function savedHackathons() {
  return liveSaved;
}

export function reminders() {
  return liveReminders;
}

export function reminderPreferences() {
  return liveReminderPreferences;
}

export function currentUser() {
  return liveUsers.find((user) => user.id === CURRENT_USER_ID);
}

export function findUser(id) {
  return liveUsers.find((user) => user.id === id) || null;
}

export function findTeam(id) {
  return liveTeams.find((team) => team.id === id) || null;
}

export function findHackathon(id) {
  return DEMO_HACKATHONS.find((hackathon) => hackathon.id === id) || null;
}

export function newId(prefix) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

export function hackathons() {
  return DEMO_HACKATHONS;
}
