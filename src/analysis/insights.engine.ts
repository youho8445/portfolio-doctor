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
      `${topSectorName} 섹터에 ${topSectorWeight.toFixed(0)}%가 집중돼 있어요. 섹터 리스크를 인지하고 투자하세요`,
    );
  } else if (topSectorWeight >= 35) {
    insights.push(
      `${topSectorName} 섹터가 주요 비중(${topSectorWeight.toFixed(0)}%)을 차지해요`,
    );
  }

  if (top3Concentration >= 75) {
    insights.push(
      `상위 3개 종목에 ${top3Concentration.toFixed(0)}%가 집중돼 있어요`,
    );
  }

  if (etfWeight >= 20) {
    insights.push(
      `ETF ${etfWeight.toFixed(0)}% 편입으로 자연스러운 분산 효과를 얻고 있어요`,
    );
  }

  if (uniqueSectorCount >= 5) {
    insights.push(`${uniqueSectorCount}개 섹터에 분산돼 있어 특정 산업 충격에 강한 구조예요`);
  }

  if (stockItems.length === 0 && etfItems.length > 0) {
    insights.push('ETF 중심 포트폴리오로, 낮은 비용으로 폭넓은 분산이 가능해요');
  }

  const excessReturn = portfolioReturn - benchmarkReturn;
  if (excessReturn > 5) {
    insights.push(
      `S&P 500 대비 ${excessReturn.toFixed(1)}% 높은 수익률을 기록하고 있어요`,
    );
  } else if (excessReturn < -5) {
    insights.push(
      `S&P 500 대비 ${Math.abs(excessReturn).toFixed(1)}% 낮은 수익률이에요. 장기적으로 분산 전략이 도움될 수 있어요`,
    );
  }

  // ── Rebalance Hints ───────────────────────────────────────────────────────
  const rebalanceHints: string[] = [];

  if (topSectorWeight >= 65) {
    rebalanceHints.push(
      `${topSectorName} 외 다른 섹터 종목을 1~2개 추가하면 급락 리스크를 줄일 수 있어요`,
    );
  }

  if (uniqueSectorCount <= 2 && stockItems.length > 0) {
    rebalanceHints.push('소비재, 헬스케어, 금융 등 다른 섹터를 1개만 추가해도 분산 효과가 생겨요');
  }

  if (top3Concentration >= 75) {
    rebalanceHints.push('집중된 종목 비중을 조금 낮추고 새 종목을 추가하면 변동성을 줄일 수 있어요');
  }

  if (etfWeight === 0 && stockItems.length >= 1) {
    rebalanceHints.push('VOO, QQQ 같은 ETF를 10~20% 편입하면 손쉽게 분산 효과를 높일 수 있어요');
  }

  if (nonCash.length < 3) {
    rebalanceHints.push('종목을 1~2개 더 추가하면 한 종목 급락에도 전체 충격이 줄어들어요');
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
