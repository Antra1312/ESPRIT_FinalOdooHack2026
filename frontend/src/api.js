import { DB } from './data/mockData';

// Vite proxies this path to the local backend during development. Set
// VITE_API_URL when the frontend and API are hosted on different origins.
const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }
  return payload.data;
}

export async function loadBootstrap() {
  const data = await request('/bootstrap');
  Object.keys(data).forEach((key) => {
    if (key in DB && Array.isArray(data[key])) DB[key].splice(0, DB[key].length, ...data[key]);
  });
  return data;
}

export const api = {
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createContract: (data) => request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  createPayrun: (data) => request('/payroll/payruns', { method: 'POST', body: JSON.stringify(data) }),
  computePayrun: (id) => request(`/payroll/payruns/${id}/compute`, { method: 'POST' }),
  validatePayrun: (id) => request(`/payroll/payruns/${id}/validate`, { method: 'POST' }),
  payPayrun: (id) => request(`/payroll/payruns/${id}/pay`, { method: 'POST' }),
  sendPayrun: (id) => request(`/payroll/payruns/${id}/send`, { method: 'POST' }),
  payslipPdfUrl: (id) => `${API_URL}/payroll/payslips/${id}/pdf`,
};

export function replacePayrunInDb(payrun) {
  const existing = DB.payruns.find((item) => item.id === payrun.id);
  if (existing) Object.assign(existing, payrun);
  else DB.payruns.push(payrun);
}
