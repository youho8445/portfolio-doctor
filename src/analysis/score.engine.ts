export interface ScoreRule {
  label: string;
  passed: boolean;
  delta: number;
}

export interface ItemMeta {
  ticker: string;
  weight: number;
  sector: string;
  assetType: string;
}

export interface ScoreInput {
  items: ItemMeta[];
  top3Concentration: number;
  maxSectorWeight: number;
  maxSectorName: string;
  portfolioReturn: number;
  benchmarkReturn: number;
}

export function computeScore(input: ScoreInput): {
  healthScore: number;
  scoreBreakdown: ScoreRule[];
  warnings: string[];
} {
  const { items, top3Concentration, maxSectorWeight, maxSectorName, portfolioReturn, benchmarkReturn } = input;

  const isCashItem = (i: ItemMeta) =>
    i.assetType === 'CASH' || i.ticker.toUpperCase() === 'CASH';

  const nonCashItems = items.filter((i) => !isCashItem(i));
  const stockItems = nonCashItems.filter((i) => i.assetType !== 'ETF');

  const rules: ScoreRule[] = [];
  const warnings: string[] = [];
  let healthScore = 100;

  // Rule 1: 보유 종목 수 (현금 제외)
  const holdingsPass = nonCashItems.length >= 4;
  rules.push({ label: '보유 종목 수 4개 이상', passed: holdingsPass, delta: holdingsPass ? 0 : -10 });
  if (!holdingsPass) {
    warnings.push(`보유 종목 수가 너무 적습니다 (현재 ${nonCashItems.length}개, 권장 4개 이상)`);
    healthScore -= 10;
  }

  // Rule 2: 상위 3종목 집중도
  const top3Pass = top3Concentration < 70;
  rules.push({ label: '상위 3종목 집중도 70% 미만', passed: top3Pass, delta: top3Pass ? 0 : -20 });
  if (!top3Pass) {
    warnings.push(`상위 3개 종목이 포트폴리오의 ${top3Concentration.toFixed(1)}%를 차지합니다 (권장 70% 미만)`);
    healthScore -= 20;
  }

  // Rule 3: 섹터 편중 (ETF·현금 제외 섹터 기준)
  const sectorPass = maxSectorWeight < 60;
  rules.push({ label: '최대 섹터 비중 60% 미만', passed: sectorPass, delta: sectorPass ? 0 : -20 });
  if (!sectorPass) {
    warnings.push(`${maxSectorName} 섹터 편중이 심합니다 (${maxSectorWeight.toFixed(1)}% > 60%)`);
    healthScore -= 20;
  }

  // Rule 4: 단일 종목 과대 비중 (ETF·현금 제외)
  const overweightStock = stockItems.find((i) => i.weight > 40);
  const overweightPass = !overweightStock;
  rules.push({ label: '단일 종목 비중 40% 미만 (ETF 제외)', passed: overweightPass, delta: overweightPass ? 0 : -10 });
  if (!overweightPass && overweightStock) {
    warnings.push(`${overweightStock.ticker}의 단일 비중이 너무 높습니다 (${overweightStock.weight.toFixed(1)}% > 40%)`);
    healthScore -= 10;
  }

  // Rule 5: 벤치마크 초과 수익
  const excessReturn = portfolioReturn - benchmarkReturn;
  const benchmarkPass = excessReturn >= 0;
  rules.push({ label: '벤치마크 초과 수익', passed: benchmarkPass, delta: benchmarkPass ? 0 : -10 });
  if (!benchmarkPass) {
    warnings.push(`포트폴리오 수익률이 벤치마크 대비 ${Math.abs(excessReturn).toFixed(2)}% 낮습니다`);
    healthScore -= 10;
  }

  // 현금 비중 경고 (점수 차감 없음)
  const cashWeight = items.filter(isCashItem).reduce((sum, i) => sum + i.weight, 0);
  if (cashWeight > 30) {
    warnings.push(`현금 비중이 높습니다 (${cashWeight.toFixed(1)}%)`);
  }

  return {
    healthScore: Math.max(0, healthScore),
    scoreBreakdown: rules,
    warnings,
  };
}
