const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getSecurities(query?: string) {
  const url = query
    ? `${API_BASE_URL}/securities?q=${encodeURIComponent(query)}`
    : `${API_BASE_URL}/securities`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch securities');
  return res.json();
}

export async function createPortfolio(name: string) {
  const res = await fetch(`${API_BASE_URL}/portfolios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create portfolio');
  return res.json();
}

export async function addPortfolioItem(
  portfolioId: number,
  securityId: number,
  options: { weight?: number; amount?: number; avgCost?: number },
) {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ securityId, ...options }),
  });
  if (!res.ok) throw new Error('Failed to add portfolio item');
  return res.json();
}

export async function getCurrentPrices(securityIds: number[]): Promise<{ securityId: number; price: number }[]> {
  if (!securityIds.length) return [];
  const res = await fetch(`${API_BASE_URL}/prices/current?ids=${securityIds.join(',')}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export async function getDataFreshness(): Promise<{
  lastPriceDate: string | null;
  lastBenchmarkDate: string | null;
}> {
  const res = await fetch(`${API_BASE_URL}/prices/data-freshness`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch data freshness');
  return res.json();
}

export async function getExchangeRate(): Promise<{
  rate: number;
  midRate: number;
  source: string;
  updatedAt: string;
}> {
  const res = await fetch(`${API_BASE_URL}/prices/exchange-rate`, { cache: 'no-store' });
  if (!res.ok) return { rate: 1400, midRate: 1400, source: 'fallback', updatedAt: '' };
  return res.json();
}

export async function getPortfolios() {
  const res = await fetch(`${API_BASE_URL}/portfolios`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch portfolios');
  return res.json();
}

export async function updatePortfolio(portfolioId: number, name: string) {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`PATCH /portfolios/${portfolioId} → ${res.status}`);
  return res.json();
}

export async function clearPortfolioItems(portfolioId: number) {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}/items`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE /portfolios/${portfolioId}/items → ${res.status}`);
  return res.json();
}

export async function deletePortfolio(portfolioId: number) {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE /portfolios/${portfolioId} → ${res.status}`);
  return res.json();
}

export async function getPortfolioItems(portfolioId: number) {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}/items`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch portfolio items');
  return res.json();
}

export async function confirmTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number,
  portfolioId: number,
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/payments/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ paymentKey, orderId, amount, portfolioId }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success;
}

export async function getAdminBillingMode(): Promise<'FREE' | 'SOFT_PAYWALL' | 'PAID'> {
  const res = await fetch(`${API_BASE_URL}/admin/settings/billing-mode`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch billing mode');
  const data = await res.json();
  return data.mode;
}

export class AdminApiError extends Error {
  constructor(public readonly status: number) {
    super(`Admin API error: HTTP ${status}`);
  }
}

export async function setAdminBillingMode(mode: 'FREE' | 'SOFT_PAYWALL' | 'PAID'): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/settings/billing-mode`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new AdminApiError(res.status);
}

export interface PriceFetchStatus {
  status: 'idle' | 'running' | 'done' | 'error';
  startedAt: string | null;
  finishedAt: string | null;
  success: number;
  failed: number;
  skipped: number;
  totalRows: number;
  failedTickers: string[];
  errorMessage: string | null;
}

export async function getPriceFetchStatus(): Promise<PriceFetchStatus> {
  const res = await fetch(`${API_BASE_URL}/admin/prices/status`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function runPriceFetch(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/prices/run`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to start price fetch');
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  trialEndsAt: string | null;
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to change password');
  }
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${API_BASE_URL}/admin/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function changeAdminUserPassword(userId: number, password: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Failed to change password');
}

export async function grantAdminTrial(userId: number, days = 7): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/trial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ days }),
  });
  if (!res.ok) throw new Error('Failed to grant trial');
}

export async function revokeAdminTrial(userId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/trial`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to revoke trial');
}

export async function deleteAdminUser(userId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete user');
}

export async function getStateEvents(): Promise<import('../types').StateEvent[]> {
  const res = await fetch(`${API_BASE_URL}/notifications`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function markEventRead(id: number): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'POST',
    headers: authHeaders(),
  });
}

export async function markAllEventsRead(): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'POST',
    headers: authHeaders(),
  });
}

export async function getPortfolioStateEvents(portfolioId: number): Promise<import('../types').StateEvent[]> {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}/state-events`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function getPortfolioCurrentState(
  portfolioId: number,
): Promise<import('../types').PortfolioCurrentState> {
  const res = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}/current-state`, {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/push/vapid-public-key`, {
    headers: authHeaders(),
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.key ?? '';
}

export async function registerPushSubscription(sub: PushSubscriptionJSON): Promise<void> {
  await fetch(`${API_BASE_URL}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: sub.keys,
    }),
  });
}

export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  await fetch(`${API_BASE_URL}/push/unsubscribe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ endpoint }),
  });
}

export async function analyzePortfolio(
  portfolioId: number,
  period: '1M' | '3M' | '1Y' = '1Y',
  benchmarkCode = 'SP500',
) {
  const res = await fetch(`${API_BASE_URL}/analysis/portfolios/${portfolioId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ period, benchmarkCode }),
  });
  if (!res.ok) throw new Error('Failed to analyze portfolio');
  return res.json();
}
