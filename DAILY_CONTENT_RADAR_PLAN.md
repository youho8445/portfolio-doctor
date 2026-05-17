# Daily Content Radar — Admin Plan

## 1. Recommended Architecture

```
[Cron: 06:00 KST daily]
         │
         ▼
ContentRadarService.refresh()
         │
         ├─ fetch RSS feeds (5 sources)
         │   └─ parse titles, URLs, pubDates, snippets
         │
         ├─ normalize & deduplicate by URL
         │
         ├─ score each item (deterministic keyword scoring)
         │
         ├─ classify: market, category, relatedTickers, contentType
         │
         ├─ generate angle / hook / caption / glossary / hashtags
         │   └─ template-based (no AI dependency)
         │
         └─ upsert top 5 into daily_content_news table
                  (skip if URL already exists for today)

Admin API
  GET  /admin/content-radar/today    → returns today's items
  POST /admin/content-radar/refresh  → manual re-fetch (idempotent)
  PATCH /admin/content-radar/:id/status  → set new|used|ignored

Admin UI (in admin/page.tsx)
  New collapsible section below Feedback:
  "CONTENT RADAR / 오늘의 투자 콘텐츠 소재"
```

**No public-facing UI. No user notifications. No AI dependency in MVP.**

---

## 2. News Source Options and Risks

### Chosen Sources (RSS — title/URL/snippet only, no full body)

| # | Source | Feed URL | Market | Reliability |
|---|--------|----------|--------|-------------|
| 1 | Yahoo Finance (US markets/earnings) | `https://finance.yahoo.com/news/rssindex` | US | High — stable, well-structured |
| 2 | Reuters Business | `https://feeds.reuters.com/reuters/businessNews` | GLOBAL | High — requires fallback on layout change |
| 3 | 연합뉴스 경제 | `https://www.yonhapnews.co.kr/rss/economy.xml` | KR | Medium — format changes occasionally |
| 4 | 한국경제 증권 | `https://www.hankyung.com/feed/finance` | KR | Medium — CORS-safe server-side only |
| 5 | Investing.com (English) | `https://www.investing.com/rss/news.rss` | GLOBAL | Medium — rate-limit risk |

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| RSS feed URL changes | Per-source try/catch; partial success is acceptable |
| No items today | Return whatever was fetched; log warning |
| Duplicate URLs across re-runs | Deduplicate by `url` + `date(publishedAt)` before upsert |
| Korean source encoding (EUC-KR) | Use `iconv-lite` to normalize to UTF-8 |
| Rate limiting (Investing.com) | Only fetch once per day via cron; manual refresh has admin-only guard |
| Copyright concern | Store only title, source name, URL, publishedAt, and our own generated content — never full article body |
| Feed down | If < 3 sources return data, log but don't fail — admin sees partial results |

### What NOT to use
- Direct HTML scraping of news sites (copyright risk, fragile)
- Naver Finance API (requires app registration, not suitable for MVP)
- Paid news APIs (Polygon, Finnhub news) — could be added later

---

## 3. DB / Entity Design

### File: `src/entities/daily-content-news.entity.ts`

```typescript
@Entity('daily_content_news')
export class DailyContentNews {
  @PrimaryGeneratedColumn()
  id: number;

  // Source data (from RSS — no full body)
  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'varchar', length: 100 })
  source: string;                      // e.g. "Yahoo Finance", "연합뉴스"

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'datetime', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'varchar', length: 20 })
  market: string;                      // 'KR' | 'US' | 'GLOBAL'

  @Column({ type: 'varchar', length: 30 })
  category: string;                    // 'earnings' | 'macro' | 'tech' | 'sector' | 'psychology' | 'fx'

  @Column({ type: 'simple-json', nullable: true })
  relatedTickers: string[] | null;     // e.g. ["NVDA", "005930.KS"]

  // Our generated content (server-side, template-based)
  @Column({ type: 'varchar', length: 500 })
  summary: string;                     // RSS snippet or truncated title expansion

  @Column({ type: 'varchar', length: 500 })
  pobalanceAngle: string;              // portfolio risk connection

  @Column({ type: 'varchar', length: 300 })
  contentHook: string;                 // short attention hook

  @Column({ type: 'varchar', length: 600 })
  captionDraft: string;                // Instagram/Reels caption

  @Column({ type: 'simple-json', nullable: true })
  glossaryTerms: string[] | null;      // e.g. ["섹터 편중", "변동성"]

  @Column({ type: 'simple-json', nullable: true })
  hashtags: string[] | null;           // e.g. ["#미국주식", "#엔비디아"]

  @Column({ type: 'varchar', length: 30 })
  contentType: string;                 // '공감형' | '설명형' | '경고형' | '용어풀이형' | '비교형' | '포트폴리오 점검형'

  @Column({ type: 'int', default: 50 })
  contentScore: number;                // 0–100

  @Column({ type: 'varchar', length: 10, default: 'new' })
  status: string;                      // 'new' | 'used' | 'ignored'

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
```

**Table auto-created by TypeORM synchronize on Railway (same pattern as feedback entity).**

**Storage policy:**
- Keep records indefinitely (small table — max 5 rows/day)
- Index on `createdAt` for today query, index on `url` for dedup

---

## 4. API Design

### GET /admin/content-radar/today
- Guard: `@UseGuards(JwtAuthGuard)` + `requireAdmin()`
- Returns: items where `date(createdAt) = today (KST)`, ordered by `contentScore DESC`, limit 5
- If no items yet today: returns `{ items: [], refreshedAt: null }`

**Response shape:**
```typescript
{
  items: DailyContentNewsDto[];
  refreshedAt: string | null;  // ISO datetime of most recent createdAt
  count: number;
}
```

### POST /admin/content-radar/refresh
- Guard: `@UseGuards(JwtAuthGuard)` + `requireAdmin()`
- Triggers `ContentRadarService.refresh()` asynchronously
- Returns immediately: `{ message: '수집을 시작했습니다.', triggeredAt: ISO }`
- Idempotent: existing URLs for today are skipped (upsert by URL + date)
- Rate limit: 1 call per 10 minutes per admin (to avoid hammering RSS sources)

### PATCH /admin/content-radar/:id/status
- Guard: `@UseGuards(JwtAuthGuard)` + `requireAdmin()`
- Body: `{ status: 'used' | 'ignored' | 'new' }`
- Returns: updated item
- Used for "사용 완료" and "숨기기" buttons in admin UI

---

## 5. Admin UI Design

Location: new collapsible section in `frontend/src/app/admin/page.tsx`, placed after Feedback section.

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTENT RADAR / 오늘의 투자 콘텐츠 소재              [새로고침] [▼] │
│ 마지막 업데이트: 2026-05-17 06:00 (KST)                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ [94] 🔴KR  earnings                                       │   │
│ │ 삼성전자 1분기 실적 발표: 영업이익 전망치 상회             │   │
│ │ 출처: 연합뉴스 · 2시간 전                                 │   │
│ │                                                            │   │
│ │ 📝 Summary                                                │   │
│ │ 삼성전자가 시장 전망치를 상회하는 실적을 발표했습니다.     │   │
│ │                                                            │   │
│ │ 🎯 PoBalance Angle                                        │   │
│ │ 삼성전자 비중이 높은 포트폴리오는 실적 이벤트 후           │   │
│ │ 집중도 점검이 필요합니다.                                  │   │
│ │                                                            │   │
│ │ ⚡ Hook                                                   │   │
│ │ "삼성전자 실적이 좋아도 내 포트폴리오가 웃지 못하는 이유"  │   │
│ │                                                            │   │
│ │ 📱 Caption Draft                                          │   │
│ │ [복사 버튼]                                               │   │
│ │ 삼성전자 실적 발표 ✅                                      │   │
│ │ 하지만 실적보다 먼저 봐야 할 건 내 포트폴리오의 '비중'    │   │
│ │ 입니다...                                                  │   │
│ │                                                            │   │
│ │ 🏷️ 섹터 편중 · 집중투자 · 실적 이벤트                    │   │
│ │ #삼성전자 #한국주식 #포트폴리오 #리스크관리               │   │
│ │                                                            │   │
│ │ [원문 보기 ↗]  [✓ 사용 완료]  [✕ 숨기기]               │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ [87] 🔵US  tech                         ✓ 사용됨         │   │
│ │ ...                                                        │   │
│ └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Card visual rules:**
- Score badge: green (≥80), yellow (60–79), red (<60)
- Market badge: 🔴KR / 🔵US / 🌐GLOBAL
- Status: "사용됨" grays out the card (opacity 0.5), "숨김" hides it entirely
- Caption draft: scrollable `<pre>` box with copy-to-clipboard button
- "원문 보기": `target="_blank" rel="noopener noreferrer"`
- Mobile: cards stack vertically, full width, font-size scales down

**Frontend state additions:**
```typescript
contentRadar: { items: DailyContentNews[]; refreshedAt: string | null } | null
contentRadarOpen: boolean
contentRadarRefreshing: boolean
```

---

## 6. Scoring Logic

### Inputs
- Title text (keyword match)
- Source domain
- Market (KR/US/GLOBAL)
- Category
- relatedTickers

### Algorithm (deterministic, no AI)

```
baseScore = 50

// Popularity boost
+15  if relatedTickers contains any KR priority ticker (005930, 000660, etc.)
+15  if relatedTickers contains any US priority ticker (NVDA, TSLA, AAPL, etc.)
+10  if category === 'earnings'  (high retail interest)
+10  if category === 'psychology'  (FOMO, panic, crowd — always viral)
+8   if category === 'macro' AND related to FOMC/CPI/금리
+5   if market === 'KR' (domestic audience)

// Portfolio behavior relevance
+10  if title/summary contains: 변동성|급락|급등|집중|비중|리밸런싱|분산|패닉
+8   if title/summary contains: 실적|earnings|어닝
+5   if title/summary contains: ETF|인덱스|S&P|코스피|나스닥

// Source quality
+5   if source === '연합뉴스' || source === 'Reuters' || source === 'Yahoo Finance'
0    neutral sources
-10  weak/tabloid/unknown sources

// Penalties
-10  if title contains: 정치|선거|대통령|국회|외교
-10  if title is overly technical (matches jargon patterns with no retail hook)
-15  if no relatedTickers identified AND category === 'other'

// Cap
score = Math.max(0, Math.min(100, score))
```

### Content Type Classification

```
'경고형'         if title contains: 급락|위기|위험|경고|폭락|crash|crash
'공감형'         if category === 'psychology' OR contains: FOMO|패닉|불안|흔들
'설명형'         if category === 'macro' OR contains: 금리|CPI|환율|지표|보고서
'용어풀이형'     if title is jargon-heavy (contains 3+ financial terms)
'비교형'         if contains: vs|대비|비교|차이|격차
'포트폴리오 점검형' default fallback (most portfolio-related news)
```

---

## 7. Implementation Steps

### Step 1 — Backend entity + module skeleton
Files:
- `src/entities/daily-content-news.entity.ts` (NEW)
- `src/content-radar/content-radar.module.ts` (NEW)
- `src/content-radar/content-radar.service.ts` (NEW — stubs only)
- `src/content-radar/content-radar.controller.ts` (NEW)
- `src/app.module.ts` (import ContentRadarModule, register entity)

### Step 2 — RSS fetch + parse utilities
Files:
- `src/content-radar/rss-fetcher.ts` (NEW)
  - `fetchFeed(url): Promise<RawNewsItem[]>`
  - Parses `<item>` elements: title, link, pubDate, description, source
  - Uses `fast-xml-parser` (already used in project?) or `xml2js`
  - Charset normalization for Korean sources (iconv-lite)
- Add to `package.json`: `fast-xml-parser`, `iconv-lite` (check if already present)

### Step 3 — Scoring + classification + template generation
Files:
- `src/content-radar/content-scorer.ts` (NEW)
  - `scoreItem(raw): ScoredItem` — full scoring algorithm
  - `classifyContentType(raw): ContentType`
  - `identifyTickers(title: string): string[]` — regex match against keyword list
  - `identifyMarket(raw): 'KR' | 'US' | 'GLOBAL'`
- `src/content-radar/content-templates.ts` (NEW)
  - `generateAngle(item): string`
  - `generateHook(item): string`
  - `generateCaption(item): string`
  - `generateGlossary(item): string[]`
  - `generateHashtags(item): string[]`
  - Template lookup tables keyed by (category × market × contentType)

### Step 4 — Service: refresh logic + cron
Files:
- `src/content-radar/content-radar.service.ts` (implement)
  - `refresh()`: fetch all 5 sources, score, dedup by URL+date, upsert top 5
  - `getTodayItems()`: `WHERE date(createdAt) = today`
  - `updateStatus(id, status)`: PATCH status field
- `src/content-radar/content-radar.cron.ts` (NEW)
  - `@Cron('0 21 * * *')` (UTC 21:00 = KST 06:00)
  - Calls `contentRadarService.refresh()`
  - Requires `ScheduleModule` in app.module (already present for monitoring cron)

### Step 5 — Controller (admin-only endpoints)
Files:
- `src/content-radar/content-radar.controller.ts` (implement)
  - `GET /admin/content-radar/today`
  - `POST /admin/content-radar/refresh`
  - `PATCH /admin/content-radar/:id/status`
  - All: `@UseGuards(JwtAuthGuard)` + `requireAdmin()`
  - refresh: simple in-memory rate-limit (last triggered timestamp, 10min cooldown)

### Step 6 — Frontend API layer
Files:
- `frontend/src/lib/api.ts` (add 3 functions)
  - `getContentRadarToday()` → `GET /admin/content-radar/today`
  - `refreshContentRadar()` → `POST /admin/content-radar/refresh`
  - `updateContentRadarStatus(id, status)` → `PATCH /admin/content-radar/:id/status`
- Add `DailyContentNewsItem` interface to `api.ts`

### Step 7 — Admin UI section
Files:
- `frontend/src/app/admin/page.tsx` (add Content Radar section)
  - New state: `contentRadar`, `contentRadarOpen`, `contentRadarRefreshing`
  - Load in useEffect (same pattern as feedbackSummary)
  - Collapsible section below Feedback
  - Card rendering with score badge, market badge, all content fields
  - Copy-to-clipboard for caption draft (navigator.clipboard.writeText)
  - 원문 보기 / 사용 완료 / 숨기기 buttons

---

## 8. QA Checklist

### Access Control
- [ ] Unauthenticated request to `GET /admin/content-radar/today` returns 401
- [ ] Non-admin JWT returns 403
- [ ] Admin JWT returns data

### Data Integrity
- [ ] `today` endpoint returns max 5 items
- [ ] Items ordered by `contentScore DESC`
- [ ] Re-running refresh does not create duplicate rows for same URL on same day
- [ ] `publishedAt` is parsed as datetime, not string
- [ ] No full article body stored — only title, source, url, publishedAt, summary (≤500 chars)

### Status Updates
- [ ] PATCH `:id/status` with `used` → card shows "사용됨", grayed out
- [ ] PATCH `:id/status` with `ignored` → card hidden
- [ ] PATCH `:id/status` with `new` → card restored

### Content Generation
- [ ] Each item has non-empty `pobalanceAngle`, `contentHook`, `captionDraft`
- [ ] `hashtags` is an array (not null, not empty)
- [ ] `glossaryTerms` is an array
- [ ] `contentScore` is between 0 and 100

### Admin UI
- [ ] "원문 보기" opens in new tab
- [ ] Caption copy button copies text to clipboard
- [ ] "새로고침" button triggers POST refresh and re-fetches today items
- [ ] Admin page renders without error when contentRadar is null (loading state)
- [ ] Section collapses/expands correctly
- [ ] Mobile: cards readable, no overflow

### Regression
- [ ] Page Traffic section still loads correctly
- [ ] Feedback section still loads correctly
- [ ] No change to analysis, rebalancing, payment, or auth logic

### Build
- [ ] `npx tsc --noEmit` (backend) passes
- [ ] `npm run build` (frontend) passes

---

## 9. What Should NOT Be Implemented Yet

| Feature | Reason |
|---------|--------|
| AI-generated content (GPT/Claude API calls) | No AI provider confirmed in current backend. Template-based is sufficient for MVP. Add as Step 2 upgrade after confirming provider. |
| Auto-push news to users | Out of scope. This is an admin content-creation tool, not a user notification feature. |
| Public-facing content feed | Not requested. Would require separate UX design, auth scoping, and possibly paid news license. |
| Naver Finance / paid news APIs | Cost and API key management adds complexity. RSS is sufficient for MVP. |
| Semantic similarity / duplicate detection | Full NLP is overkill. URL-based dedup is sufficient for daily refresh. |
| Automatic SNS posting | Scheduling to Instagram/YouTube/TikTok APIs is a separate integration project. |
| Historical content archive view | Nice-to-have. Admin can see today's items; past items accessible only via DB for now. |
| Per-admin "used by whom" tracking | Single admin in MVP. Multi-admin attribution can be added later. |
| Content performance tracking | Connecting SNS metrics back to radar items requires external API integrations. |
| Keyword filtering UI | Admin can influence scoring by editing templates; no UI needed in MVP. |

---

## Dependencies to Check

Before implementing Step 2 (RSS fetch):
- Is `fast-xml-parser` already in `package.json`? → Check backend dependencies
- Is `iconv-lite` already present (used by NestJS internally)? → Likely yes
- Is `@nestjs/schedule` already in `app.module.ts`? → Check (needed for cron)
- Does Railway firewall allow outbound HTTP to news RSS endpoints? → Should be yes (default Railway allows outbound)

If `@nestjs/schedule` is not yet registered, it must be added to `app.module.ts`. This is a small one-time addition, not a scope change.

---

## File Summary

| File | Type | Step |
|------|------|------|
| `src/entities/daily-content-news.entity.ts` | NEW | 1 |
| `src/content-radar/content-radar.module.ts` | NEW | 1 |
| `src/content-radar/content-radar.service.ts` | NEW | 1, 4 |
| `src/content-radar/content-radar.controller.ts` | NEW | 1, 5 |
| `src/content-radar/rss-fetcher.ts` | NEW | 2 |
| `src/content-radar/content-scorer.ts` | NEW | 3 |
| `src/content-radar/content-templates.ts` | NEW | 3 |
| `src/content-radar/content-radar.cron.ts` | NEW | 4 |
| `src/app.module.ts` | MODIFY (import only) | 1 |
| `frontend/src/lib/api.ts` | MODIFY (add 3 fns) | 6 |
| `frontend/src/app/admin/page.tsx` | MODIFY (add section) | 7 |

**Files NOT touched:** analysis, rebalancing, payment, auth, notification, portfolio, feedback, pricing.
