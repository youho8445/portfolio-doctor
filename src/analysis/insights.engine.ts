import { pickEtf } from './etf-pick';

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
  // M3: ETF-only portfolios are already diversified — use relaxed scoring
  const isEtfOnly = etfItems.length > 0 && stockItems.length === 0;

  const scorableSectors = sectorExposure.filter(
    (s) => s.sector !== 'Cash' && s.sector !== 'ETF',
  );
  const topSector = scorableSectors[0];
  const topSectorWeight = topSector?.weight ?? 0;
  const topSectorName = topSector?.sector ?? '';
  const uniqueSectorCount = scorableSectors.length;

  // ── Diversification Score ────────────────────────────────────────────────
  let divScore = 100;

  // 보유 종목 수 — M3: ETF-only portfolios skip this penalty (each ETF is already diversified)
  if (!isEtfOnly) {
    if (nonCash.length < 4) divScore -= 25;
    else if (nonCash.length < 7) divScore -= 10;
  }

  // 상위 3종목 집중도 — M3: ETF-only uses 95% threshold
  if (top3Concentration >= (isEtfOnly ? 95 : 80)) divScore -= 25;
  else if (!isEtfOnly && top3Concentration >= 60) divScore -= 15;
  else if (!isEtfOnly && top3Concentration >= 40) divScore -= 5;

  // 최대 섹터 집중도 (ETF-only: topSectorWeight is 0 since ETF bucket is excluded, so never fires)
  if (topSectorWeight >= 70) divScore -= 25;
  else if (topSectorWeight >= 50) divScore -= 15;
  else if (topSectorWeight >= 35) divScore -= 5;

  // 섹터 다양성 — M3: ETF-only skips (uniqueSectorCount is 0 for ETF-only, would always fire)
  if (!isEtfOnly && uniqueSectorCount <= 1) divScore -= 15;
  else if (!isEtfOnly && uniqueSectorCount <= 2) divScore -= 5;

  // ETF 포함 시 다양성 보너스
  if (etfWeight >= 30) divScore += 10;
  else if (etfWeight >= 10) divScore += 5;

  divScore = Math.min(100, Math.max(0, divScore));

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights: string[] = [];

  if (topSectorWeight >= 60) {
    insights.push(
      `비슷한 업종 주식에 ${topSectorWeight.toFixed(0)}%가 몰려 있어요. 그 업종이 어려워지면 한꺼번에 타격받을 수 있어요`,
    );
  } else if (topSectorWeight >= 35) {
    insights.push(
      `같은 업종 주식이 전체의 ${topSectorWeight.toFixed(0)}%를 차지해요`,
    );
  }

  if (top3Concentration >= 75) {
    insights.push(
      `가장 많이 보유한 종목 3개에 ${top3Concentration.toFixed(0)}%가 몰려 있어요`,
    );
  }

  if (etfWeight >= 20) {
    insights.push(
      `수백 개 회사에 한 번에 분산 투자하는 펀드가 ${etfWeight.toFixed(0)}% 포함돼 있어요. 자연스럽게 위험이 분산되고 있어요`,
    );
  }

  if (uniqueSectorCount >= 5) {
    insights.push(`${uniqueSectorCount}가지 다른 분야에 투자하고 있어요. 한 분야가 어려워도 다른 분야가 버텨줄 수 있어요`);
  }

  if (stockItems.length === 0 && etfItems.length > 0) {
    insights.push('펀드만으로 구성된 포트폴리오예요. 적은 비용으로 넓게 분산된 투자를 하고 있어요');
  }

  const excessReturn = portfolioReturn - benchmarkReturn;
  if (excessReturn > 5) {
    insights.push(
      `미국 시장 평균보다 ${excessReturn.toFixed(1)}% 높은 수익을 내고 있어요`,
    );
  } else if (excessReturn < -5) {
    insights.push(
      `미국 시장 평균보다 ${Math.abs(excessReturn).toFixed(1)}% 낮은 수익이에요. 다양한 곳에 나눠 투자하면 장기적으로 도움이 될 수 있어요`,
    );
  }

  // ── Rebalance Hints ───────────────────────────────────────────────────────
  const rebalanceHints: string[] = [];

  if (topSectorWeight >= 65) {
    rebalanceHints.push(
      `다른 분야 주식이나 펀드를 1~2개 추가하면 한 분야가 어려워져도 충격이 줄어들어요`,
    );
  }

  if (uniqueSectorCount <= 2 && stockItems.length > 0) {
    rebalanceHints.push('음식·의료·은행 같은 다른 분야를 1개만 추가해도 위험이 분산되는 효과가 생겨요');
  }

  if (top3Concentration >= 75) {
    rebalanceHints.push('많이 보유한 종목의 비중을 조금 줄이고 새 종목을 추가하면 안정성이 높아져요');
  }

  if (etfWeight === 0 && stockItems.length >= 1) {
    const totalNonCashWeight = nonCash.reduce((s, i) => s + i.weight, 0);
    const krWeight = items
      .filter((i) => i.ticker.endsWith('.KS') || i.ticker.endsWith('.KQ'))
      .reduce((s, i) => s + i.weight, 0);
    const isKrHeavy = totalNonCashWeight > 0 && krWeight / totalNonCashWeight > 0.5;
    const etf = pickEtf({
      nonCashTickers: nonCash.map((i) => i.ticker),
      isKrHeavy,
      topSectorName,
      topSectorWeight,
      isSingleStock: stockItems.length === 1,
    });
    rebalanceHints.push(etf.hint);
  }

  if (nonCash.length < 3) {
    rebalanceHints.push('종목을 1~2개 더 추가하면 한 종목이 크게 떨어져도 전체 충격이 줄어들어요');
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
