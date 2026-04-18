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
  weight: number;
  isNew: boolean;
};

export type RebalanceResult = {
  currentScore: number;
  improvedScore: number;
  recommendations: string[];
  suggestedPortfolio: RebalanceSuggestion[];
};

export type ScoreRule = {
  label: string;
  passed: boolean;
  delta: number;
};

export type PersonalReturn = {
  ticker: string;
  returnPct: number;
  weight: number;
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
};
