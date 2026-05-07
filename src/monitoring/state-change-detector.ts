// Pure function — no NestJS deps, fully testable

export interface SnapshotState {
  healthScore: number;
  diversificationScore: number;
  top3Concentration: number;
  maxSectorWeight: number;
  maxSectorName: string;
  items?: { ticker: string; name: string; weight: number; assetType: string }[];
  rebalanceImprovement?: number; // improvedScore - currentScore from rebalanceResult
}

export interface DetectedEvent {
  eventType: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'opportunity';
  metadataJson?: string;
  impactBody?: string;
  actionType?: string;
  actionLabel?: string;
  isPremiumFeature?: boolean;
}

export function detectStateChanges(
  current: SnapshotState,
  previous: SnapshotState,
): DetectedEvent[] {
  const events: DetectedEvent[] = [];

  const prevH = Number(previous.healthScore);
  const curH = Number(current.healthScore);
  const prevD = Number(previous.diversificationScore);
  const curD = Number(current.diversificationScore);
  const prevTop3 = Number(previous.top3Concentration);
  const curTop3 = Number(current.top3Concentration);
  const prevSect = Number(previous.maxSectorWeight);
  const curSect = Number(current.maxSectorWeight);

  // A. SCORE_DROP — score falls by 10+ or crosses below 50
  const scoreDrop = prevH - curH;
  if ((prevH >= 50 && curH < 50) || scoreDrop >= 10) {
    events.push({
      eventType: 'SCORE_DROP',
      title: '건강 점수가 하락했어요',
      message: `지난 분석 대비 점수가 ${Math.round(scoreDrop)}점 하락했습니다. (${Math.round(prevH)} → ${Math.round(curH)})`,
      severity: curH < 40 ? 'critical' : 'warning',
      impactBody: '건강 점수 하락은 포트폴리오 전체의 리스크가 높아졌다는 신호예요. 지금 조치하지 않으면 같은 방향으로 계속 악화될 수 있어요.',
      actionType: 'rebalance',
      actionLabel: '리밸런싱 확인하기 →',
      isPremiumFeature: true,
    });
  }

  // B. DIVERSIFICATION_DROP — diversification drops by 10+
  const divDrop = prevD - curD;
  if (divDrop >= 10) {
    events.push({
      eventType: 'DIVERSIFICATION_DROP',
      title: '분산도가 낮아졌어요',
      message: `한쪽으로 자산이 몰리고 있어요. 분산 점수가 ${Math.round(divDrop)}점 하락했습니다. (${Math.round(prevD)} → ${Math.round(curD)})`,
      severity: curD < 40 ? 'critical' : 'warning',
      impactBody: '분산도가 낮아지면 특정 종목이나 섹터의 충격이 포트폴리오 전체에 직접 영향을 줘요. 한쪽이 흔들리면 전체가 함께 흔들려요.',
      actionType: 'rebalance',
      actionLabel: '분산도 개선하기 →',
      isPremiumFeature: true,
    });
  }

  // C. OVERWEIGHT_ENTERED — individual stock crosses 50% (ETFs excluded)
  if (current.items && previous.items) {
    const STOCK_THRESHOLD = 50;
    for (const curItem of current.items) {
      if ((curItem.assetType ?? '').toUpperCase() === 'ETF') continue;
      if (curItem.weight < STOCK_THRESHOLD) continue;
      const prevItem = previous.items.find((p) => p.ticker === curItem.ticker);
      const prevWeight = prevItem?.weight ?? 0;
      if (prevWeight < STOCK_THRESHOLD) {
        events.push({
          eventType: 'OVERWEIGHT_ENTERED',
          title: '한 종목에 너무 많이 몰렸어요',
          message: `${curItem.name || curItem.ticker} 비중이 ${prevWeight.toFixed(1)}%에서 ${curItem.weight.toFixed(1)}%로 증가했어요. 단일 종목 집중 위험 진입.`,
          severity: 'warning',
          metadataJson: JSON.stringify({ ticker: curItem.ticker, weight: curItem.weight }),
          impactBody: '한 종목이 50% 이상이면, 그 회사 한 곳의 이슈가 내 자산의 절반에 영향을 줘요. 분산 투자의 핵심은 한 바구니에 담지 않는 것이에요.',
          actionType: 'reduce_concentration',
          actionLabel: '비중 조정하기 →',
          isPremiumFeature: true,
        });
      }
    }
  }

  // D. SECTOR_BIAS_ENTERED — sector crosses 65%
  const SECT_THRESHOLD = 65;
  if (prevSect < SECT_THRESHOLD && curSect >= SECT_THRESHOLD) {
    events.push({
      eventType: 'SECTOR_BIAS_ENTERED',
      title: '비슷한 분야에 너무 몰리고 있어요',
      message: `${current.maxSectorName} 섹터 비중이 ${prevSect.toFixed(1)}%에서 ${curSect.toFixed(1)}%로 증가했어요. 섹터 편중 위험 진입.`,
      severity: 'warning',
      impactBody: '같은 섹터 종목들은 경제 흐름에 따라 함께 움직여요. 섹터 편중은 여러 종목을 보유해도 실질적으로 분산이 안 된 상태예요.',
      actionType: 'diversify_sector',
      actionLabel: '섹터 분산하기 →',
      isPremiumFeature: true,
    });
  }

  // E. TOP3_CONCENTRATION_ENTERED — top 3 crosses 75%
  const TOP3_THRESHOLD = 75;
  if (prevTop3 < TOP3_THRESHOLD && curTop3 >= TOP3_THRESHOLD) {
    events.push({
      eventType: 'TOP3_CONCENTRATION_ENTERED',
      title: '상위 3개 종목에 너무 집중됐어요',
      message: `상위 3개 종목 비중이 ${prevTop3.toFixed(1)}%에서 ${curTop3.toFixed(1)}%로 증가했어요. 상위 집중도 위험 진입.`,
      severity: 'warning',
      impactBody: '상위 3개가 75%를 넘으면 그 3종목의 성과가 곧 포트폴리오 전체 성과예요. 나머지 종목들은 사실상 영향이 없는 셈이에요.',
      actionType: 'rebalance',
      actionLabel: '집중도 낮추기 →',
      isPremiumFeature: true,
    });
  }

  // F. REBALANCE_NEEDED — score crosses below 60
  if (prevH >= 60 && curH < 60) {
    events.push({
      eventType: 'REBALANCE_NEEDED',
      title: '리밸런싱이 필요한 상태예요',
      message: `포트폴리오 건강 점수가 ${Math.round(curH)}점으로 낮아졌어요. 지금 조금만 조정하면 크게 좋아질 수 있어요.`,
      severity: curH < 40 ? 'critical' : 'warning',
      impactBody: '건강 점수 60점 미만은 이미 개선이 필요한 구간이에요. 지금 리밸런싱하면 리스크를 줄이면서 더 나은 성과를 기대할 수 있어요.',
      actionType: 'rebalance',
      actionLabel: '지금 리밸런싱하기 →',
      isPremiumFeature: true,
    });
  }

  // G. OPPORTUNITY_AVAILABLE — rebalancing can improve score by 15+
  if (current.rebalanceImprovement != null && current.rebalanceImprovement >= 15) {
    events.push({
      eventType: 'OPPORTUNITY_AVAILABLE',
      title: '조금만 바꾸면 크게 좋아질 수 있어요',
      message: `지금 리밸런싱하면 분산도를 ${Math.round(current.rebalanceImprovement)}점 높일 수 있어요. 작은 조정이 큰 차이를 만들어요.`,
      severity: 'opportunity',
      impactBody: '작은 비중 조정으로 큰 점수 향상이 가능한 상태예요. 지금이 가장 효율적으로 포트폴리오를 개선할 수 있는 타이밍이에요.',
      actionType: 'rebalance',
      actionLabel: '개선 적용하기 →',
      isPremiumFeature: false,
    });
  }

  return events;
}
