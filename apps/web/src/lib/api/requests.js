import { api } from "./http";
import { normalizeRequest } from "./contracts";

export async function listMyRequests({ status, page = 1, limit = 50 } = {}, { signal } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  const data = await api.get(`/team-requests/mine?${params.toString()}`, { signal });
  return {
    items: (data?.items || []).map(normalizeRequest),
    total: Number(data?.total) || 0,
  };
}

export async function respondToRequest(id, action) {
  return normalizeRequest(await api.patch(`/team-requests/${encodeURIComponent(id)}`, { action }));
}

export async function cancelRequest(id) {
  return normalizeRequest(await api.delete(`/team-requests/${encodeURIComponent(id)}`));
}
