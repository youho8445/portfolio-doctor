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

export interface RebalanceOutput {
  currentScore: number;
  improvedScore: number;
  recommendations: string[];
  suggestedPortfolio: RebalanceSuggestion[];
  finalConclusion: string;
  topActions: string[];
  beforeAfterSummary: string;
  whyItMatters: string;
}

function calcDivScore(
  items: { ticker: string; weight: number; sector: string; assetType: string }[],
): number {
  const nonCash = items.filter(
    (i) => i.assetType !== 'CASH' && i.ticker.toUpperCase() !== 'CASH',
  );
  const etfItems = nonCash.filter((i) => i.assetType === 'ETF');
  const etfWeight = etfItems.reduce((s, i) => s + i.weight, 0);

  const sectorMap: Record<string, number> = {};
  for (const i of nonCash) {
    if (i.assetType === 'ETF') continue;
    sectorMap[i.sector] = (sectorMap[i.sector] ?? 0) + i.weight;
  }
  const scorableSectors = Object.entries(sectorMap).map(([sector, weight]) => ({ sector, weight }));
  const topSectorWeight = scorableSectors.sort((a, b) => b.weight - a.weight)[0]?.weight ?? 0;
  const uniqueSectorCount = scorableSectors.length;

  const sorted = nonCash.map((i) => i.weight).sort((a, b) => b - a);
  const top3 = sorted.slice(0, 3).reduce((s, v) => s + v, 0);

  let score = 100;
  if (nonCash.length < 4) score -= 25;
  else if (nonCash.length < 7) score -= 10;

  if (top3 >= 80) score -= 25;
  else if (top3 >= 60) score -= 15;
  else if (top3 >= 40) score -= 5;

  if (topSectorWeight >= 70) score -= 25;
  else if (topSectorWeight >= 50) score -= 15;
  else if (topSectorWeight >= 35) score -= 5;

  if (uniqueSectorCount <= 1) score -= 15;
  else if (uniqueSectorCount <= 2) score -= 5;

  if (etfWeight >= 30) score += 10;
  else if (etfWeight >= 10) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function computeRebalance(input: RebalanceInput): RebalanceOutput {
  const { items, currentScore, sectorExposure } = input;

  // ticker → { weight, isNew } 맵
  const weightMap = new Map<string, { weight: number; isNew: boolean; assetType: string; sector: string }>();
  for (const item of items) {
    weightMap.set(item.ticker, { weight: item.weight, isNew: false, assetType: item.assetType, sector: item.sector });
  }

  const recommendations: string[] = [];

  const nonCash = items.filter(
    (i) => i.assetType !== 'CASH' && i.ticker.toUpperCase() !== 'CASH',
  );
  const etfItems = nonCash.filter((i) => i.assetType === 'ETF');
  const stockItems = nonCash.filter((i) => i.assetType !== 'ETF');
  const etfWeight = etfItems.reduce((s, i) => s + i.weight, 0);

  const scorableSectors = sectorExposure.filter(
    (s) => s.sector !== 'Cash' && s.sector !== 'ETF',
  );
  const topSector = scorableSectors[0];
  const topSectorWeight = topSector?.weight ?? 0;
  const topSectorName = topSector?.sector ?? '';
  const uniqueSectorCount = scorableSectors.length;

  // Rule 1 — ETF 없고 종목 수 >= 2
  if (etfWeight === 0 && stockItems.length >= 2) {
    const addPct = 20;
    // 기존 종목 비중 × 0.8
    for (const [ticker, data] of weightMap.entries()) {
      if (data.assetType !== 'CASH' && ticker.toUpperCase() !== 'CASH') {
        data.weight = data.weight * 0.8;
      }
    }
    weightMap.set('VOO', { weight: addPct, isNew: true, assetType: 'ETF', sector: 'ETF' });
    recommendations.push(`ETF(VOO) ${addPct}% 편입으로 분산 효과 향상`);
  }

  // Rule 2 — 최대 섹터 비중 > 60%
  if (topSectorWeight > 60) {
    const targetSectorWeight = 55;
    const ratio = targetSectorWeight / topSectorWeight;
    const freed = topSectorWeight - targetSectorWeight;

    for (const [ticker, data] of weightMap.entries()) {
      if (data.sector === topSectorName && data.assetType !== 'ETF') {
        data.weight = data.weight * ratio;
      }
    }

    // 줄어든 비중을 VOO에 배분 (이미 있으면 추가, 없으면 신규)
    const voo = weightMap.get('VOO');
    if (voo) {
      voo.weight += freed;
    } else {
      weightMap.set('VOO', { weight: freed, isNew: true, assetType: 'ETF', sector: 'ETF' });
    }
    recommendations.push(
      `${topSectorName} 비중을 ${topSectorWeight.toFixed(0)}%에서 ${targetSectorWeight}%로 축소`,
    );
  }

  // Rule 3 — 상위 3종목 집중도 >= 70%
  const sortedByWeight = [...weightMap.entries()]
    .filter(([, d]) => d.assetType !== 'CASH')
    .sort((a, b) => b[1].weight - a[1].weight);
  const top3Tickers = sortedByWeight.slice(0, 3).map(([t]) => t);
  const top3Total = sortedByWeight.slice(0, 3).reduce((s, [, d]) => s + d.weight, 0);

  if (top3Total >= 70) {
    let freed = 0;
    for (const ticker of top3Tickers) {
      const data = weightMap.get(ticker)!;
      const reduced = data.weight * 0.25;
      freed += reduced;
      data.weight = data.weight * 0.75;
    }

    // 하위 종목에 균등 배분 (없으면 VOO)
    const otherTickers = sortedByWeight.slice(3).map(([t]) => t);
    if (otherTickers.length > 0) {
      const perTicker = freed / otherTickers.length;
      for (const ticker of otherTickers) {
        weightMap.get(ticker)!.weight += perTicker;
      }
    } else {
      const voo = weightMap.get('VOO');
      if (voo) {
        voo.weight += freed;
      } else {
        weightMap.set('VOO', { weight: freed, isNew: true, assetType: 'ETF', sector: 'ETF' });
      }
    }

    const newTop3 = [...weightMap.entries()]
      .filter(([, d]) => d.assetType !== 'CASH')
      .sort((a, b) => b[1].weight - a[1].weight)
      .slice(0, 3)
      .reduce((s, [, d]) => s + d.weight, 0);

    recommendations.push(
      `상위 집중 종목 비중 분산 (상위3 집중도 ${top3Total.toFixed(0)}% → ${newTop3.toFixed(0)}%)`,
    );
  }

  // Rule 4 — 섹터 수 <= 2, 주식 보유 시
  if (uniqueSectorCount <= 2 && stockItems.length > 0) {
    const addPct = 10;
    for (const [ticker, data] of weightMap.entries()) {
      if (data.assetType !== 'CASH' && ticker.toUpperCase() !== 'CASH') {
        data.weight = data.weight * 0.9;
      }
    }
    if (!weightMap.has('XLV')) {
      weightMap.set('XLV', { weight: addPct, isNew: true, assetType: 'ETF', sector: 'ETF' });
      recommendations.push(`헬스케어(XLV) ${addPct}% 추가로 섹터 분산`);
    }
  }

  // 정규화: 합계 100%
  const total = [...weightMap.values()].reduce((s, d) => s + d.weight, 0);
  if (total > 0 && Math.abs(total - 100) > 0.1) {
    for (const data of weightMap.values()) {
      data.weight = (data.weight / total) * 100;
    }
  }

  // 제안 포트폴리오 생성 (비중 0 이하 제외, 소수점 1자리)
  const suggestedPortfolio: RebalanceSuggestion[] = [...weightMap.entries()]
    .filter(([, d]) => d.weight > 0.1)
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([ticker, data]) => ({
      ticker,
      weight: Number(data.weight.toFixed(1)),
      isNew: data.isNew,
    }));

  // improvedScore 계산
  const suggestedItems = [...weightMap.entries()]
    .filter(([, d]) => d.weight > 0.1)
    .map(([ticker, data]) => ({
      ticker,
      weight: data.weight,
      sector: data.sector,
      assetType: data.assetType,
    }));

  const improvedScore = calcDivScore(suggestedItems);

  // 변화 없을 때
  if (recommendations.length === 0) {
    recommendations.push('현재 포트폴리오가 잘 분산되어 있습니다');
  }

  // ── 초보자 친화적 필드 생성 ──────────────────────────────────────────────

  // 점수 레이블
  function scoreLabel(s: number): string {
    if (s < 40) return '위험';
    if (s < 60) return '보통';
    if (s < 80) return '양호';
    return '우수';
  }

  // finalConclusion
  let finalConclusion: string;
  if (currentScore < 40) {
    if (topSectorWeight > 60) {
      finalConclusion = `포트폴리오가 ${topSectorName} 업종에 너무 집중되어 있어 고위험 상태입니다.`;
    } else {
      finalConclusion = '포트폴리오가 소수 종목에 너무 집중되어 있어 고위험 상태입니다.';
    }
  } else if (currentScore < 60) {
    if (topSectorWeight > 50) {
      finalConclusion = `${topSectorName} 업종 비중이 높아 리스크를 줄일 여지가 있습니다.`;
    } else {
      finalConclusion = '포트폴리오가 다소 집중되어 있어 분산을 개선할 수 있습니다.';
    }
  } else {
    finalConclusion = '포트폴리오가 적절히 분산되어 안정적입니다.';
  }

  // topActions (최대 3개, 쉬운 말)
  const allActions: string[] = [];
  if (etfWeight === 0 && stockItems.length >= 2) {
    allActions.push('VOO 같은 ETF를 20% 편입해 분산 효과를 높이세요');
  }
  if (topSectorWeight > 60) {
    allActions.push(`${topSectorName} 종목 비중을 줄이세요`);
  }
  if (top3Total >= 70) {
    allActions.push('상위 종목 비중을 줄이고 다른 종목을 추가하세요');
  }
  if (uniqueSectorCount <= 2 && stockItems.length > 0) {
    allActions.push('헬스케어(XLV) 같은 다른 업종 종목을 추가하세요');
  }
  if (allActions.length === 0) {
    allActions.push('현재 포트폴리오를 유지하세요');
  }
  const topActions = allActions.slice(0, 3);

  // beforeAfterSummary
  const beforeAfterSummary =
    improvedScore > currentScore
      ? `분산 점수 ${currentScore}점(${scoreLabel(currentScore)}) → ${improvedScore}점(${scoreLabel(improvedScore)})으로 개선됩니다`
      : `현재 분산 점수 ${currentScore}점(${scoreLabel(currentScore)}) — 이미 잘 분산되어 있습니다`;

  // whyItMatters
  let whyItMatters: string;
  if (etfWeight === 0 && stockItems.length >= 2) {
    whyItMatters = '한 종목이 크게 떨어져도 다른 종목이 손실을 줄여줍니다. ETF 하나로 수백 개 기업에 분산 투자하는 효과를 얻을 수 있습니다.';
  } else if (topSectorWeight > 60) {
    whyItMatters = '특정 업종이 어려울 때 다른 업종이 포트폴리오를 지켜줍니다. 업종을 나누면 한 번의 뉴스로 전체가 흔들리는 상황을 피할 수 있습니다.';
  } else if (top3Total >= 70) {
    whyItMatters = '소수 종목에 몰빵하면 그 종목이 나쁠 때 큰 손실이 납니다. 종목을 나눠 담으면 리스크도 나눌 수 있습니다.';
  } else {
    whyItMatters = '분산 투자는 위험을 줄이고 장기적으로 안정적인 수익을 만들어주는 가장 기본적인 방법입니다.';
  }

  return {
    currentScore,
    improvedScore,
    recommendations,
    suggestedPortfolio,
    finalConclusion,
    topActions,
    beforeAfterSummary,
    whyItMatters,
  };
}
