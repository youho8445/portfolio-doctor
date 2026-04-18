export interface RebalanceInput {
  items: { ticker: string; weight: number; sector: string; assetType: string }[];
  currentScore: number;
  sectorExposure: { sector: string; weight: number }[];
}

export interface RebalanceSuggestion {
  ticker: string;
  weight: number;
  isNew: boolean;
}

export interface RebalanceAction {
  ticker: string;
  label: string;   // 한글 종목명 또는 ticker
  type: 'reduce' | 'add';
  from: number;
  to: number;
  delta: number;
  text: string;    // 사람이 읽을 수 있는 한국어 설명
}

export interface RebalanceOutput {
  currentScore: number;
  improvedScore: number;
  actions: RebalanceAction[];
  suggestedPortfolio: RebalanceSuggestion[];
  summary: string;
  beforeAfterSummary: string;
  whyItMatters: string;
  // legacy (하위 호환)
  recommendations: string[];
  finalConclusion: string;
  topActions: string[];
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function r1(n: number) { return Math.round(n * 10) / 10; }

function scoreLabel(s: number): string {
  if (s < 40) return '위험';
  if (s < 60) return '보통';
  if (s < 80) return '양호';
  return '우수';
}

function calcScore(
  items: { ticker: string; weight: number; sector: string; assetType: string }[],
): number {
  const nonCash = items.filter(
    (i) => i.assetType !== 'CASH' && i.ticker.toUpperCase() !== 'CASH',
  );
  const etfWeight = nonCash.filter((i) => i.assetType === 'ETF').reduce((s, i) => s + i.weight, 0);

  const sectorMap: Record<string, number> = {};
  for (const i of nonCash) {
    if (i.assetType === 'ETF') continue;
    sectorMap[i.sector] = (sectorMap[i.sector] ?? 0) + i.weight;
  }
  const sectors = Object.values(sectorMap).sort((a, b) => b - a);
  const topSectorW = sectors[0] ?? 0;
  const uniqueSectors = sectors.length;

  const sorted = nonCash.map((i) => i.weight).sort((a, b) => b - a);
  const top3 = sorted.slice(0, 3).reduce((s, v) => s + v, 0);

  let score = 100;
  if (nonCash.length < 4) score -= 25;
  else if (nonCash.length < 7) score -= 10;
  if (top3 >= 80) score -= 25;
  else if (top3 >= 60) score -= 15;
  else if (top3 >= 40) score -= 5;
  if (topSectorW >= 70) score -= 25;
  else if (topSectorW >= 50) score -= 15;
  else if (topSectorW >= 35) score -= 5;
  if (uniqueSectors <= 1) score -= 15;
  else if (uniqueSectors <= 2) score -= 5;
  if (etfWeight >= 30) score += 10;
  else if (etfWeight >= 10) score += 5;

  return Math.min(100, Math.max(0, score));
}

// ── 메인 엔진 ─────────────────────────────────────────────────────────────────
export function computeRebalance(input: RebalanceInput): RebalanceOutput {
  const { items, currentScore, sectorExposure } = input;

  const nonCash = items.filter(
    (i) => i.assetType !== 'CASH' && i.ticker.toUpperCase() !== 'CASH',
  );
  const stockItems = nonCash.filter((i) => i.assetType !== 'ETF');
  const etfItems = nonCash.filter((i) => i.assetType === 'ETF');
  const etfWeight = etfItems.reduce((s, i) => s + i.weight, 0);

  const scorableSectors = sectorExposure.filter(
    (s) => s.sector !== 'Cash' && s.sector !== 'ETF',
  );
  const topSector = scorableSectors[0];
  const topSectorWeight = topSector?.weight ?? 0;
  const topSectorName = topSector?.sector ?? '';
  const uniqueSectorCount = scorableSectors.length;

  // weightMap: ticker → { weight, isNew, assetType, sector }
  const weightMap = new Map<string, { weight: number; isNew: boolean; assetType: string; sector: string }>();
  for (const item of items) {
    weightMap.set(item.ticker, {
      weight: item.weight,
      isNew: false,
      assetType: item.assetType,
      sector: item.sector,
    });
  }

  const actions: RebalanceAction[] = [];
  let freedWeight = 0; // 줄인 비중 합산

  // ── Rule 1: 개별 주식이 30% 초과이면 30%로 축소 ──────────────────────────
  for (const item of stockItems) {
    if (item.weight > 30) {
      const reduced = r1(item.weight - 30);
      freedWeight += reduced;
      weightMap.get(item.ticker)!.weight = 30;
      actions.push({
        ticker: item.ticker,
        label: item.ticker,
        type: 'reduce',
        from: r1(item.weight),
        to: 30,
        delta: -reduced,
        text: `${item.ticker} 비중을 ${r1(item.weight)}% → 30%로 줄이기 (−${reduced}%)`,
      });
    }
  }

  // ── Rule 2: ETF 비중이 20% 미만이면 VOO 추가 ──────────────────────────────
  const etfShortfall = Math.max(0, 20 - etfWeight);
  if (etfShortfall > 0 && stockItems.length >= 1) {
    const addPct = r1(Math.min(etfShortfall, freedWeight > 0 ? freedWeight : etfShortfall));
    const voo = weightMap.get('VOO');
    const fromPct = r1(voo?.weight ?? 0);
    const toPct = r1(fromPct + addPct);
    if (voo) {
      voo.weight = toPct;
    } else {
      weightMap.set('VOO', { weight: toPct, isNew: true, assetType: 'ETF', sector: 'ETF' });
    }
    freedWeight = r1(Math.max(0, freedWeight - addPct));
    actions.push({
      ticker: 'VOO',
      label: 'VOO (미국 전체 시장 ETF)',
      type: 'add',
      from: fromPct,
      to: toPct,
      delta: addPct,
      text: `VOO ETF ${fromPct > 0 ? `${fromPct}% → ${toPct}%로 늘리기` : `${toPct}% 추가하기`} (+${addPct}%)`,
    });
  }

  // ── Rule 3: 섹터 집중도 > 60% 또는 섹터 수 ≤ 2 → XLV 추가 ───────────────
  const needsSectorDiv = (topSectorWeight > 60 || uniqueSectorCount <= 2) && stockItems.length >= 1;
  if (needsSectorDiv && !weightMap.has('XLV')) {
    const addPct = freedWeight >= 10 ? 10 : r1(Math.min(10, 10));
    weightMap.set('XLV', { weight: addPct, isNew: true, assetType: 'ETF', sector: 'ETF' });
    freedWeight = r1(Math.max(0, freedWeight - addPct));
    actions.push({
      ticker: 'XLV',
      label: 'XLV (헬스케어 ETF)',
      type: 'add',
      from: 0,
      to: addPct,
      delta: addPct,
      text: `XLV 헬스케어 ETF ${addPct}% 추가하기 (+${addPct}%)`,
    });
  }

  // ── 남은 freedWeight를 기존 주식들에 비율대로 재배분 ──────────────────────
  if (freedWeight > 0.5) {
    const redistributeTo = [...weightMap.entries()].filter(
      ([, d]) => !d.isNew && d.assetType !== 'CASH',
    );
    const totalBase = redistributeTo.reduce((s, [, d]) => s + d.weight, 0);
    if (totalBase > 0) {
      for (const [, d] of redistributeTo) {
        d.weight = r1(d.weight + (d.weight / totalBase) * freedWeight);
      }
    }
  }

  // ── 정규화: 합계 100% ─────────────────────────────────────────────────────
  const total = [...weightMap.values()].reduce((s, d) => s + d.weight, 0);
  if (total > 0 && Math.abs(total - 100) > 0.5) {
    for (const d of weightMap.values()) {
      d.weight = r1((d.weight / total) * 100);
    }
  }

  // ── suggestedPortfolio ─────────────────────────────────────────────────────
  const suggestedPortfolio: RebalanceSuggestion[] = [...weightMap.entries()]
    .filter(([, d]) => d.weight > 0.1)
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([ticker, data]) => ({
      ticker,
      weight: r1(data.weight),
      isNew: data.isNew,
    }));

  // ── 개선 점수 ─────────────────────────────────────────────────────────────
  const suggestedItems = [...weightMap.entries()]
    .filter(([, d]) => d.weight > 0.1)
    .map(([ticker, data]) => ({
      ticker,
      weight: data.weight,
      sector: data.sector,
      assetType: data.assetType,
    }));
  const improvedScore = calcScore(suggestedItems);

  // ── 텍스트 생성 ───────────────────────────────────────────────────────────
  let summary: string;
  if (actions.length === 0) {
    summary = '포트폴리오가 잘 분산되어 있습니다. 현재 구성을 유지하세요.';
  } else if (topSectorWeight > 60) {
    summary = `${topSectorName} 업종에 ${r1(topSectorWeight)}%가 집중되어 있습니다. 분산이 필요합니다.`;
  } else if (stockItems.some((i) => i.weight > 30)) {
    summary = '일부 종목이 30%를 초과해 포트폴리오가 편중되어 있습니다.';
  } else {
    summary = 'ETF와 다른 섹터를 추가해 더 안정적인 구조로 개선할 수 있습니다.';
  }

  const beforeAfterSummary =
    improvedScore > currentScore
      ? `현재 점수: ${currentScore}점(${scoreLabel(currentScore)}) → 개선 후: ${improvedScore}점(${scoreLabel(improvedScore)})`
      : `현재 점수: ${currentScore}점(${scoreLabel(currentScore)}) — 이미 잘 분산되어 있습니다`;

  let whyItMatters: string;
  if (etfShortfall > 0) {
    whyItMatters = 'ETF 하나로 수백 개 기업에 분산 투자하는 효과를 얻을 수 있습니다. 한 종목이 크게 떨어져도 전체 손실이 줄어듭니다.';
  } else if (topSectorWeight > 60) {
    whyItMatters = '특정 업종이 어려울 때 다른 업종이 포트폴리오를 지켜줍니다. 업종을 나누면 한 번의 나쁜 뉴스로 전체가 흔들리는 상황을 피할 수 있습니다.';
  } else {
    whyItMatters = '분산 투자는 위험을 줄이고 장기적으로 안정적인 수익을 만들어주는 가장 기본적인 방법입니다.';
  }

  return {
    currentScore,
    improvedScore,
    actions,
    suggestedPortfolio,
    summary,
    beforeAfterSummary,
    whyItMatters,
    // legacy
    recommendations: actions.map((a) => a.text),
    finalConclusion: summary,
    topActions: actions.slice(0, 3).map((a) => a.text),
  };
}
