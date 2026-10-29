export const MAX_FINDER_SKILLS = 10;

/** Seed the finder with a short, stable excerpt of the signed-in card. */
export function initialFinderSkills(user) {
  const skills = Array.isArray(user?.skills) ? user.skills : [];
  return [...new Set(skills.filter((skill) => typeof skill === "string"))].slice(0, 5);
}

export function toggleFinderSkill(selected, skill, max = MAX_FINDER_SKILLS) {
  const current = Array.isArray(selected) ? selected : [];
  if (!skill) return current;
  if (current.includes(skill)) return current.filter((entry) => entry !== skill);
  if (current.length >= max) return current;
  return [...current, skill];
}

export function sortTeammates(items, sort = "match") {
  const list = [...items];
  if (sort === "recent") {
    return list.sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
  }
  if (sort === "name") {
    return list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }
  return list.sort(
    (a, b) =>
      (b.matchScore || 0) - (a.matchScore || 0) ||
      String(a.name).localeCompare(String(b.name))
  );
}

/** Discovery can include the viewer in non-demo environments; never render them. */
export function prepareTeammates(items, { currentUserId = "", sort = "match" } = {}) {
  return sortTeammates(
    (items || []).filter((person) => person?.id && person.id !== currentUserId),
    sort
  );
}
