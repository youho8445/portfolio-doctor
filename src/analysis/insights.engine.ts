export interface InsightInput {
  items: { ticker: string; weight: number; sector: string; assetType: string }[];
  top3Concentration: number;
  sectorExposure: { sector: string; weight: number }[];
  portfolioReturn: number;
  benchmarkReturn: number;
}

export interface InsightOutput {
  diversificationScore: number;
  insights: string[];
  rebalanceHints: string[];
  portfolioStyle: string;
}

export function computeInsights(input: InsightInput): InsightOutput {
  const { items, top3Concentration, sectorExposure, portfolioReturn, benchmarkReturn } = input;

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

  // ── Diversification Score ────────────────────────────────────────────────
  let divScore = 100;

  // 보유 종목 수 (현금·ETF 제외 기준)
  if (nonCash.length < 4) divScore -= 25;
  else if (nonCash.length < 7) divScore -= 10;

  // 상위 3종목 집중도
  if (top3Concentration >= 80) divScore -= 25;
  else if (top3Concentration >= 60) divScore -= 15;
  else if (top3Concentration >= 40) divScore -= 5;

  // 최대 섹터 집중도
  if (topSectorWeight >= 70) divScore -= 25;
  else if (topSectorWeight >= 50) divScore -= 15;
  else if (topSectorWeight >= 35) divScore -= 5;

  // 섹터 다양성
  if (uniqueSectorCount <= 1) divScore -= 15;
  else if (uniqueSectorCount <= 2) divScore -= 5;

  // ETF 포함 시 다양성 보너스
  if (etfWeight >= 30) divScore += 10;
  else if (etfWeight >= 10) divScore += 5;

  divScore = Math.min(100, Math.max(0, divScore));

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights: string[] = [];

  if (topSectorWeight >= 60) {
    insights.push(
      `${topSectorName} 섹터 비중이 높습니다 (${topSectorWeight.toFixed(1)}%)`,
    );
  } else if (topSectorWeight >= 35) {
    insights.push(
      `${topSectorName} 섹터가 포트폴리오의 ${topSectorWeight.toFixed(1)}%를 차지합니다`,
    );
  }

  if (top3Concentration >= 70) {
    insights.push(
      `상위 3개 종목이 포트폴리오의 ${top3Concentration.toFixed(1)}%를 차지합니다`,
    );
  }

  if (etfWeight >= 20) {
    insights.push(
      `ETF 비중(${etfWeight.toFixed(1)}%)이 분산투자에 기여하고 있습니다`,
    );
  }

  if (uniqueSectorCount >= 5) {
    insights.push(`${uniqueSectorCount}개 섹터에 분산 투자되어 있습니다`);
  }

  if (stockItems.length === 0 && etfItems.length > 0) {
    insights.push('ETF로만 구성된 포트폴리오입니다');
  }

  const excessReturn = portfolioReturn - benchmarkReturn;
  if (excessReturn > 5) {
    insights.push(
      `벤치마크 대비 ${excessReturn.toFixed(1)}% 초과 수익을 달성했습니다`,
    );
  } else if (excessReturn < -5) {
    insights.push(
      `벤치마크 대비 ${Math.abs(excessReturn).toFixed(1)}% 낮은 수익률을 보이고 있습니다`,
    );
  }

  // ── Rebalance Hints ───────────────────────────────────────────────────────
  const rebalanceHints: string[] = [];

  if (topSectorWeight >= 60) {
    rebalanceHints.push(
      `${topSectorName} 섹터 비중을 60% 이하로 줄이는 것을 고려하세요`,
    );
  }

  if (uniqueSectorCount <= 2 && stockItems.length > 0) {
    rebalanceHints.push('다른 섹터 종목 추가로 섹터 분산을 높이세요');
  }

  if (top3Concentration >= 70) {
    rebalanceHints.push('상위 집중 종목의 비중을 줄이고 다른 종목을 추가하세요');
  }

  if (etfWeight === 0 && stockItems.length >= 1) {
    rebalanceHints.push('ETF를 일부 편입하면 분산 효과를 높일 수 있습니다');
  }

  if (nonCash.length < 4) {
    rebalanceHints.push('종목 수를 4개 이상으로 늘려 리스크를 분산하세요');
  }

  // ── Portfolio Style ───────────────────────────────────────────────────────
  let portfolioStyle: string;

  const isEtfHeavy = etfWeight >= 60;
  const isTechConcentrated =
    topSectorName === 'Information Technology' && topSectorWeight >= 55;
  const isConcentrated = top3Concentration >= 70 || topSectorWeight >= 60;
  const isDiversified = uniqueSectorCount >= 5 && top3Concentration < 50;

  if (isEtfHeavy) {
    portfolioStyle = 'ETF 중심형';
  } else if (isTechConcentrated) {
    portfolioStyle = '테크 집중형';
  } else if (isConcentrated) {
    portfolioStyle = '집중 투자형';
  } else if (isDiversified && etfWeight >= 20) {
    portfolioStyle = '균형 분산형';
  } else if (isDiversified) {
    portfolioStyle = '분산 성장형';
  } else {
    portfolioStyle = '일반 성장형';
  }

  return {
    diversificationScore: divScore,
    insights,
    rebalanceHints,
    portfolioStyle,
  };
}
