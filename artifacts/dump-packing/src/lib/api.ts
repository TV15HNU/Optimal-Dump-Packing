const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  trucks: {
    list: () => apiFetch("/api/v1/trucks"),
    save: (truck: any) => apiFetch("/api/v1/trucks", { method: "POST", body: JSON.stringify(truck) }),
    remove: (id: string) => apiFetch(`/api/v1/trucks/${id}`, { method: "DELETE" }),
  },
  sites: {
    list: () => apiFetch("/api/v1/sites"),
    get: (id: string) => apiFetch(`/api/v1/sites/${id}`),
    save: (site: any) => apiFetch("/api/v1/sites", { method: "POST", body: JSON.stringify(site) }),
    updateStatus: (id: string, status: string) =>
      apiFetch(`/api/v1/sites/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    delete: (id: string) => apiFetch(`/api/v1/sites/${id}`, { method: "DELETE" }),
    updateProgress: (id: string, spotId: number, done: boolean, driverId?: string) =>
      apiFetch(`/api/v1/sites/${id}/progress`, { method: "POST", body: JSON.stringify({ spotId, done, driverId }) }),
    driverView: (id: string) => apiFetch(`/api/v1/sites/${id}/driver-view`),
  },
};
