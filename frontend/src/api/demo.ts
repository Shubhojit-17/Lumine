/**
 * API helper for demo endpoints
 */

// Use environment variable for API base URL, fallback to localhost for development
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface WalletInfo {
  address: string;
  balance: string;
  balance_raw: number;
}

export interface WalletsResponse {
  agent_wallet: WalletInfo;
  server_wallet: WalletInfo;
}

export interface DemoEvent {
  text: string;
  type: 'info' | 'purple' | 'blue' | 'success';
}

export interface DemoRunResponse {
  status: string;
  success?: boolean;
  txid?: string;
  events: DemoEvent[];
  error?: string;
}

export async function fetchWallets(): Promise<WalletsResponse> {
  const res = await fetch(`${API_BASE}/demo/wallets`);
  if (!res.ok) throw new Error('Failed to fetch wallets');
  return res.json();
}

export async function executeDemoRun(): Promise<DemoRunResponse> {
  const res = await fetch(`${API_BASE}/demo/run`, { method: 'POST' });
  
  // Handle 423 Locked gracefully
  if (res.status === 423) {
    return {
      status: 'locked',
      events: [{ text: '> Demo already in progress. Please wait...', type: 'info' }],
      error: 'Demo already in progress',
    };
  }
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || 'Demo run failed');
  }
  return res.json();
}

export async function resetDemo(): Promise<{ reset: boolean; was_locked: boolean }> {
  const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo');
  return res.json();
}
