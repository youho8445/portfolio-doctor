import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  ticker?: string;
}

function parseXml(xml: string, limit = 8): Omit<NewsItem, 'ticker'>[] {
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const titleRe = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRe = /<link>(.*?)<\/link>|<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/;
  const pubDateRe = /<pubDate>(.*?)<\/pubDate>/;
  const sourceRe = /<source[^>]*>(.*?)<\/source>/;

  const items: Omit<NewsItem, 'ticker'>[] = [];
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
    const block = m[1];
    const title = (titleRe.exec(block)?.[1] ?? titleRe.exec(block)?.[2] ?? '').trim();
    const link = (linkRe.exec(block)?.[1] ?? linkRe.exec(block)?.[2] ?? '').trim();
    const pubDate = (pubDateRe.exec(block)?.[1] ?? '').trim();
    const source = (sourceRe.exec(block)?.[1] ?? '').trim();
    if (title && link) items.push({ title, link, pubDate, source });
  }
  return items;
}

async function fetchRss(query: string, limit = 6): Promise<Omit<NewsItem, 'ticker'>[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioDoctor/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return parseXml(await res.text(), limit);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tickersParam = searchParams.get('tickers') ?? '';
  const qParam = searchParams.get('q') ?? '';

  // 수동 검색어가 있으면 그것만 검색
  if (qParam.trim()) {
    const items = await fetchRss(qParam.trim(), 10);
    return NextResponse.json(
      { items: items.map((i) => ({ ...i, ticker: null })) },
      { headers: { 'Cache-Control': 'public, s-maxage=180' } },
    );
  }

  const tickers = tickersParam
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 6); // 최대 6종목

  if (tickers.length === 0) {
    // 티커 없으면 일반 시장 뉴스
    const items = await fetchRss('주식 투자 증시', 8);
    return NextResponse.json(
      { items: items.map((i) => ({ ...i, ticker: null })) },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } },
    );
  }

  // 종목별 병렬 뉴스 fetch (상위 3개는 2건씩, 나머지는 1건)
  const results = await Promise.all(
    tickers.map(async (ticker, idx) => {
      const query = `${ticker} 주식`;
      const limit = idx < 3 ? 2 : 1;
      const fetched = await fetchRss(query, limit);
      return fetched.map((item) => ({ ...item, ticker }));
    }),
  );

  // 합치고 날짜순 정렬
  const all: NewsItem[] = results.flat();
  all.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });

  return NextResponse.json(
    { items: all.slice(0, 12) },
    { headers: { 'Cache-Control': 'public, s-maxage=300' } },
  );
}
