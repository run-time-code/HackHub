import { api } from "./http";

export async function getPlatformStats({ signal } = {}) {
  const data = await api.get("/stats", { signal });
  return {
    hackathons: Number(data?.hackathons) || 0,
    teams: Number(data?.teams) || 0,
    builders: Number(data?.builders) || 0,
    openTeams: Number(data?.openTeams) || 0,
    matches: Number(data?.matches) || 0,
  };
}

export async function submitFeedback(values) {
  return api.post("/feedback", values);
}

export async function getDashboardSummary({ signal } = {}) {
  const data = await api.get("/dashboard/summary", { signal });
  const counts = { ongoing: 0, completed: 0 };
  for (const entry of data?.statusCounts || []) {
    if (entry?._id === "ongoing" || entry?._id === "completed") {
      counts[entry._id] = Number(entry.count) || 0;
    }
  }
  return {
    statusCounts: counts,
    upcomingDeadlines: Array.isArray(data?.upcomingDeadlines)
      ? data.upcomingDeadlines.map((entry) => ({
          hackathon: entry.hackathon || "",
          title: entry.title || "Saved hackathon",
          registrationDeadline: entry.registration_deadline || null,
        }))
      : [],
  };
}
