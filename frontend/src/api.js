import { DB } from './data/mockData';

// Vite proxies this path to the local backend during development. Set
// VITE_API_URL when the frontend and API are hosted on different origins.
const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const { skipAuth = false, headers: customHeaders, ...fetchOptions } = options;
  const session = (() => { try { return JSON.parse(localStorage.getItem('peoplepay360_session')); } catch { return null; } })();
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(!skipAuth && session?.token ? { Authorization: `Bearer ${session.token}` } : {}), ...(customHeaders || {}) },
    ...fetchOptions,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }
  // The legacy HR routes return raw JSON, while the newer routes use the
  // { success, data } envelope. Accept both while the backend is consolidated.
  return payload.data ?? payload;
}

export async function loadBootstrap() {
  const data = await request('/bootstrap');
  Object.keys(data).forEach((key) => {
    if (key in DB && Array.isArray(data[key])) DB[key].splice(0, DB[key].length, ...data[key]);
  });
  return data;
}

export const api = {
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data), skipAuth: true }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }), skipAuth: true }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }), skipAuth: true }),
  createEmployee: (data) => request('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createContract: (data) => request('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  createPayrun: (data) => request('/payroll/payruns', { method: 'POST', body: JSON.stringify(data) }),
  computePayrun: (id) => request(`/payroll/payruns/${id}/compute`, { method: 'POST' }),
  validatePayrun: (id) => request(`/payroll/payruns/${id}/validate`, { method: 'POST' }),
  payPayrun: (id) => request(`/payroll/payruns/${id}/pay`, { method: 'POST' }),
  sendPayrun: (id) => request(`/payroll/payruns/${id}/send`, { method: 'POST' }),
  payslipPdfUrl: (id) => `${API_URL}/payslips/${id}/pdf`,
};

export function replacePayrunInDb(payrun) {
  const existing = DB.payruns.find((item) => item.id === payrun.id);
  if (existing) Object.assign(existing, payrun);
  else DB.payruns.push(payrun);
}
