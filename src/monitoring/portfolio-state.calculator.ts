import { PortfolioStateValue } from '../entities/portfolio-state.entity';

export interface StateInput {
  healthScore: number;
  diversScore: number;
  top3Concentration: number;
  maxSectorWeight: number;
  maxSectorName: string;
  items?: { ticker: string; weight: number; assetType: string }[];
}

export interface PreviousStateSnapshot {
  state: PortfolioStateValue;
  healthScore: number;
  diversScore: number;
}

export interface StateResult {
  state: PortfolioStateValue;
  reason: string;
  trend: 'up' | 'down' | 'same';
}

export function calculateState(
  current: StateInput,
  previous?: PreviousStateSnapshot,
): StateResult {
  const h = Number(current.healthScore);
  const d = Number(current.diversScore);
  const top3 = Number(current.top3Concentration);
  const sector = Number(current.maxSectorWeight);

  const trend = resolveTrend(h, previous);

  // 1. risky — absolute risk threshold
  if (h < 50) {
    return { state: 'risky', reason: '포트폴리오 건강도가 낮아요. 전반적인 점검이 필요해요.', trend };
  }

  // 2. deteriorating — negative trajectory
  if (previous) {
    const prevH = Number(previous.healthScore);
    const prevD = Number(previous.diversScore);
    if (h <= prevH - 10 || d <= prevD - 10) {
      return { state: 'deteriorating', reason: '이전 분석보다 포트폴리오 상태가 나빠지고 있어요.', trend };
    }
  }

  // 3. concentrated — allocation imbalance
  if (top3 >= 75) {
    return { state: 'concentrated', reason: '상위 3개 종목에 자산이 집중되어 있어요.', trend };
  }
  if (sector >= 65) {
    return {
      state: 'concentrated',
      reason: `${current.maxSectorName || '특정'} 섹터 비중이 너무 높아요.`,
      trend,
    };
  }
  const overweightStock = current.items?.find(
    (i) => (i.assetType ?? '').toUpperCase() !== 'ETF' && Number(i.weight) >= 50,
  );
  if (overweightStock) {
    return { state: 'concentrated', reason: '단일 종목 비중이 50%를 넘었어요.', trend };
  }

  // 4. improving — positive recovery from a bad state
  if (previous) {
    const prevH = Number(previous.healthScore);
    const wasUnhealthy = ['risky', 'concentrated', 'deteriorating'].includes(previous.state);
    if (wasUnhealthy && h >= prevH + 5) {
      return { state: 'improving', reason: '이전보다 포트폴리오가 개선되고 있어요.', trend };
    }
  }

  // 5. stable — default
  return { state: 'stable', reason: '포트폴리오가 균형 잡힌 상태예요.', trend };
}

function resolveTrend(
  currentHealth: number,
  previous?: PreviousStateSnapshot,
): 'up' | 'down' | 'same' {
  if (!previous) return 'same';
  const delta = currentHealth - Number(previous.healthScore);
  if (delta > 2) return 'up';
  if (delta < -2) return 'down';
  return 'same';
}
