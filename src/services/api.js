const HACKATHON_BASE = import.meta.env.VITE_HACKATHON_API_BASE_URL || '';
const BOOKMARK_BASE = import.meta.env.VITE_BOOKMARK_API_BASE_URL || HACKATHON_BASE;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  if (response.status === 204) return null;
  return response.json();
}

// Replace endpoint paths only after confirming the backend contract with your teammates.
export const hackathonApi = {
  list: (query = '') => request(`${HACKATHON_BASE}/hackathons${query}`),
  getById: (id) => request(`${HACKATHON_BASE}/hackathons/${encodeURIComponent(id)}`),
};

export const bookmarkApi = {
  save: (id) => request(`${BOOKMARK_BASE}/bookmarks`, { method: 'POST', body: JSON.stringify({ hackathonId: id }) }),
  remove: (id) => request(`${BOOKMARK_BASE}/bookmarks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  notRelevant: (id) => request(`${BOOKMARK_BASE}/feedback`, { method: 'POST', body: JSON.stringify({ hackathonId: id, feedback: 'not_relevant' }) }),
};
