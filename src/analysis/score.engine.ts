export interface ScoreRule {
  label: string;
  passed: boolean;
  delta: number;
}

export interface ItemMeta {
  ticker: string;
  name?: string;
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

  // Rule 1: 보유 종목 수 (3개 이상 — 입문자 기준 완화)
  const holdingsPass = nonCashItems.length >= 3;
  rules.push({ label: '종목 3개 이상 보유', passed: holdingsPass, delta: holdingsPass ? 0 : -10 });
  if (!holdingsPass) {
    warnings.push(`종목을 ${3 - nonCashItems.length}개 더 추가하면 리스크를 줄일 수 있어요 (현재 ${nonCashItems.length}개)`);
    healthScore -= 10;
  }

  // Rule 2: 상위 3종목 집중도 (75% → 입문자 완화)
  const top3Pass = top3Concentration < 75;
  rules.push({ label: '상위 3종목 집중도 75% 미만', passed: top3Pass, delta: top3Pass ? 0 : -20 });
  if (!top3Pass) {
    warnings.push(`상위 3개 종목에 ${top3Concentration.toFixed(0)}%가 집중돼 있어요. 한 종목이 급락하면 전체에 영향을 줄 수 있습니다`);
    healthScore -= 20;
  }

  // Rule 3: 섹터 편중 (65% → 입문자 완화)
  const sectorPass = maxSectorWeight < 65;
  rules.push({ label: '특정 섹터 비중 65% 미만', passed: sectorPass, delta: sectorPass ? 0 : -20 });
  if (!sectorPass) {
    warnings.push(`${maxSectorName} 섹터에 ${maxSectorWeight.toFixed(0)}%가 집중돼 있어요. 다른 섹터를 추가하면 안정성이 높아집니다`);
    healthScore -= 20;
  }

  // Rule 4: 단일 종목 과대 비중 (50% → 입문자 완화, ETF 제외)
  const overweightStock = stockItems.find((i) => i.weight > 50);
  const overweightPass = !overweightStock;
  rules.push({ label: '단일 종목 비중 50% 미만 (ETF 제외)', passed: overweightPass, delta: overweightPass ? 0 : -10 });
  if (!overweightPass && overweightStock) {
    warnings.push(`${overweightStock.ticker} 비중이 ${overweightStock.weight.toFixed(0)}%예요. 이 종목 하나가 포트폴리오 결과를 크게 좌우합니다`);
    healthScore -= 10;
  }

  // Rule 5: 벤치마크 비교 (패널티 제거 — 정보성만)
  const excessReturn = portfolioReturn - benchmarkReturn;
  const benchmarkPass = excessReturn >= -5; // -5% 이내는 통과
  rules.push({ label: '벤치마크 대비 수익률', passed: benchmarkPass, delta: benchmarkPass ? 0 : -10 });
  if (!benchmarkPass) {
    warnings.push(`S&P 500 대비 ${Math.abs(excessReturn).toFixed(1)}% 낮은 수익률이에요. 장기 분산 투자가 도움이 될 수 있습니다`);
    healthScore -= 10;
  }

  // 현금 비중 경고 (점수 차감 없음)
  const cashWeight = items.filter(isCashItem).reduce((sum, i) => sum + i.weight, 0);
  if (cashWeight > 40) {
    warnings.push(`현금 비중이 ${cashWeight.toFixed(0)}%예요. 일부를 분산 투자하면 장기 수익 기회가 커질 수 있습니다`);
  }

  return {
    healthScore: Math.max(0, healthScore),
    scoreBreakdown: rules,
    warnings,
  };
}
