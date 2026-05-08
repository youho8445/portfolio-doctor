export interface GlossaryTerm {
  term: string;
  category: '기초' | '시장' | '투자자' | '포트폴리오';
  description: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  // 기초
  { term: '주식', category: '기초', description: '기업의 소유권을 잘게 나눈 것. 주식을 사면 그 기업의 주주가 된다.' },
  { term: 'ETF', category: '기초', description: '여러 종목을 한 바구니에 담아 주식처럼 사고파는 상품. 분산 투자를 쉽게 할 수 있다.' },
  { term: '지수', category: '기초', description: '시장 전체나 특정 그룹의 가격 흐름을 숫자 하나로 나타낸 것. 예: 코스피, S&P 500.' },
  { term: '배당', category: '기초', description: '기업이 번 돈 일부를 주주에게 나눠주는 것. 주식을 보유하기만 해도 받을 수 있다.' },
  { term: '평단가', category: '기초', description: '내가 산 가격의 평균. 여러 번 나눠 샀을 때 각 구매 가격을 평균 낸 값이다.' },
  { term: '수익률', category: '기초', description: '원금 대비 얼마나 벌었는지(또는 잃었는지)를 %로 나타낸 것.' },

  // 시장
  { term: '코스피', category: '시장', description: '한국거래소에 상장된 대형 기업들의 주가를 종합한 지수. 한국 경제의 온도계다.' },
  { term: '코스닥', category: '시장', description: '코스피보다 규모는 작지만 성장성 높은 IT·바이오 기업이 많이 상장된 한국 시장.' },
  { term: 'S&P 500', category: '시장', description: '미국을 대표하는 500개 대형 기업의 주가를 종합한 지수. 전 세계 투자자가 기준으로 삼는다.' },
  { term: '나스닥', category: '시장', description: '애플·구글·아마존 등 기술주 중심의 미국 주식 시장. 성장주 비중이 높다.' },
  { term: '나스닥 100', category: '시장', description: '나스닥 상장 기업 중 시가총액 상위 100개만 추린 지수. QQQ ETF가 이것을 추종한다.' },
  { term: '환율', category: '시장', description: '달러 1개를 사려면 원화가 얼마 필요한지를 나타내는 숫자. 환율이 오르면 해외 주식의 원화 가치도 올라간다.' },

  // 투자자
  { term: '개인', category: '투자자', description: '일반 개인 투자자. "개미"라고도 불린다.' },
  { term: '외국인', category: '투자자', description: '해외에서 한국 주식을 사고파는 투자자. 이들의 매수·매도가 시장에 큰 영향을 준다.' },
  { term: '기관', category: '투자자', description: '펀드·보험·연기금 같은 국내 대형 투자 주체. 오랜 기간 대량으로 거래하는 경향이 있다.' },

  // 포트폴리오
  { term: '분산', category: '포트폴리오', description: '여러 자산·종목에 나눠 투자해 한 곳이 크게 떨어져도 전체 손실을 줄이는 전략.' },
  { term: '리밸런싱', category: '포트폴리오', description: '시간이 지나 비중이 틀어진 포트폴리오를 원래 목표 비중으로 다시 맞추는 것.' },
  { term: '비중', category: '포트폴리오', description: '전체 자산 중 특정 종목이나 섹터가 차지하는 %.' },
  { term: '섹터', category: '포트폴리오', description: '기업을 사업 종류별로 묶은 분류. 예: IT, 헬스케어, 금융, 에너지.' },
  { term: '변동성', category: '포트폴리오', description: '가격이 얼마나 크게 오르내리는지를 나타내는 수치. 변동성이 클수록 리스크도 크다.' },
  { term: '벤치마크', category: '포트폴리오', description: '내 포트폴리오 성과를 비교할 기준 지수. S&P 500이나 코스피를 많이 쓴다.' },
];

export const GLOSSARY_CATEGORIES = ['전체', '기초', '시장', '투자자', '포트폴리오'] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];
