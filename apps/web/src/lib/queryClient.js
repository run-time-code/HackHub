import { QueryClient } from "@tanstack/react-query";

/**
 * One cache for the whole app. Five minutes of freshness keeps navigation
 * snappy without making a leader's accept/decline feel stale: mutations
 * invalidate the keys they touch explicitly.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => {
        if ([400, 401, 403, 404, 409, 410, 429].includes(error?.status)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  profile: ["profile", "me"],
  publicProfile: (id) => ["profile", "public", id],
  profileBatch: (ids) => ["profile", "batch", [...ids].sort().join(",")],
  skills: ["skills", "taxonomy"],
  stats: ["platform", "stats"],
  dashboard: ["dashboard", "summary"],
  hackathons: (filters = {}) => ["hackathons", filters],
  teammates: (filters = {}) => ["users", "discover", filters],
  myTeams: ["teams", "mine"],
  teams: (filters = {}) => ["teams", "list", filters],
  team: (id) => ["teams", "detail", id],
  teamRequests: (id) => ["teams", "requests", id],
  teamInvitations: (id) => ["teams", "invitations", id],
  myRequests: (filters = {}) => ["team-requests", "mine", filters],
  notifications: ["notifications"],
};
