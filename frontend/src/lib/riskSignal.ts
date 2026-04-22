export interface QuoteMin {
  pe: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  history: { time: string; close: number }[];
}

export interface RiskTag {
  text: string;
  level: 'high' | 'medium' | 'positive';
}

function priceChangePct(history: QuoteMin['history'], days: number): number | null {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const slice = history.filter((h) => new Date(h.time).getTime() >= cutoff);
  if (slice.length < 2) return null;
  return ((slice[slice.length - 1].close - slice[0].close) / slice[0].close) * 100;
}

export function buildRiskTags(q: QuoteMin, actionType: 'reduce' | 'add'): RiskTag[] {
  const tags: RiskTag[] = [];

  // P/E valuation
  if (q.pe != null) {
    if (q.pe > 40) tags.push({ text: `P/E ${q.pe.toFixed(0)}x 고평가`, level: 'high' });
    else if (q.pe > 25 && actionType === 'reduce') tags.push({ text: `P/E ${q.pe.toFixed(0)}x`, level: 'medium' });
    else if (q.pe < 15 && actionType === 'add') tags.push({ text: `P/E ${q.pe.toFixed(0)}x 저평가`, level: 'positive' });
  }

  // 3-month price change
  const ch3M = priceChangePct(q.history, 90);
  if (ch3M != null) {
    if (ch3M > 30 && actionType === 'reduce') tags.push({ text: `3개월 +${ch3M.toFixed(0)}% 급등`, level: 'high' });
    else if (ch3M > 15 && actionType === 'reduce') tags.push({ text: `3개월 +${ch3M.toFixed(0)}%`, level: 'medium' });
    else if (ch3M < -15 && actionType === 'add') tags.push({ text: `3개월 ${ch3M.toFixed(0)}%`, level: 'medium' });
  }

  // 1-month price change
  const ch1M = priceChangePct(q.history, 30);
  if (ch1M != null) {
    if (ch1M > 20 && actionType === 'reduce') tags.push({ text: `1개월 +${ch1M.toFixed(0)}% 급등`, level: 'high' });
    else if (ch1M < -10 && actionType === 'add') tags.push({ text: `1개월 ${ch1M.toFixed(0)}%`, level: 'medium' });
  }

  // 52-week volatility (range ratio)
  if (q.fiftyTwoWeekHigh != null && q.fiftyTwoWeekLow != null && q.fiftyTwoWeekLow > 0) {
    const range = ((q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow) / q.fiftyTwoWeekLow) * 100;
    if (range > 80) tags.push({ text: `변동성 매우 큼(52w ±${(range / 2).toFixed(0)}%)`, level: 'high' });
    else if (range > 50) tags.push({ text: `변동성 큼`, level: 'medium' });
  }

  // Debt
  if (q.debtToEquity != null && q.debtToEquity > 200) {
    tags.push({ text: `부채비율 ${q.debtToEquity.toFixed(0)}%`, level: 'medium' });
  }

  // Revenue growth (positive for add)
  if (q.revenueGrowth != null && q.revenueGrowth > 15 && actionType === 'add') {
    tags.push({ text: `매출 성장 +${q.revenueGrowth.toFixed(0)}%`, level: 'positive' });
  }

  return tags.slice(0, 3);
}

export function buildRiskExplanation(q: QuoteMin, actionType: 'reduce' | 'add'): string {
  const tags = buildRiskTags(q, actionType);
  if (tags.length === 0) return '';
  const highRisk = tags.filter((t) => t.level === 'high');
  const positive = tags.filter((t) => t.level === 'positive');
  if (actionType === 'reduce') {
    if (highRisk.length > 0) return `${highRisk.map((t) => t.text).join(', ')}으로 하락 위험이 높습니다.`;
    return `${tags.map((t) => t.text).join(', ')}으로 비중 축소를 권장합니다.`;
  }
  if (positive.length > 0) return `${positive.map((t) => t.text).join(', ')}로 비중 확대가 유리합니다.`;
  return `분산 강화를 위해 비중 확대를 권장합니다.`;
}
