const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function req(method, path, body, isFormData = false) {
  const opts = { method, headers: {} };
  if (body) {
    if (isFormData) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  meals: {
    list: () => req('GET', '/api/meals'),
    get: (id) => req('GET', `/api/meals/${id}`),
    create: (data) => req('POST', '/api/meals', data),
    update: (id, data) => req('PUT', `/api/meals/${id}`, data),
    delete: (id) => req('DELETE', `/api/meals/${id}`),
  },
  logs: {
    list: (from, to) => req('GET', `/api/meal-logs${from ? `?from=${from}&to=${to}` : ''}`),
    create: (formData) => req('POST', '/api/meal-logs', formData, true),
    delete: (id) => req('DELETE', `/api/meal-logs/${id}`),
  },
  nutrition: {
    summary: (from, to) => req('GET', `/api/nutrition/summary?from=${from}&to=${to}`),
  },
  plans: {
    get: (week) => req('GET', `/api/plans/${week}`),
    create: (week_start_date) => req('POST', '/api/plans', { week_start_date }),
    updateSlots: (id, slots) => req('PUT', `/api/plans/${id}/slots`, { slots }),
  },
  photoUrl: (filename) => filename ? `${BASE}/uploads/${filename}` : null,
  seed: () => req('POST', '/api/seed'),
};
