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

export async function getDataFreshness(): Promise<{
  lastPriceDate: string | null;
  lastBenchmarkDate: string | null;
}> {
  const res = await fetch(`${API_BASE_URL}/prices/data-freshness`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch data freshness');
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
