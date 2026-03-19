/// <reference types="vite/client" />

const BACKEND_URL = import.meta.env.VITE_CLOUD_GATEWAY_URL || 'http://localhost:8000/api/v1';

export type VllmStatus = 'offline' | 'warming' | 'online';

export async function fetchVllmStatus(): Promise<{ status: VllmStatus }> {
  const res = await fetch(`${BACKEND_URL}/vllm/status`);
  if (!res.ok) throw new Error('vllm/status failed');
  return res.json();
}

export async function triggerVllmWarmup(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/vllm/warmup`, { method: 'POST' });
  if (!res.ok) throw new Error('vllm/warmup failed');
}
