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
          message: `${curItem.name || curItem.ticker} 비중이 ${curItem.weight.toFixed(1)}%가 됐어요. 한 종목에 너무 집중되면 그 회사 이슈가 전체에 영향을 줘요.`,
          severity: 'warning',
          metadataJson: JSON.stringify({ ticker: curItem.ticker, weight: curItem.weight }),
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
      message: `${current.maxSectorName} 분야 비중이 ${curSect.toFixed(1)}%까지 높아졌어요. 한 분야가 흔들리면 전체가 함께 영향받을 수 있어요.`,
      severity: 'warning',
    });
  }

  // E. TOP3_CONCENTRATION_ENTERED — top 3 crosses 75%
  const TOP3_THRESHOLD = 75;
  if (prevTop3 < TOP3_THRESHOLD && curTop3 >= TOP3_THRESHOLD) {
    events.push({
      eventType: 'TOP3_CONCENTRATION_ENTERED',
      title: '상위 3개 종목에 너무 집중됐어요',
      message: `상위 3개 종목이 전체의 ${curTop3.toFixed(1)}%를 차지해요. 위험이 특정 종목에 집중되어 있어요.`,
      severity: 'warning',
    });
  }

  // F. REBALANCE_NEEDED — score crosses below 60
  if (prevH >= 60 && curH < 60) {
    events.push({
      eventType: 'REBALANCE_NEEDED',
      title: '리밸런싱이 필요한 상태예요',
      message: `포트폴리오 건강 점수가 ${Math.round(curH)}점으로 낮아졌어요. 지금 조금만 조정하면 크게 좋아질 수 있어요.`,
      severity: curH < 40 ? 'critical' : 'warning',
    });
  }

  // G. OPPORTUNITY_AVAILABLE — rebalancing can improve score by 15+
  if (current.rebalanceImprovement != null && current.rebalanceImprovement >= 15) {
    events.push({
      eventType: 'OPPORTUNITY_AVAILABLE',
      title: '조금만 바꾸면 크게 좋아질 수 있어요',
      message: `지금 리밸런싱하면 분산도를 ${Math.round(current.rebalanceImprovement)}점 높일 수 있어요. 작은 조정이 큰 차이를 만들어요.`,
      severity: 'opportunity',
    });
  }

  return events;
}
