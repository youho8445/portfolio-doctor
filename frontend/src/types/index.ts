export type Security = {
  id: number;
  ticker: string;
  name: string;
  displayNameKo: string | null;
  sector: string | null;
  industry: string | null;
  country: string;
  assetType: string;
  createdAt: string;
};

export type PortfolioInputItem = {
  securityId: number;
  ticker: string;
  name: string;
  displayNameKo: string | null;
  weight: number;
  amount: number;
  avgCost: number;
};

export type Portfolio = {
  id: number;
  name: string;
  createdAt: string;
};

export type SavedPortfolioItem = {
  id: number;
  portfolioId: number;
  securityId: number;
  weight: number;
  amount: number | null;
  avgCost: number | null;
  security: {
    id: number;
    ticker: string;
    name: string;
    displayNameKo: string | null;
    sector: string | null;
  };
};

export type RebalanceSuggestion = {
  ticker: string;
  name: string;
  weight: number;
  isNew: boolean;
};

export type RebalanceAction = {
  ticker: string;
  label: string;
  type: 'reduce' | 'add' | 'drift';
  from: number;
  to: number;
  delta: number;
  text: string;
};

export type BaselineDrift = {
  ticker: string;
  label: string;
  baselineWeight: number;
  currentWeight: number;
  delta: number;
  status: 'added' | 'removed' | 'increased' | 'decreased' | 'unchanged';
};

export type RebalanceResult = {
  currentScore: number;
  improvedScore: number;
  actions: RebalanceAction[];
  suggestedPortfolio: RebalanceSuggestion[];
  summary: string;
  beforeAfterSummary: string;
  whyItMatters: string;
  baselineDrift: BaselineDrift[];
  baselineDate: string | null;
};

export type ScoreRule = {
  label: string;
  passed: boolean;
  delta: number;
  why: string;
  action: string;
};

export type PersonalReturn = {
  ticker: string;
  returnPct: number;
  weight: number;
};

export type HistoryChange = {
  healthScoreDelta: number;
  diversificationScoreDelta: number;
  top3ConcentrationDelta: number;
};

export type HistoryTrendPoint = {
  date: string;
  healthScore: number;
  diversificationScore: number;
};

export type PortfolioHistory = {
  trend: HistoryTrendPoint[];
  alerts: string[];
  change: HistoryChange | null;
};

export type StateEvent = {
  id: number;
  userId: number;
  portfolioId: number;
  eventType: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'opportunity';
  metadataJson: string | null;
  isRead: boolean;
  detectedAt: string;
  createdAt: string;
  impactBody: string | null;
  actionType: string | null;
  actionLabel: string | null;
  isPremiumFeature: boolean;
};

export type PortfolioCurrentState = {
  state: 'stable' | 'concentrated' | 'risky' | 'improving' | 'deteriorating';
  reason: string;
  trend: 'up' | 'down' | 'same';
  metrics: {
    healthScore: number;
    diversScore: number;
    top3Concentration: number;
    maxSectorWeight: number;
    maxSectorName: string;
  };
  changedAt: string;
  lastEventDetectedAt: string | null;
} | null;

export type PortfolioSummary = {
  healthScore: number;
  top3Concentration: number;
  topHolding: { name: string; ticker: string; weight: number } | null;
  topSector: { sector: string; weight: number } | null;
};

export type AnalysisResult = {
  portfolioId: number;
  portfolioName: string;
  period: '1M' | '3M' | '1Y';
  benchmarkCode: string;
  healthScore: number;
  diversificationScore: number;
  scoreBreakdown: ScoreRule[];
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  personalReturn: number | null;
  personalReturns: PersonalReturn[];
  top3Concentration: number;
  sectorExposure: { sector: string; weight: number }[];
  warnings: string[];
  insights: string[];
  rebalanceHints: string[];
  portfolioStyle: string;
  rebalanceResult: RebalanceResult | null;
  history: PortfolioHistory;
  isPremium: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  diversificationPercentile: number;
  hasStalePrices?: boolean;
  staleTickers?: string[];
  currencyWarnings?: string[];
};
