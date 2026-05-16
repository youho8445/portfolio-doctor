export interface GlossaryTerm {
  term: string;
  category: '기본 개념' | '투자 행동' | '리스크 관리' | '시장/지수' | '재무지표' | '투자자/수급' | '심리/밈 용어';
  description: string;
  aliases?: string[];
  example?: string;
  caution?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  // ── 기본 개념 ──────────────────────────────────────────────
  {
    term: '주식',
    category: '기본 개념',
    description: '기업의 소유권을 잘게 나눈 것. 주식을 사면 그 기업의 주주가 된다.',
  },
  {
    term: 'ETF',
    category: '기본 개념',
    description: '여러 종목을 한 바구니에 담아 주식처럼 사고파는 상품. 분산 투자를 쉽게 할 수 있다.',
    aliases: ['이티에프'],
  },
  {
    term: '지수',
    category: '기본 개념',
    description: '시장 전체나 특정 그룹의 가격 흐름을 숫자 하나로 나타낸 것. 예: 코스피, S&P 500.',
  },
  {
    term: '배당',
    category: '기본 개념',
    description: '기업이 번 돈 일부를 주주에게 나눠주는 것. 주식을 보유하기만 해도 받을 수 있다.',
  },
  {
    term: '평단가',
    category: '기본 개념',
    description: '내가 산 가격의 평균. 여러 번 나눠 샀을 때 각 구매 가격을 평균 낸 값이다.',
  },
  {
    term: '수익률',
    category: '기본 개념',
    description: '원금 대비 얼마나 벌었는지(또는 잃었는지)를 %로 나타낸 것.',
  },
  {
    term: '포트폴리오',
    category: '기본 개념',
    description: '내가 보유한 주식·ETF·현금 등 자산의 전체 구성. 어디에 얼마나 투자했는지를 한눈에 볼 수 있다.',
  },
  {
    term: '인덱스펀드',
    category: '기본 개념',
    description: '코스피, S&P 500 같은 지수를 그대로 따라가도록 설계된 펀드. ETF도 인덱스펀드의 일종이다.',
    aliases: ['index fund'],
  },
  {
    term: '시가총액',
    category: '기본 개념',
    description: '주가 × 발행 주식 수. 시장이 평가하는 회사의 전체 가치를 나타낸다.',
    aliases: ['시총'],
  },

  // ── 투자 행동 ──────────────────────────────────────────────
  {
    term: '손절',
    category: '투자 행동',
    description: '더 큰 손실을 막기 위해 손해를 보고 매도하는 것. "손절선"을 미리 정해두는 게 중요하다.',
    aliases: ['손절매'],
    caution: '감정적으로 손절하면 오히려 저점에서 팔게 되는 경우도 있습니다. 미리 기준을 세워두는 것이 도움이 됩니다.',
  },
  {
    term: '익절',
    category: '투자 행동',
    description: '수익이 난 상태에서 매도해 이익을 확정하는 것. "수익 실현"이라고도 한다.',
    aliases: ['익절매', '수익실현'],
  },
  {
    term: '물타기',
    category: '투자 행동',
    description: '주가가 떨어졌을 때 추가 매수해 평단가를 낮추는 방법. 추가 자금이 필요하고, 잘못된 종목에 쓰면 손실이 더 커질 수 있다.',
    caution: '주가가 계속 하락하는 종목에 반복하면 손실이 눈덩이처럼 커질 수 있어 리스크 관리 차원에서 신중하게 판단해야 합니다.',
  },
  {
    term: '불타기',
    category: '투자 행동',
    description: '주가가 오를 때 추가 매수해 수익을 키우는 방법. 상승 추세를 확인하고 따라가는 방식이다.',
    caution: '고점 근처에서 불타기를 하면 추격매수가 될 수 있습니다. 상승 추세가 이어질지 스스로 판단해야 합니다.',
  },
  {
    term: '몰빵',
    category: '투자 행동',
    description: '자금 대부분을 한 종목에 집중하는 것. 예상이 맞으면 수익이 크지만, 틀리면 손실도 크다.',
    caution: '분산 없이 한 곳에 몰아넣으면 리스크가 집중됩니다. 포트폴리오 비중을 점검해볼 수 있습니다.',
  },
  {
    term: '분할매수',
    category: '투자 행동',
    description: '한 번에 사지 않고 여러 번에 나눠 사는 방법. 평단가를 안정화하는 데 도움이 된다.',
  },
  {
    term: '분할매도',
    category: '투자 행동',
    description: '한 번에 팔지 않고 여러 번에 나눠 파는 방법. 고점을 정확히 맞추기 어려울 때 활용한다.',
  },
  {
    term: '추격매수',
    category: '투자 행동',
    description: '이미 많이 오른 종목을 뒤늦게 따라 사는 것. 오름세를 보고 뒤늦게 뛰어드는 경우를 말한다.',
    caution: '고점 근처에서 매수하게 될 가능성이 높습니다. FOMO나 군중심리에 의해 발생하기 쉬우니 주의가 필요합니다.',
  },
  {
    term: '저점매수',
    category: '투자 행동',
    description: '주가가 많이 떨어진 시점에 사는 것. 저가에 매수할 수 있지만, 저점이 어디인지는 아무도 정확히 알 수 없다.',
    caution: '"저점인 줄 알았는데 더 떨어지는" 상황도 흔합니다. 분할매수로 리스크를 분산하는 방법을 고려해볼 수 있습니다.',
  },
  {
    term: '고점매수',
    category: '투자 행동',
    description: '주가가 고점일 때 매수하는 것. 추격매수나 FOMO로 인해 발생하는 경우가 많다.',
    caution: '고점에서 사면 이후 하락 시 손실 회복에 오랜 시간이 걸릴 수 있습니다.',
  },
  {
    term: '단타',
    category: '투자 행동',
    description: '당일 또는 며칠 내에 사고파는 단기 매매. 거래 횟수가 많아 수수료와 세금이 자주 발생한다.',
    aliases: ['데이트레이딩', 'day trading'],
  },
  {
    term: '스윙',
    category: '투자 행동',
    description: '며칠~몇 주 단위로 사고파는 중단기 매매. 단타보다 길고 장기투자보다는 짧다.',
    aliases: ['스윙트레이딩', 'swing'],
  },
  {
    term: '장기투자',
    category: '투자 행동',
    description: '수년~수십 년을 보유하는 투자 방식. 단기 가격 변동에 흔들리지 않고 꾸준히 보유하는 것이 핵심이다.',
  },

  // ── 리스크 관리 ────────────────────────────────────────────
  {
    term: '리스크',
    category: '리스크 관리',
    description: '투자 원금이 손실될 가능성. 일반적으로 기대 수익이 높을수록 리스크도 크다.',
    aliases: ['risk', '위험'],
  },
  {
    term: '분산투자',
    category: '리스크 관리',
    description: '여러 자산·종목·섹터에 나눠 투자해 한 곳이 크게 떨어져도 전체 손실을 줄이는 전략.',
    aliases: ['분산'],
  },
  {
    term: '집중투자',
    category: '리스크 관리',
    description: '소수의 종목에 비중을 집중하는 방식. 확신이 있을 때 쓰지만 그만큼 리스크도 집중된다.',
    caution: '집중도가 높아질수록 한 종목의 하락이 전체 포트폴리오에 큰 영향을 줍니다.',
  },
  {
    term: '리밸런싱',
    category: '리스크 관리',
    description: '시간이 지나 비중이 틀어진 포트폴리오를 원래 목표 비중으로 다시 맞추는 것.',
    aliases: ['rebalancing'],
  },
  {
    term: '비중',
    category: '리스크 관리',
    description: '전체 자산 중 특정 종목이나 섹터가 차지하는 %. 한 곳에 비중이 너무 몰리면 리스크가 커진다.',
  },
  {
    term: '섹터',
    category: '리스크 관리',
    description: '기업을 사업 종류별로 묶은 분류. 예: IT, 헬스케어, 금융, 에너지.',
    aliases: ['sector', '업종'],
  },
  {
    term: '변동성',
    category: '리스크 관리',
    description: '가격이 얼마나 크게 오르내리는지를 나타내는 수치. 변동성이 클수록 리스크도 크다.',
    aliases: ['volatility'],
  },
  {
    term: '벤치마크',
    category: '리스크 관리',
    description: '내 포트폴리오 성과를 비교할 기준 지수. S&P 500이나 코스피를 많이 쓴다.',
    aliases: ['benchmark'],
  },
  {
    term: '드로우다운',
    category: '리스크 관리',
    description: '고점 대비 얼마나 떨어졌는지를 나타내는 수치. 포트폴리오의 최대 낙폭을 파악할 때 쓴다.',
    aliases: ['drawdown', 'MDD', '최대낙폭'],
  },
  {
    term: '현금비중',
    category: '리스크 관리',
    description: '포트폴리오에서 현금이 차지하는 비율. 현금비중이 높으면 시장 하락 시 손실을 줄이고 기회를 기다릴 수 있다.',
  },
  {
    term: '평가손익',
    category: '리스크 관리',
    description: '현재 보유 중인 자산을 지금 팔면 얼마나 이익이거나 손실인지를 나타낸 값. 아직 팔지 않았으므로 확정된 손익은 아니다.',
    aliases: ['미실현손익', '평가수익', '평가손실'],
  },
  {
    term: '실현손익',
    category: '리스크 관리',
    description: '실제로 매도해서 확정된 손익. 팔기 전까지는 아무리 수익이 커도 실현손익은 0이다.',
    aliases: ['확정손익'],
  },
  {
    term: '미실현손익',
    category: '리스크 관리',
    description: '아직 팔지 않아 장부상으로만 존재하는 손익. 평가손익과 같은 개념이다.',
  },

  // ── 시장/지수 ──────────────────────────────────────────────
  {
    term: '코스피',
    category: '시장/지수',
    description: '한국거래소에 상장된 대형 기업들의 주가를 종합한 지수. 한국 증시의 대표 온도계다.',
    aliases: ['KOSPI'],
  },
  {
    term: '코스닥',
    category: '시장/지수',
    description: '코스피보다 규모는 작지만 성장성 높은 IT·바이오 기업이 많이 상장된 한국 시장.',
    aliases: ['KOSDAQ'],
  },
  {
    term: 'S&P 500',
    category: '시장/지수',
    description: '미국을 대표하는 500개 대형 기업의 주가를 종합한 지수. 전 세계 투자자가 벤치마크로 삼는다.',
    aliases: ['S&P500', 'sp500', '에스앤피', 'SPY'],
  },
  {
    term: '나스닥',
    category: '시장/지수',
    description: '애플·구글·아마존 등 기술주 중심의 미국 주식 시장. 성장주 비중이 높아 변동성이 큰 편이다.',
    aliases: ['NASDAQ'],
  },
  {
    term: '나스닥 100',
    category: '시장/지수',
    description: '나스닥 상장 기업 중 시가총액 상위 100개만 추린 지수. QQQ ETF가 이것을 추종한다.',
    aliases: ['나스닥100', 'QQQ'],
  },
  {
    term: '환율',
    category: '시장/지수',
    description: '달러 1개를 사려면 원화가 얼마 필요한지를 나타내는 숫자. 환율이 오르면 해외 주식의 원화 평가액도 올라간다.',
  },
  {
    term: '금리',
    category: '시장/지수',
    description: '돈을 빌릴 때 내는 이자의 비율. 금리가 오르면 주식보다 채권이 매력적으로 보여 주식시장이 흔들리는 경우가 많다.',
    aliases: ['기준금리', 'interest rate'],
  },
  {
    term: '인플레이션',
    category: '시장/지수',
    description: '물가가 전반적으로 오르는 현상. 인플레이션이 심하면 돈의 가치가 떨어지고 금리 인상으로 이어질 수 있다.',
    aliases: ['inflation', '물가상승'],
  },
  {
    term: '경기침체',
    category: '시장/지수',
    description: '경제 성장이 둔화되거나 마이너스로 돌아선 상태. 기업 실적이 나빠지고 주가에도 영향을 준다.',
    aliases: ['recession', '리세션'],
  },
  {
    term: '환헤지',
    category: '시장/지수',
    description: '해외 자산에 투자할 때 환율 변동으로 인한 손익을 줄이는 방법. H(헤지)가 붙은 ETF가 환헤지 상품이다.',
    aliases: ['currency hedge', '헤지'],
  },
  {
    term: '거래량',
    category: '시장/지수',
    description: '특정 기간 동안 사고팔린 주식의 수. 거래량이 갑자기 늘면 큰 이슈가 생겼다는 신호일 수 있다.',
    aliases: ['volume'],
  },
  {
    term: '수급',
    category: '시장/지수',
    description: '특정 종목을 사려는 쪽(매수)과 팔려는 쪽(매도)의 균형. "수급이 좋다"는 말은 사려는 쪽이 많다는 뜻이다.',
  },

  // ── 재무지표 ───────────────────────────────────────────────
  {
    term: 'PER',
    category: '재무지표',
    description: '주가를 주당순이익(EPS)으로 나눈 값. "이 회사 이익 대비 주가가 비싼지 싼지"를 가늠하는 지표다.',
    aliases: ['주가수익비율', '퍼', 'P/E', 'pe ratio'],
  },
  {
    term: 'PBR',
    category: '재무지표',
    description: '주가를 주당순자산으로 나눈 값. 장부상 자산 대비 주가가 어느 수준인지를 나타낸다.',
    aliases: ['주가순자산비율', 'P/B', 'pb ratio'],
  },
  {
    term: 'ROE',
    category: '재무지표',
    description: '자기자본 대비 얼마나 이익을 냈는지를 나타내는 수익성 지표. 높을수록 효율적으로 이익을 낸다는 의미다.',
    aliases: ['자기자본이익률', 'roe'],
  },
  {
    term: '실적',
    category: '재무지표',
    description: '기업이 특정 기간에 얼마나 팔고 얼마나 벌었는지를 나타내는 결과. 분기마다 공개되며 주가에 큰 영향을 준다.',
    aliases: ['earnings', '어닝'],
  },
  {
    term: '어닝서프라이즈',
    category: '재무지표',
    description: '기업 실적이 시장 예상치(컨센서스)를 크게 웃도는 것. 주가가 급등하는 경우가 많다.',
    aliases: ['earning surprise', '어닝 서프라이즈'],
  },
  {
    term: '어닝쇼크',
    category: '재무지표',
    description: '기업 실적이 시장 예상치보다 크게 부진한 것. 주가가 급락하는 경우가 많다.',
    aliases: ['earning shock', '어닝 쇼크'],
  },
  {
    term: '컨센서스',
    category: '재무지표',
    description: '애널리스트들이 예측한 기업 실적이나 주가 전망의 평균값. 실제 실적이 컨센서스를 넘으면 어닝서프라이즈가 된다.',
    aliases: ['consensus', '시장 전망'],
  },
  {
    term: '대형주',
    category: '재무지표',
    description: '시가총액이 큰 기업의 주식. 일반적으로 변동성이 낮고 안정적이지만 급등 가능성도 상대적으로 낮다.',
    aliases: ['블루칩', 'large cap'],
  },
  {
    term: '중소형주',
    category: '재무지표',
    description: '시가총액이 중간~작은 기업의 주식. 대형주보다 변동성이 크고 성장 가능성도 높지만 리스크도 크다.',
    aliases: ['small cap', 'mid cap'],
  },
  {
    term: '성장주',
    category: '재무지표',
    description: '현재 이익보다 미래 성장 가능성에 투자자들이 높은 가치를 부여하는 주식. 테크 기업이 대표적이다.',
    aliases: ['growth stock'],
  },
  {
    term: '가치주',
    category: '재무지표',
    description: '현재 이익·자산에 비해 주가가 저평가된 것으로 보이는 주식. PER, PBR 등이 낮은 경우가 많다.',
    aliases: ['value stock'],
  },
  {
    term: '배당주',
    category: '재무지표',
    description: '배당을 꾸준히, 또는 높은 비율로 지급하는 주식. 주가 상승보다 안정적인 수입을 원하는 투자자에게 참고 대상이 된다.',
  },
  {
    term: '테마주',
    category: '재무지표',
    description: '특정 이슈·트렌드·정책과 연관된 종목들. 테마가 뜨면 관련 주가가 함께 움직이는 경향이 있다.',
    caution: '테마주는 실제 실적보다 기대감으로 움직이는 경우가 많아 단기 변동성이 큽니다.',
  },

  // ── 투자자/수급 ────────────────────────────────────────────
  {
    term: '개인',
    category: '투자자/수급',
    description: '일반 개인 투자자. "개미"라고도 불린다. 국내 주식시장에서 거래량의 큰 부분을 차지한다.',
    aliases: ['개미', '개인투자자'],
  },
  {
    term: '외국인',
    category: '투자자/수급',
    description: '해외에서 한국 주식을 사고파는 투자자. 이들의 매수·매도 방향이 시장에 큰 영향을 주는 경우가 많다.',
    aliases: ['외인', '외국인투자자'],
  },
  {
    term: '기관',
    category: '투자자/수급',
    description: '펀드·보험·연기금 같은 국내 대형 투자 주체. 장기·대량으로 거래하는 경향이 있다.',
    aliases: ['기관투자자'],
  },
  {
    term: '공매도',
    category: '투자자/수급',
    description: '주식을 빌려서 판 뒤 나중에 더 낮은 가격에 사서 갚는 방식. 주가 하락 시 수익이 나는 구조다.',
    aliases: ['short selling', '숏'],
    caution: '공매도는 손실이 이론적으로 무제한인 고위험 방식입니다. 참고 정보로만 이해하는 것을 권장합니다.',
  },

  // ── 심리/밈 용어 ───────────────────────────────────────────
  {
    term: '군중심리',
    category: '심리/밈 용어',
    description: '많은 사람들이 사고 있다는 이유만으로 따라 사고 싶어지는 심리. 주식 커뮤니티에서 특정 종목이 화제가 될 때 강해진다.',
    aliases: ['herd mentality', '무리 심리', '군중 심리'],
    caution: '군중심리에 이끌려 고점 추격매수로 이어지는 경우가 많습니다. 대중이 몰릴 때일수록 비중을 점검해보는 것이 도움이 됩니다.',
  },
  {
    term: 'FOMO',
    category: '심리/밈 용어',
    description: '나만 기회를 놓치는 것 같아 성급하게 투자하고 싶어지는 심리. "Fear Of Missing Out"의 줄임말.',
    aliases: ['포모', 'fomo', '포모증후군', 'fear of missing out'],
    caution: 'FOMO는 고점 추격매수의 대표적인 원인입니다. "지금 안 사면 뒤처진다"는 느낌이 들 때일수록 한 발 물러서서 포트폴리오 비중을 점검해보세요.',
  },
  {
    term: '패닉셀',
    category: '심리/밈 용어',
    description: '주가가 급락할 때 공포감에 손절 기준 없이 급하게 파는 것. 감정적 매매의 대표 사례다.',
    aliases: ['panic sell', '패닉', 'panic selling'],
    caution: '패닉셀은 저점에서 팔게 되는 상황을 만들기 쉽습니다. 미리 손절 기준을 정해두면 패닉 상황에서 더 냉정한 판단에 도움이 됩니다.',
  },
];

export const GLOSSARY_CATEGORIES = [
  '전체',
  '기본 개념',
  '투자 행동',
  '리스크 관리',
  '시장/지수',
  '재무지표',
  '투자자/수급',
  '심리/밈 용어',
] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];
