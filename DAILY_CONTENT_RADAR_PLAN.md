# Daily Content Radar — Admin Plan (v2)

## Revision History
- v1: Initial plan — app marketing content generation
- v2: Expanded to SNS news briefing account ("포밸런스 브리핑"). Output optimized for
  short-form news reels (YouTube Shorts / Instagram Reels / TikTok).
  Fields restructured to cover 15s script, 30s script, subtitle lines, beginner caution,
  CTA, and portfolio impact framing. Hybrid scoring formula approved.

---

## 1. Purpose and Architecture

### Purpose

Content Radar serves two roles:
1. **Admin content-creation tool**: surfaces daily top 5 market news items with SNS-ready
   scripts and captions for admin use when posting to the PoBalance SNS accounts.
2. **SNS briefing channel source**: feeds a potential separate account ("포밸런스 브리핑"
   or "포밸런스뉴스") that posts daily short-form market news reels.

Content is always admin-created and admin-reviewed. No auto-posting. No public UI. No user notifications.

### Architecture

```
[Cron: 06:00 KST daily]
         │
         ▼
ContentRadarService.refresh()
         │
         ├─ fetch RSS feeds (5 sources, per-source try/catch)
         │   └─ parse titles, URLs, pubDates, snippets only — no full article body
         │
         ├─ buildTickerSourceCounts() — cross-source frequency map for trendScore
         │
         ├─ hybrid score each item:
         │   finalScore = trendScore(25) + portfolioRelevance(35)
         │              + beginnerScore(20) + sourceQuality(10) - noisePenalty(30)
         │
         ├─ classify: market, category, relatedTickers, contentType
         │
         ├─ generate SNS content fields (template-based, no AI):
         │   openingHook, shortNewsSummary, whyItMattersToPortfolio,
         │   beginnerCaution, script15s, script30s,
         │   captionDraft, subtitleLines, hashtags,
         │   relatedGlossaryTerms, ctaText
         │
         └─ upsert top 5 into daily_content_news table
                  (skip if URL already exists for today)

Admin API (all guard: JwtAuthGuard + isAdminEmail)
  GET  /admin/content-radar/today    → returns today's scored items
  POST /admin/content-radar/refresh  → manual re-fetch (10-min cooldown)
  PATCH /admin/content-radar/:id/status  → set new|used|ignored

Admin UI (in admin/page.tsx)
  Collapsible section — no public route, no user access
```

---

## 2. News Sources

### Chosen RSS Feeds (no full article body stored)

| # | Source | Feed URL | Market | Reliability |
|---|--------|----------|--------|-------------|
| 1 | Yahoo Finance | `https://finance.yahoo.com/news/rssindex` | US | High |
| 2 | Reuters Business | `https://feeds.reuters.com/reuters/businessNews` | GLOBAL | High |
| 3 | 연합뉴스 경제 | `https://www.yonhapnews.co.kr/rss/economy.xml` | KR | Medium |
| 4 | 한국경제 | `https://www.hankyung.com/feed/finance` | KR | Medium |
| 5 | Investing.com | `https://www.investing.com/rss/news.rss` | GLOBAL | Medium |

### Reliability Rules
- Each feed wrapped in isolated try/catch — one failure does not abort others
- If all feeds fail → log warning, return empty result, do not throw
- EUC-KR encoding (연합뉴스) → normalize via `iconv-lite` (transitive dep of mysql2)
- Store only: title, source name, URL, publishedAt, RSS snippet (≤500 chars). Never full body.

---

## 3. DB Entity Design

### File: `src/entities/daily-content-news.entity.ts`

```typescript
@Entity('daily_content_news')
export class DailyContentNews {
  @PrimaryGeneratedColumn()
  id: number;

  // ── Source data (RSS, no full body) ──────────────────────────────────
  @Column({ type: 'varchar', length: 300 })
  title: string;                        // newsTitle

  @Column({ type: 'varchar', length: 100 })
  source: string;                       // e.g. "연합뉴스", "Yahoo Finance"

  @Column({ type: 'varchar', length: 500 })
  url: string;                          // originalUrl

  @Column({ type: 'datetime', nullable: true, default: null })
  publishedAt: Date | null;

  @Column({ type: 'varchar', length: 20 })
  market: string;                       // 'KR' | 'US' | 'GLOBAL'

  @Column({ type: 'varchar', length: 30 })
  category: string;                     // 'earnings' | 'macro' | 'tech' | 'sector' | 'psychology' | 'fx' | 'other'

  @Column({ type: 'simple-json', nullable: true, default: null })
  relatedTickers: string[] | null;      // e.g. ["NVDA", "005930.KS"]

  // ── News content fields ───────────────────────────────────────────────
  @Column({ type: 'varchar', length: 500 })
  shortNewsSummary: string;             // brief factual summary (from RSS snippet)

  @Column({ type: 'varchar', length: 500 })
  whyItMattersToPortfolio: string;      // portfolio risk / concentration / rebalancing angle

  @Column({ type: 'varchar', length: 300, nullable: true, default: null })
  beginnerCaution: string | null;       // e.g. "이 뉴스가 단기 주가를 보장하지 않습니다"

  // ── Script fields ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 300 })
  openingHook: string;                  // first line / attention grabber

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  script15s: string | null;             // 15-second Reels voiceover script (~60 words)

  @Column({ type: 'varchar', length: 1000, nullable: true, default: null })
  script30s: string | null;             // 30-second Reels voiceover script (~120 words)

  @Column({ type: 'simple-json', nullable: true, default: null })
  subtitleLines: string[] | null;       // 4–6 subtitle lines matching script structure

  // ── Caption + metadata ────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 800 })
  captionDraft: string;                 // Instagram / Reels / Shorts caption

  @Column({ type: 'simple-json', nullable: true, default: null })
  hashtags: string[] | null;

  @Column({ type: 'simple-json', nullable: true, default: null })
  relatedGlossaryTerms: string[] | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  ctaText: string | null;               // CTA appended to caption/script

  // ── Classification + scoring ──────────────────────────────────────────
  @Column({ type: 'varchar', length: 30 })
  contentType: string;                  // '공감형' | '설명형' | '경고형' | '용어풀이형' | '비교형' | '포트폴리오 점검형'

  @Column({ type: 'int', default: 0 })
  contentScore: number;                 // finalScore 0–100

  @Column({ type: 'int', default: 0 })
  scoreTrend: number;                   // 0–25

  @Column({ type: 'int', default: 0 })
  scoreRelevance: number;               // 0–35

  @Column({ type: 'int', default: 0 })
  scoreBeginner: number;                // 0–20

  @Column({ type: 'int', default: 0 })
  scoreSource: number;                  // 0–10

  @Column({ type: 'int', default: 0 })
  scorePenalty: number;                 // 0–30 (stored as positive; subtracted)

  @Column({ type: 'varchar', length: 10, default: 'new' })
  status: string;                       // 'new' | 'used' | 'ignored'

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
```

### Migration note
Previous entity (v1) had: `summary`, `pobalanceAngle`, `contentHook`, `captionDraft`,
`glossaryTerms`, `hashtags`, `contentType`, `contentScore`.

v2 renames and adds fields. Since the project uses `synchronize: true`:
- New columns (nullable/defaulted) are auto-added — safe.
- Renamed columns: TypeORM synchronize adds the new name but does NOT drop the old name
  by default. Old columns persist harmlessly. Production impact: minimal (table is small,
  items are regenerated daily).
- No explicit migration needed for this table.

---

## 4. Output Field Definitions

Each news card generates all of the following fields:

| Field | Source | Max Length | Notes |
|-------|--------|-----------|-------|
| `title` | RSS | 300 | verbatim news title |
| `source` | RSS feed config | 100 | feed name |
| `url` | RSS | 500 | originalUrl — never scrape full article |
| `publishedAt` | RSS `<pubDate>` | datetime | null if missing |
| `market` | feed config | 20 | KR / US / GLOBAL |
| `category` | keyword classify | 30 | earnings / macro / tech / sector / psychology / fx / other |
| `relatedTickers` | keyword match | json | e.g. ["NVDA","005930.KS"] |
| `shortNewsSummary` | RSS snippet | 500 | factual, no opinion |
| `whyItMattersToPortfolio` | template | 500 | risk / concentration / rebalancing framing |
| `beginnerCaution` | template | 300 | what NOT to do based on this news |
| `openingHook` | template | 300 | first line — attention grabber |
| `script15s` | template | 500 | ~60 words, 15s voiceover |
| `script30s` | template | 1000 | ~120 words, 30s voiceover |
| `subtitleLines` | template | json | 4–6 lines matching script |
| `captionDraft` | template | 800 | platform caption with line breaks |
| `hashtags` | template | json | 6–10 tags |
| `relatedGlossaryTerms` | template | json | 1–3 beginner terms |
| `ctaText` | template | 200 | selected from CTA pool |

---

## 5. Tone and Wording Rules

### Required tone
- **News briefing style**: factual, concise, timely — not opinion or prediction
- **Beginner-friendly**: assume viewer knows ticker names but not financial ratios
- **Portfolio risk framing**: connect every story to concentration, volatility, rebalancing, or FOMO

### Prohibited
- 매수 추천 / 매도 추천
- "오를 것 같습니다" / "떨어질 수 있습니다" (directional price prediction)
- 수익 보장 / 손실 방어 보장
- "지금 사세요" / "팔아야 합니다"
- 추천주 / 유망주

### Required framing alternatives
| Instead of | Use |
|-----------|-----|
| "삼성전자 지금 사세요" | "삼성전자 비중이 높다면 집중도를 점검해보세요" |
| "NVIDIA 오를 거예요" | "AI 반도체 섹터 비중, 내 포트폴리오에서 얼마인가요?" |
| "금리 오르면 주식 팔아야" | "금리 상승 뉴스, 채권-주식 비중 점검 타이밍일 수 있습니다" |

### CTA Pool (select one per item)
```
"내 포트폴리오 비중은 PoBalance에서 확인해보세요."
"뉴스보다 중요한 건 내 포트폴리오 안에서의 비중입니다."
"포트폴리오 건강검진은 PoBalance에서."
"섹터 편중 체크, PoBalance에서 지금 바로."
"변동성 시장, 내 리스크는 얼마인지 확인해보세요. PoBalance."
```

---

## 6. Hybrid Scoring Formula

```
finalScore (0–100) =
    trendScore              (max 25)
  + portfolioRelevance      (max 35)
  + beginnerUnderstandability (max 20)
  + sourceQuality           (max 10)
  - noisePenalty            (max 30)

clamp to [0, 100]
```

### trendScore (0–25)
Uses cross-source mention frequency — no external API needed.
Count how many distinct RSS sources mention the same priority ticker today.

| Signal | Points |
|--------|--------|
| 3+ distinct sources mention same ticker | 20 |
| 2 distinct sources | 12 |
| 1 source (default) | 8 |
| No priority tickers found | 8 (neutral) |

*Naver DataLab API may be added later as an upgrade. Currently: cross-source count only.*

### portfolioRelevance (0–35)
| Signal | Points |
|--------|--------|
| KR priority ticker (삼성전자, SK하이닉스, 현대차 등) | +12 |
| US priority ticker (NVDA, TSLA, AAPL, MSFT 등) | +12 |
| KOSPI / NASDAQ / S&P500 index | +5 |
| Portfolio behavior keywords (변동성, 리밸런싱, 급락, 비중 등) | +8 |
| Earnings / macro / FX category | +6 |
| Psychology category (FOMO, 패닉셀, 군중심리 등) | +8 |
| KR market proximity | +3 |
| *Cap at 35* | |

### beginnerUnderstandability (0–20)
| Signal | Points |
|--------|--------|
| Title contains familiar company name (삼성전자, 애플, 테슬라 등) | +8 |
| Plain macro concept without jargon (금리, 물가, 환율 등) | +6 |
| Index in title (KOSPI, 나스닥, ETF) | +5 |
| Earnings story (실적) | +5 |
| Heavy jargon (베타, 샤프, 공분산, 선물, 파생 등) | -10 |

### sourceQuality (0–10)
| Source | Points |
|--------|--------|
| 연합뉴스, Reuters, 한국경제 | 10 |
| Yahoo Finance, Investing.com | 7 |
| Other | 4 |

### noisePenalty (0–30)
| Signal | Penalty |
|--------|---------|
| Political content (정치, 선거, 탄핵, 외교) | -15 |
| No tickers + no index + category = other | -12 |
| Jargon-heavy without portfolio-behavior context | -8 |
| Rumor indicators (카더라, 소식통, 익명, 유출) | -10 |
| Question title with no financial anchor | -5 |
| *Multiple penalties stack, cap at 30* | |

---

## 7. Script Generation Templates

### 15s Script (~60 words)
Structure: Hook → News Fact → Portfolio Connection → CTA

Example (earnings, KR):
```
삼성전자 실적이 시장 전망치를 넘었습니다.
[HOOK] 근데 실적이 좋아도 내 포트폴리오가 웃지 못하는 경우가 있습니다.
삼성전자 비중이 30% 이상이라면 — 집중 리스크를 점검해볼 타이밍입니다.
포트폴리오 건강검진은 PoBalance에서.
```

### 30s Script (~120 words)
Structure: Hook → News Fact → Why It Matters → Beginner Caution → Portfolio Action → CTA

Example:
```
오늘 삼성전자 1분기 실적이 발표됐습니다. 영업이익이 시장 전망치를 상회했습니다.
[HOOK] 실적이 좋으면 무조건 주가가 올라야 할 것 같죠? 그게 꼭 그렇지 않습니다.
실적 발표는 시장의 기대치와의 비교입니다. 이미 많은 투자자들이 기대를 선반영했다면
주가는 오히려 '사실 확인 후 매도' 흐름을 보일 수 있습니다.
초보 투자자가 주의할 점: 실적 발표 당일 단기 등락만 보고 충동 매수/매도하지 마세요.
대신 이 뉴스로 내 포트폴리오에서 삼성전자 비중이 적정한지 확인해보세요.
집중도가 높다면 분산을 고려할 타이밍일 수 있습니다.
PoBalance에서 내 포트폴리오 건강을 확인해보세요.
```

### Subtitle Lines (4–6 lines)
Each line maps to a visual segment of the reel. Short, punchy, readable on screen.
Example:
```json
["삼성전자 1분기 실적 발표", "영업이익 전망치 상회", "근데 주가는 왜 흔들릴까?", "집중 비중이 리스크입니다", "PoBalance에서 확인하세요"]
```

---

## 8. Admin UI Design

Location: collapsible section in `frontend/src/app/admin/page.tsx`, after Feedback section.

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTENT RADAR / 포밸런스 브리핑 소재              [새로고침] [▼] │
│ 마지막 업데이트: 2026-05-17 06:00 (KST)                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ [82] 🇰🇷KR  earnings            Score: T8+R35+B13+S10-P0 │   │
│ │ 삼성전자 1분기 실적 발표: 영업이익 전망치 상회             │   │
│ │ 출처: 연합뉴스 · 2시간 전                                 │   │
│ │ 🔗 relatedTickers: 005930.KS                              │   │
│ │                                                            │   │
│ │ 📝 News Summary                                           │   │
│ │ 삼성전자가 시장 전망치를 상회하는 실적을 발표했습니다.     │   │
│ │                                                            │   │
│ │ 🎯 Portfolio Impact                                       │   │
│ │ 삼성전자 비중이 높은 포트폴리오는 집중도 점검 필요.        │   │
│ │                                                            │   │
│ │ ⚠️ Beginner Caution                                       │   │
│ │ 실적 발표 당일 충동 매매는 주의하세요.                     │   │
│ │                                                            │   │
│ │ ⚡ Opening Hook                                           │   │
│ │ "실적이 좋아도 내 포트폴리오가 웃지 못하는 이유"           │   │
│ │                                                            │   │
│ │ 🎬 15s Script                          [📋 복사]         │   │
│ │ [스크립트 텍스트...]                                       │   │
│ │                                                            │   │
│ │ 🎬 30s Script                          [📋 복사]         │   │
│ │ [스크립트 텍스트...]                                       │   │
│ │                                                            │   │
│ │ 🖼 Subtitle Lines                                         │   │
│ │ 1. 삼성전자 1분기 실적 발표                               │   │
│ │ 2. 영업이익 전망치 상회                                   │   │
│ │ 3. ...                                                     │   │
│ │                                                            │   │
│ │ 📱 Caption                             [📋 복사]         │   │
│ │ [캡션 텍스트...]                                           │   │
│ │                                                            │   │
│ │ #해시태그 #목록                        [📋 복사]         │   │
│ │ 🏷️ 용어: 섹터 편중 · 집중투자 · 실적 이벤트             │   │
│ │ 📣 CTA: 내 포트폴리오 비중은 PoBalance에서 확인해보세요.  │   │
│ │                                                            │   │
│ │ [원문 보기 ↗]  [✓ 사용 완료]  [✕ 숨기기]               │   │
│ └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Copy Buttons (4 targets)
1. **15s Script** → copies `script15s`
2. **30s Script** → copies `script30s`
3. **Caption** → copies `captionDraft`
4. **Hashtags** → copies hashtags joined with spaces

### Card visual rules
- Score badge: green (≥80), yellow (60–79), red (<60)
- Score breakdown inline: `T{trend}+R{relevance}+B{beginner}+S{source}-P{penalty}`
- Market badge: 🇰🇷KR / 🇺🇸US / 🌐GLOBAL
- Status: "사용됨" → opacity 0.5, "숨김" → hidden entirely
- openingHook: distinct from summary — first visual line of content
- subtitleLines: numbered list

---

## 9. API Design

### GET /admin/content-radar/today
Guard: `JwtAuthGuard` + `isAdminEmail()`
Returns items where `createdAt` is within today (KST), ordered by `contentScore DESC`, limit 5.

```typescript
{
  items: DailyContentNews[];
  refreshedAt: string | null;
  count: number;
}
```

### POST /admin/content-radar/refresh
Guard: `JwtAuthGuard` + `isAdminEmail()`
Non-blocking — returns immediately, runs refresh in background.
Rate limit: 10 minutes per admin (in-memory cooldown).

```typescript
{ message: string; triggeredAt: string }
```

### PATCH /admin/content-radar/:id/status
Guard: `JwtAuthGuard` + `isAdminEmail()`
Body: `{ status: 'new' | 'used' | 'ignored' }`
Returns updated item.

---

## 10. Implementation Steps

### Step 1 — Update entity + score breakdown columns
Files:
- `src/entities/daily-content-news.entity.ts`
  - Add: `shortNewsSummary`, `whyItMattersToPortfolio`, `beginnerCaution`
  - Add: `openingHook`, `script15s`, `script30s`, `subtitleLines`
  - Add: `captionDraft` (length 800), `relatedGlossaryTerms`, `ctaText`
  - Add: `scoreTrend`, `scoreRelevance`, `scoreBeginner`, `scoreSource`, `scorePenalty`
  - Old fields (`summary`, `pobalanceAngle`, `contentHook`, `glossaryTerms`) remain
    in DB harmlessly; remove from entity once confirmed clean

### Step 2 — Hybrid scoring refactor
Files:
- `src/content-radar/content-scorer.ts`
  - Add `ScoreBreakdown` interface: `{ trend, relevance, beginner, source, penalty, final }`
  - Add `scoreBreakdown` to `ScoredItem`
  - Export `buildTickerSourceCounts(items): Map<string, number>`
  - Split `scoreItem()` into 5 functions: `computeTrendScore`, `computeRelevance`,
    `computeBeginnerScore`, `computeSourceQuality`, `computeNoisePenalty`
  - `buildScoredItem(raw, tickerSourceCounts?)` — optional param, defaults to empty map

### Step 3 — Update service to compute frequency + store breakdown
Files:
- `src/content-radar/content-radar.service.ts`
  - After `fetchAllFeeds()`: call `buildTickerSourceCounts(rawItems)`
  - Pass map to `buildScoredItem(item, tickerSourceCounts)`
  - Store all 5 score breakdown columns in `repo.create()`

### Step 4 — Update content templates for new field structure
Files:
- `src/content-radar/content-templates.ts`
  - Add: `generateScript15s(item): string`
  - Add: `generateScript30s(item): string`
  - Add: `generateSubtitleLines(item): string[]`
  - Add: `generateBeginnerCaution(item): string`
  - Add: `generateCTA(): string` — randomly selects from CTA pool
  - Rename: `generateAngle` → `generateWhyItMatters`
  - Rename: `generateHook` → `generateOpeningHook`
  - Rename: `generateGlossary` → `generateGlossaryTerms`
  - Tone rules enforced: no price prediction, no buy/sell, portfolio-framing only

### Step 5 — Update frontend interface + admin UI
Files:
- `frontend/src/lib/api.ts`
  - Update `ContentRadarItem` interface with all new fields
  - Add score breakdown fields: `scoreTrend`, `scoreRelevance`, `scoreBeginner`,
    `scoreSource`, `scorePenalty`
- `frontend/src/app/admin/page.tsx`
  - Update card rendering: show new fields (script15s, script30s, subtitleLines,
    beginnerCaution, ctaText, whyItMattersToPortfolio)
  - Add 4 copy buttons: 15s script, 30s script, caption, hashtags
  - Add score breakdown row below score badge: `T{n}+R{n}+B{n}+S{n}-P{n}`
  - Remove or de-emphasize deprecated field labels (pobalanceAngle → whyItMattersToPortfolio)

---

## 11. QA Checklist

### Access Control
- [ ] Unauthenticated request to GET /admin/content-radar/today → 401
- [ ] Non-admin JWT → 403
- [ ] Admin JWT → data

### Data Integrity
- [ ] today endpoint returns max 5 items, ordered by contentScore DESC
- [ ] Re-running refresh skips existing URLs for today (idempotent)
- [ ] No full article body stored
- [ ] shortNewsSummary ≤ 500 chars
- [ ] script15s is populated and not empty
- [ ] script30s is populated and not empty
- [ ] subtitleLines has 4–6 items
- [ ] ctaText is one of the approved CTA strings
- [ ] contentScore = trend + relevance + beginner + source - penalty (clamped 0–100)

### Tone Enforcement
- [ ] No buy/sell recommendation language in any generated field
- [ ] No price direction guarantees
- [ ] All scripts include portfolio-framing sentence
- [ ] All items include ctaText pointing to PoBalance

### Copy Buttons
- [ ] 15s script copy button copies script15s to clipboard
- [ ] 30s script copy button copies script30s to clipboard
- [ ] Caption copy button copies captionDraft
- [ ] Hashtags copy button copies joined hashtag string

### Score Breakdown
- [ ] Admin card shows T/R/B/S/P breakdown inline
- [ ] scoreTrend ≤ 25, scoreRelevance ≤ 35, scoreBeginner ≤ 20,
      scoreSource ≤ 10, scorePenalty ≤ 30
- [ ] contentScore = clamp(T+R+B+S-P, 0, 100)

### Admin UI
- [ ] Empty state renders without crash
- [ ] Section collapses/expands correctly
- [ ] "원문 보기" opens in new tab
- [ ] "사용 완료" → card grays out, status = used
- [ ] "숨기기" → card hidden, status = ignored

### Regression
- [ ] Page Traffic section unaffected
- [ ] Feedback section unaffected
- [ ] No change to analysis, rebalancing, payment, or auth logic

### Build
- [ ] `npx tsc --noEmit` (backend) passes
- [ ] `npm run build` (frontend) passes

---

## 12. What NOT to Implement

| Feature | Reason |
|---------|--------|
| Auto-posting to Instagram/YouTube/TikTok | Separate integration project — out of scope |
| AI content generation (GPT/Claude API) | No AI provider confirmed. Template-based is MVP. |
| Naver DataLab API integration | Requires API key setup. Listed as future upgrade. |
| Public-facing content feed | Not requested. No user access. |
| Per-user content performance tracking | SNS metrics require external API integrations. |
| Historical archive view | Today-only for MVP. DB accessible to admin via direct query. |
| Scheduled posting queue | Admin reviews and posts manually. |
| Full article body storage | Copyright concern. RSS snippet only. |

---

## 13. File Summary (Implementation Scope)

| File | Change Type | Step |
|------|------------|------|
| `src/entities/daily-content-news.entity.ts` | MODIFY — add new fields | 1 |
| `src/content-radar/content-scorer.ts` | MODIFY — hybrid scoring refactor | 2 |
| `src/content-radar/content-radar.service.ts` | MODIFY — ticker frequency + breakdown storage | 3 |
| `src/content-radar/content-templates.ts` | MODIFY — add script15s, script30s, subtitleLines, beginnerCaution, CTA | 4 |
| `frontend/src/lib/api.ts` | MODIFY — update ContentRadarItem interface | 5 |
| `frontend/src/app/admin/page.tsx` | MODIFY — new fields, 4 copy buttons, score breakdown | 5 |

**Files NOT touched:** analysis, rebalancing, payment, auth, notification, portfolio, feedback, pricing.
