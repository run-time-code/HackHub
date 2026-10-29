import { useQueries } from "@tanstack/react-query";
import { getPublicProfile } from "../api/users";
import { queryKeys } from "../queryClient";

/**
 * Hydrates the `members[].user` ids returned by the team API into public
 * profiles. Deduplicated by the caller; capped here to keep a crowded team
 * board from fanning out into dozens of requests.
 */
export function useUserProfiles(ids = []) {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 24);
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: queryKeys.publicProfile(id),
      queryFn: ({ signal }) => getPublicProfile(id, { signal }),
      staleTime: 5 * 60_000,
    })),
  });

  const profiles = {};
  unique.forEach((id, index) => {
    if (results[index]?.data) profiles[id] = results[index].data;
  });

  return {
    profiles,
    isLoading: results.some((result) => result.isLoading),
  };
}
