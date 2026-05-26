const NAME_TO_TICKER: Record<string, string> = {
  // 국내주식 (Korean stocks)
  '삼성전자': '005930.KS',
  'SK하이닉스': '000660.KS',
  'HD현대일렉트릭': '267260.KS',
  'LG에너지솔루션': '373220.KS',
  '삼성바이오로직스': '207940.KS',
  '카카오': '035720.KS',
  'NAVER': '035420.KS',
  '네이버': '035420.KS',
  '현대차': '005380.KS',
  '현대자동차': '005380.KS',
  '기아': '000270.KS',
  '셀트리온': '068270.KS',
  'KB금융': '105560.KS',
  '신한지주': '055550.KS',
  '하나금융지주': '086790.KS',
  '우리금융지주': '316140.KS',
  'POSCO홀딩스': '005490.KS',
  '삼성SDI': '006400.KS',
  'LG화학': '051910.KS',
  '삼성물산': '028260.KS',
  'HD현대중공업': '329180.KS',
  'HMM': '011200.KS',
  '카카오뱅크': '323410.KS',
  '크래프톤': '259960.KS',
  '엔씨소프트': '036570.KS',
  'SK텔레콤': '017670.KS',
  'KT': '030200.KS',
  'LG전자': '066570.KS',
  '현대모비스': '012330.KS',
  '한국전력': '015760.KS',
  '롯데케미칼': '011170.KS',
  '두산에너빌리티': '034020.KS',
  '한화에어로스페이스': '012450.KS',
  '고려아연': '010130.KS',
  'SK이노베이션': '096770.KS',
  '삼성전기': '009150.KS',
  'LG디스플레이': '034220.KS',
  '카카오페이': '377300.KS',
  '하이브': '352820.KS',
  // 해외주식 (US/foreign stocks)
  '플래닛 랩스': 'PL',
  'Planet Labs': 'PL',
  '애플': 'AAPL',
  'Apple': 'AAPL',
  '테슬라': 'TSLA',
  'Tesla': 'TSLA',
  '엔비디아': 'NVDA',
  'NVIDIA': 'NVDA',
  '마이크로소프트': 'MSFT',
  'Microsoft': 'MSFT',
  '구글': 'GOOGL',
  'Alphabet': 'GOOGL',
  'Google': 'GOOGL',
  '아마존': 'AMZN',
  'Amazon': 'AMZN',
  '메타': 'META',
  'Meta': 'META',
  '넷플릭스': 'NFLX',
  'Netflix': 'NFLX',
  '팔란티어': 'PLTR',
  'Palantir': 'PLTR',
  '코인베이스': 'COIN',
  'Coinbase': 'COIN',
  '리비안': 'RIVN',
  'Rivian': 'RIVN',
  '스포티파이': 'SPOT',
  'Spotify': 'SPOT',
  '쇼피파이': 'SHOP',
  'Shopify': 'SHOP',
  '로블록스': 'RBLX',
  'Roblox': 'RBLX',
  '스냅': 'SNAP',
  'Snap': 'SNAP',
  '우버': 'UBER',
  'Uber': 'UBER',
  '에어비앤비': 'ABNB',
  'Airbnb': 'ABNB',
  '스트라이프': 'STRIPE',
  '버크셔해서웨이': 'BRK-B',
  'Berkshire': 'BRK-B',
  'JP모건': 'JPM',
  'JPMorgan': 'JPM',
  '뱅크오브아메리카': 'BAC',
  '비자': 'V',
  'Visa': 'V',
  '마스터카드': 'MA',
  'Mastercard': 'MA',
  '존슨앤존슨': 'JNJ',
};

export function mapNameToTicker(name: string): {
  ticker: string | null;
  confidence: 'high' | 'medium' | 'low';
} {
  // Exact match
  const exact = NAME_TO_TICKER[name];
  if (exact) return { ticker: exact, confidence: 'high' };

  // Case-insensitive exact match
  const nameLower = name.toLowerCase().trim();
  for (const [key, ticker] of Object.entries(NAME_TO_TICKER)) {
    if (key.toLowerCase() === nameLower) return { ticker, confidence: 'high' };
  }

  // Partial / contains match (medium confidence)
  for (const [key, ticker] of Object.entries(NAME_TO_TICKER)) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes(nameLower) || nameLower.includes(keyLower)) {
      if (nameLower.length >= 2 && keyLower.length >= 2) {
        return { ticker, confidence: 'medium' };
      }
    }
  }

  return { ticker: null, confidence: 'low' };
}
