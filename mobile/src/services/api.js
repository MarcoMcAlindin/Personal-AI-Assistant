// VibeOS Mobile -- Cloud Gateway API Client

import { CLOUD_GATEWAY_URL } from '@env';
import { supabase } from './supabase';

export const API_BASE_URL = `${CLOUD_GATEWAY_URL}/api/v1`;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// --- Public endpoints (no auth) ---

export async function fetchTechFeeds() {
  const res = await fetch(`${API_BASE_URL}/feeds/tech`);
  if (!res.ok) throw new Error(`feeds/tech failed: ${res.status}`);
  return res.json();
}

export async function fetchConcerts() {
  const res = await fetch(`${API_BASE_URL}/feeds/concerts`);
  if (!res.ok) throw new Error(`feeds/concerts failed: ${res.status}`);
  return res.json();
}

// --- Authenticated endpoints ---

export async function fetchInbox() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/email/inbox`, { headers });
  if (!res.ok) throw new Error(`email/inbox failed: ${res.status}`);
  return res.json();
}

export async function sendEmail({ to, subject, body, thread_id }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/email/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, subject, body, thread_id }),
  });
  if (!res.ok) throw new Error(`email/send failed: ${res.status}`);
  return res.json();
}

export async function sendChat(message) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`chat failed: ${res.status}`);
  return res.json();
}

export async function saveChat(id) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/chat/save/${id}`, {
    method: 'PATCH',
    headers,
  });
  if (!res.ok) throw new Error(`chat/save failed: ${res.status}`);
  return res.json();
}

export async function fetchTasks() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/tasks`, { headers });
  if (!res.ok) throw new Error(`tasks failed: ${res.status}`);
  return res.json();
}

export async function createTask(task) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error(`tasks create failed: ${res.status}`);
  return res.json();
}

export async function updateTask(id, updates) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`tasks update failed: ${res.status}`);
  return res.json();
}

export async function fetchHealth() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/health/metrics`, { headers });
  if (!res.ok) throw new Error(`health failed: ${res.status}`);
  return res.json();
}
