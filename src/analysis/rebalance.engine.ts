export interface RebalanceItem {
  ticker: string;
  name?: string;
  weight: number;
  sector: string;
  assetType: string;
}

export interface RebalanceInput {
  items: RebalanceItem[];
  currentScore: number;
  sectorExposure: { sector: string; weight: number }[];
  baselineItems?: RebalanceItem[];
}

export interface RebalanceSuggestion {
  ticker: string;
  weight: number;
  isNew: boolean;
}

export interface RebalanceAction {
  ticker: string;
  label: string;
  type: 'reduce' | 'add' | 'drift';
  from: number;
  to: number;
  delta: number;
  text: string;
}

export interface BaselineDrift {
  ticker: string;
  label: string;
  baselineWeight: number;
  currentWeight: number;
  delta: number;
  status: 'added' | 'removed' | 'increased' | 'decreased' | 'unchanged';
}

export interface RebalanceOutput {
  currentScore: number;
  improvedScore: number;
  actions: RebalanceAction[];
  suggestedPortfolio: RebalanceSuggestion[];
  summary: string;
  beforeAfterSummary: string;
  whyItMatters: string;
  baselineDrift: BaselineDrift[];
  baselineDate: string | null;
  // legacy
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

// ── 베이스라인 drift 계산 ─────────────────────────────────────────────────────
function computeDrift(
  current: RebalanceItem[],
  baseline: RebalanceItem[],
): BaselineDrift[] {
  const baseMap = new Map(baseline.map((i) => [i.ticker, i]));
  const curMap = new Map(current.map((i) => [i.ticker, i]));
  const allTickers = new Set([...baseMap.keys(), ...curMap.keys()]);

  const drifts: BaselineDrift[] = [];
  for (const ticker of allTickers) {
    const b = baseMap.get(ticker);
    const c = curMap.get(ticker);
    const baseW = b ? r1(b.weight) : 0;
    const curW = c ? r1(c.weight) : 0;
    const delta = r1(curW - baseW);
    const label = c?.name || b?.name || ticker;

    let status: BaselineDrift['status'];
    if (!b) status = 'added';
    else if (!c || curW === 0) status = 'removed';
    else if (Math.abs(delta) < 1) status = 'unchanged';
    else if (delta > 0) status = 'increased';
    else status = 'decreased';

    if (status !== 'unchanged') {
      drifts.push({ ticker, label, baselineWeight: baseW, currentWeight: curW, delta, status });
    }
  }

  return drifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// ── 메인 엔진 ─────────────────────────────────────────────────────────────────
export function computeRebalance(input: RebalanceInput): RebalanceOutput {
  const { items, currentScore, sectorExposure, baselineItems } = input;

  const nonCash = items.filter(
    (i) => i.assetType !== 'CASH' && i.ticker.toUpperCase() !== 'CASH',
  );
  const stockItems = nonCash.filter((i) => i.assetType !== 'ETF');
  const etfItems = nonCash.filter((i) => i.assetType === 'ETF');
  const etfWeight = etfItems.reduce((s, i) => s + i.weight, 0);
  const hasAnyEtf = etfItems.length > 0;

  const scorableSectors = sectorExposure.filter(
    (s) => s.sector !== 'Cash' && s.sector !== 'ETF',
  );
  const topSector = scorableSectors[0];
  const topSectorWeight = topSector?.weight ?? 0;
  const topSectorName = topSector?.sector ?? '';
  const uniqueSectorCount = scorableSectors.length;

  // ── 베이스라인 drift ──────────────────────────────────────────────────────
  const baselineDrift = baselineItems ? computeDrift(nonCash, baselineItems) : [];

  // weightMap: 제안 포트폴리오 계산용
  const weightMap = new Map<string, {
    weight: number; isNew: boolean; assetType: string; sector: string; name: string;
  }>();
  for (const item of items) {
    weightMap.set(item.ticker, {
      weight: item.weight,
      isNew: false,
      assetType: item.assetType,
      sector: item.sector,
      name: item.name || item.ticker,
    });
  }

  function displayName(ticker: string, nameOverride?: string): string {
    return nameOverride || weightMap.get(ticker)?.name || ticker;
  }

  const actions: RebalanceAction[] = [];
  let freedWeight = 0;

  // ── Rule 1: 개별 주식 30% 초과 → 25%로 축소 ─────────────────────────────
  for (const item of stockItems) {
    if (item.weight > 30) {
      const target = 25;
      const reduced = r1(item.weight - target);
      freedWeight += reduced;
      weightMap.get(item.ticker)!.weight = target;
      const dname = displayName(item.ticker, item.name);
      actions.push({
        ticker: item.ticker,
        label: dname,
        type: 'reduce',
        from: r1(item.weight),
        to: target,
        delta: -reduced,
        text: `${dname} 비중 ${r1(item.weight)}% → ${target}%로 축소 (−${reduced}%)`,
      });
    }
  }

  // ── Rule 2: 상위 2종목 집중 > 20% & 총 4종목 이상 → trim ────────────────
  if (stockItems.length >= 4) {
    const sorted = [...stockItems].sort((a, b) => b.weight - a.weight);
    const top3Sum = sorted.slice(0, 3).reduce((s, i) => s + i.weight, 0);
    if (top3Sum > 70) {
      for (const item of sorted.slice(0, 2)) {
        const cur = weightMap.get(item.ticker)!.weight;
        if (cur > 20 && !actions.some((a) => a.ticker === item.ticker)) {
          const target = 20;
          const reduced = r1(cur - target);
          freedWeight += reduced;
          weightMap.get(item.ticker)!.weight = target;
          const dname = displayName(item.ticker, item.name);
          actions.push({
            ticker: item.ticker,
            label: dname,
            type: 'reduce',
            from: r1(cur),
            to: target,
            delta: -reduced,
            text: `${dname} 비중 ${r1(cur)}% → ${target}%로 축소 (집중도 완화)`,
          });
        }
      }
    }
  }

  // ── Rule 3: freed weight → 비중 낮은 기존 종목에 재배분 ──────────────────
  if (freedWeight > 1) {
    const underweight = [...stockItems]
      .filter((i) => weightMap.get(i.ticker)!.weight < 15)
      .sort((a, b) => weightMap.get(a.ticker)!.weight - weightMap.get(b.ticker)!.weight)
      .slice(0, 3);

    if (underweight.length > 0) {
      const perItem = r1(freedWeight / underweight.length);
      for (const item of underweight) {
        const cur = weightMap.get(item.ticker)!.weight;
        const next = r1(cur + perItem);
        weightMap.get(item.ticker)!.weight = next;
        const dname = displayName(item.ticker, item.name);
        actions.push({
          ticker: item.ticker,
          label: dname,
          type: 'add',
          from: r1(cur),
          to: next,
          delta: perItem,
          text: `${dname} 비중 ${r1(cur)}% → ${next}%로 확대 (+${perItem}%)`,
        });
      }
      freedWeight = 0;
    }
  }

  // ── Rule 4: ETF 제안 — 이미 ETF 보유 중이거나 종목 수 < 5일 때만 ─────────
  const etfShortfall = Math.max(0, 20 - etfWeight);
  if (etfShortfall > 0 && (hasAnyEtf || stockItems.length < 5) && stockItems.length >= 1) {
    const addPct = r1(Math.min(etfShortfall, freedWeight > 0 ? freedWeight : etfShortfall));
    const voo = weightMap.get('VOO');
    const fromPct = r1(voo?.weight ?? 0);
    const toPct = r1(fromPct + addPct);
    if (voo) {
      voo.weight = toPct;
    } else {
      weightMap.set('VOO', { weight: toPct, isNew: true, assetType: 'ETF', sector: 'ETF', name: 'VOO (미국 전체 시장)' });
    }
    freedWeight = r1(Math.max(0, freedWeight - addPct));
    actions.push({
      ticker: 'VOO',
      label: 'VOO (미국 전체 시장)',
      type: 'add',
      from: fromPct,
      to: toPct,
      delta: addPct,
      text: `VOO (미국 전체 시장) ${fromPct > 0 ? `${fromPct}% → ${toPct}%` : `${toPct}% 추가`} (+${addPct}%)`,
    });
  }

  // ── Rule 5: 섹터 집중 > 60% → 안내 메시지 (종목 강제 X) ─────────────────
  if (topSectorWeight > 60 && uniqueSectorCount <= 2) {
    actions.push({
      ticker: '_sector_div',
      label: '섹터 다양화 권고',
      type: 'add',
      from: 0,
      to: 0,
      delta: 0,
      text: `${topSectorName} 비중이 ${r1(topSectorWeight)}%로 집중되어 있어요. 헬스케어·금융·소비재 등 다른 섹터 종목을 추가해 보세요.`,
    });
  }

  // ── 정규화 ────────────────────────────────────────────────────────────────
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
  const realActions = actions.filter((a) => a.ticker !== '_sector_div');

  let summary: string;
  if (baselineDrift.length > 0) {
    const bigDrifts = baselineDrift.filter((d) => Math.abs(d.delta) >= 5);
    if (bigDrifts.length > 0) {
      const top = bigDrifts[0];
      const dir = top.delta > 0 ? '늘어났어요' : '줄었어요';
      summary = `처음 대비 ${top.label} 비중이 ${Math.abs(top.delta)}%p ${dir}. 아래 제안을 참고해 재조정해 보세요.`;
    } else {
      summary = realActions.length === 0
        ? '처음 구성과 크게 다르지 않아요. 현재 비중을 유지해도 좋습니다.'
        : '처음 대비 소폭 변화가 있어요. 아래 제안을 참고해 조정해 보세요.';
    }
  } else if (realActions.length === 0) {
    summary = '여러 곳에 잘 나눠서 투자하고 있어요. 지금 구성을 유지하세요.';
  } else if (topSectorWeight > 60) {
    summary = `${topSectorName} 비중이 ${r1(topSectorWeight)}%로 높아요. 다른 섹터도 추가해 보세요.`;
  } else if (stockItems.some((i) => i.weight > 30)) {
    summary = '한 종목에 비중이 너무 집중되어 있어요. 조금 나눠서 투자해 보세요.';
  } else {
    summary = '비중 조정으로 분산도를 개선할 수 있어요.';
  }

  const beforeAfterSummary =
    improvedScore > currentScore
      ? `현재 ${currentScore}점(${scoreLabel(currentScore)}) → 조정 후 ${improvedScore}점(${scoreLabel(improvedScore)})`
      : `현재 ${currentScore}점(${scoreLabel(currentScore)}) — 이미 잘 분산되어 있어요`;

  const whyItMatters = topSectorWeight > 60
    ? `${topSectorName} 한 섹터에 집중되면 섹터 악재 시 전체 포트폴리오가 흔들릴 수 있어요.`
    : realActions.length > 0
      ? '비중을 균형 있게 맞추면 특정 종목 급락 시 전체 손실을 줄일 수 있어요.'
      : '다양한 섹터·자산으로 분산하면 장기적으로 안정적인 수익을 기대할 수 있어요.';

  return {
    currentScore,
    improvedScore,
    actions,
    suggestedPortfolio,
    summary,
    beforeAfterSummary,
    whyItMatters,
    baselineDrift,
    baselineDate: null,
    // legacy
    recommendations: realActions.map((a) => a.text),
    finalConclusion: summary,
    topActions: realActions.slice(0, 3).map((a) => a.text),
  };
}
