import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 300; // 5분 캐시

const RSS_FEEDS = [
  // Google News 한국 주식/투자
  'https://news.google.com/rss/search?q=%EC%A3%BC%EC%8B%9D+%ED%88%AC%EC%9E%90&hl=ko&gl=KR&ceid=KR:ko',
];

function extractItems(xml: string, limit = 6) {
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const titleRe = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
  const linkRe = /<link>(.*?)<\/link>|<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/;
  const pubDateRe = /<pubDate>(.*?)<\/pubDate>/;
  const sourceRe = /<source[^>]*>(.*?)<\/source>/;

  const items: { title: string; link: string; pubDate: string; source: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
    const block = m[1];
    const titleM = titleRe.exec(block);
    const linkM = linkRe.exec(block);
    const dateM = pubDateRe.exec(block);
    const srcM = sourceRe.exec(block);

    const title = (titleM?.[1] ?? titleM?.[2] ?? '').trim();
    const link = (linkM?.[1] ?? linkM?.[2] ?? '').trim();
    const pubDate = (dateM?.[1] ?? '').trim();
    const source = (srcM?.[1] ?? '').trim();

    if (title && link) items.push({ title, link, pubDate, source });
  }
  return items;
}

export async function GET() {
  try {
    const res = await fetch(RSS_FEEDS[0], {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioDoctor/1.0)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('RSS fetch failed');
    const xml = await res.text();
    const items = extractItems(xml, 5);
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  } catch (e) {
    return NextResponse.json({ items: [], error: String(e) }, { status: 200 });
  }
}
