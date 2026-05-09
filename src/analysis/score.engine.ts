export interface ScoreRule {
  label: string;
  passed: boolean;
  delta: number;
  why: string;
  action: string;
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
  hasStaleData?: boolean;
}

export function computeScore(input: ScoreInput): {
  healthScore: number;
  scoreBreakdown: ScoreRule[];
  warnings: string[];
} {
  const { items, top3Concentration, maxSectorWeight, portfolioReturn, benchmarkReturn, hasStaleData } = input;

  const isCashItem = (i: ItemMeta) =>
    i.assetType === 'CASH' || i.ticker.toUpperCase() === 'CASH';

  const nonCashItems = items.filter((i) => !isCashItem(i));
  const stockItems = nonCashItems.filter((i) => i.assetType !== 'ETF');

  const rules: ScoreRule[] = [];
  const warnings: string[] = [];
  let healthScore = 100;

  // Rule 1: 종목 수
  const holdingsPass = nonCashItems.length >= 3;
  rules.push({
    label: '여러 종목에 나눠서 투자하고 있나요?',
    passed: holdingsPass,
    delta: holdingsPass ? 0 : -10,
    why: '종목이 적으면 그 중 하나가 크게 떨어질 때 계좌 전체가 흔들려요.',
    action: `종목을 ${Math.max(0, 3 - nonCashItems.length)}개만 더 추가해 보세요. 서로 다른 회사면 더 좋아요.`,
  });
  if (!holdingsPass) {
    warnings.push(`지금은 ${nonCashItems.length}개 종목만 갖고 있어요. ${3 - nonCashItems.length}개만 더 추가하면 한 종목이 떨어져도 충격이 줄어들어요`);
    healthScore -= 10;
  }

  // Rule 2: 상위 3종목 집중
  const top3Pass = top3Concentration < 75;
  rules.push({
    label: '한두 종목에 너무 많은 돈이 몰려 있지 않나요?',
    passed: top3Pass,
    delta: top3Pass ? 0 : -20,
    why: '상위 종목들에 대부분이 쏠려 있으면, 그 중 하나가 나쁜 뉴스를 맞았을 때 계좌가 크게 흔들려요.',
    action: '비중이 높은 종목을 조금 줄이고, 그 돈으로 다른 종목을 추가해 보세요.',
  });
  if (!top3Pass) {
    warnings.push(`상위 3개 종목에 ${top3Concentration.toFixed(0)}%가 몰려 있어요. 한 종목이 갑자기 떨어지면 계좌 전체가 크게 흔들릴 수 있어요`);
    healthScore -= 20;
  }

  // Rule 3: 같은 업종 집중
  const sectorPass = maxSectorWeight < 65;
  rules.push({
    label: '비슷한 종류의 회사에 너무 집중되어 있지 않나요?',
    passed: sectorPass,
    delta: sectorPass ? 0 : -20,
    why: '같은 분야 회사들은 같은 시기에 함께 오르고 내려요. 한 분야가 어려워지면 한꺼번에 타격받아요.',
    action: 'IT 주식이 많다면 의료·소비재 등 다른 분야 주식을 1~2개 추가해 보세요.',
  });
  if (!sectorPass) {
    warnings.push(`비슷한 업종 주식에 ${maxSectorWeight.toFixed(0)}%가 몰려 있어요. 그 업종이 어려워지면 한꺼번에 타격받을 수 있어요`);
    healthScore -= 20;
  }

  // Rule 4: 단일 종목 과대 비중
  const overweightStock = stockItems.find((i) => i.weight > 50);
  const overweightPass = !overweightStock;
  const overName = overweightStock?.name || overweightStock?.ticker || '';
  rules.push({
    label: '한 종목에 전체의 절반 이상을 넣지 않았나요?',
    passed: overweightPass,
    delta: overweightPass ? 0 : -10,
    why: '어떤 회사든 예상치 못한 나쁜 소식이 생길 수 있어요. 한 곳에 너무 많이 넣으면 그 충격이 그대로 와요.',
    action: `${overName ? `${overName}의` : '이 종목의'} 비중을 줄이고, 그 돈으로 다른 종목을 추가해 보세요.`,
  });
  if (!overweightPass && overweightStock) {
    warnings.push(`${overName} 주식이 전체의 ${overweightStock.weight.toFixed(0)}%를 차지해요. 이 주식 하나의 결과가 계좌 전체를 결정하고 있어요`);
    healthScore -= 10;
  }

  // Rule 5: 시장 평균 대비 수익 (가격 데이터가 stale이면 점수에 영향 없음)
  if (hasStaleData) {
    rules.push({
      label: '미국 시장 평균만큼 수익이 나고 있나요?',
      passed: true,
      delta: 0,
      why: '일부 가격 데이터가 최신이 아니어서 이번엔 수익률 비교를 건너뛰었어요.',
      action: '',
    });
  } else {
    const excessReturn = portfolioReturn - benchmarkReturn;
    const benchmarkPass = excessReturn >= -5;
    rules.push({
      label: '미국 시장 평균만큼 수익이 나고 있나요?',
      passed: benchmarkPass,
      delta: benchmarkPass ? 0 : -10,
      why: '미국 시장 전체에 분산 투자하는 방법은 장기적으로 꾸준히 성장하는 경향이 있어요.',
      action: 'VOO나 SPY 같은 미국 전체 시장 펀드를 일부 추가해 보세요.',
    });
    if (!benchmarkPass) {
      warnings.push(`미국 시장 평균보다 ${Math.abs(excessReturn).toFixed(1)}% 낮은 수익이에요. 미국 전체 시장 펀드를 일부 추가하면 도움이 될 수 있어요`);
      healthScore -= 10;
    }
  }

  // 현금 과다 (점수 차감 없음)
  const cashWeight = items.filter(isCashItem).reduce((sum, i) => sum + i.weight, 0);
  if (cashWeight > 40) {
    warnings.push(`현금 비중이 ${cashWeight.toFixed(0)}%예요. 장기적으로는 조금씩 다양한 곳에 투자하면 돈이 더 일할 수 있어요`);
  }

  return {
    healthScore: Math.max(0, healthScore),
    scoreBreakdown: rules,
    warnings,
  };
}
