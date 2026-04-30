# MONITORING_REDESIGN.md — Portra AI Portfolio Monitoring System

> Status: Design proposal — no code changes made yet.
> All implementation requires plan → approval → code as per PROJECT_BRIEF.md

---

## 1. Current Architecture

### 1.1 Event Types (7 types)

| Event Type | Trigger Condition | Severity |
|---|---|---|
| `SCORE_DROP` | Health score falls 10+ pts OR crosses below 50 | critical / warning |
| `DIVERSIFICATION_DROP` | Diversification score drops 10+ pts | critical / warning |
| `OVERWEIGHT_ENTERED` | Any single stock (non-ETF) exceeds 50% weight | warning |
| `SECTOR_BIAS_ENTERED` | Max sector weight crosses 65% threshold | warning |
| `TOP3_CONCENTRATION_ENTERED` | Top 3 holdings cross 75% threshold | warning |
| `REBALANCE_NEEDED` | Health score crosses from ≥60 to <60 | critical / warning |
| `OPPORTUNITY_AVAILABLE` | Rebalancing can improve score by 15+ pts | opportunity |

### 1.2 Trigger Logic

Two trigger points:

1. **User-initiated (on-demand):** User clicks "Analyze" → `AnalysisService` → `MonitoringService.detectAfterAnalysis()` → compare current vs previous snapshot → fire events
2. **Scheduled (daily cron):** `@Cron('0 0 * * *')` runs 9 AM KST → iterates ALL portfolios → compare last 2 snapshots → fire events

Deduplication: Only one event per `(portfolioId, eventType)` per calendar day.

### 1.3 Notification Flow

```
Analysis completes
  → detectStateChanges(current, previous)  [pure function, state-change-detector.ts]
  → saveNewEvents()  [dedup check → INSERT portfolio_state_events]
  → PushService.sendToUser()  [web push via VAPID, non-blocking]
  → Service Worker (browser)  [shows OS notification]
```

### 1.4 Frontend Rendering Flow

```
Page mount → GET /notifications (up to 50 events)
           → setNotifications(evts)
           → Unread count badge on bell icon

Bell click → Dropdown opens
           → Renders up to 15 most recent events
           → Color-coded by severity (red/amber/green/gray)
           → Click event → POST /notifications/:id/read

Post-analysis → setTimeout(2000) → refresh GET /notifications
```

**Storage:** `portfolio_state_events` table. No WebSocket — HTTP polling only.

---

## 2. Problems in Current System

### 2.1 Weak Retention

- Notifications are fetched on page load only. After that, no new signals arrive until the user manually re-runs analysis.
- Daily cron fires events but there is no mechanism to surface them to the user unless they happen to open the app.
- No push notification onboarding prompt — push opt-in is buried at the bottom of the notification dropdown, only visible if the user opens it.
- No scheduled summary or digest → zero pull-back mechanism for inactive users.

### 2.2 No Actionable Guidance

- Each notification has a `title` and a `message`, but the message only describes WHAT happened ("건강 점수가 하락했어요").
- There is no "what you should do" guidance attached to any event.
- `OPPORTUNITY_AVAILABLE` is the only event that implies a next step, but it doesn't link to or pre-populate the rebalancing simulator.
- After reading a notification, the user has no clear path forward inside the app.

### 2.3 No State Transition Model

- The system detects **events** (point-in-time changes) but never models the **current portfolio state**.
- There is no concept of "this portfolio is currently in a RISKY state."
- A user who checks back 3 weeks later sees a list of past events but cannot tell "is my portfolio OK right now?"
- Multiple overlapping events (SCORE_DROP + SECTOR_BIAS + TOP3_CONCENTRATION) don't coalesce into a single status.

### 2.4 Notifications Feel Informational Only

- All events have the same UI treatment (colored dot + title + message).
- There is no differentiation between "you need to act now" (critical) vs "good to know" (info).
- `severity` field exists in the data model but is only used for dot color — no UX escalation.
- Nothing distinguishes free vs premium monitoring depth — both users see identical notifications.

---

## 3. New Monitoring Architecture

### 3.1 Portfolio State Model

Replace event-only tracking with a **persistent portfolio state** that is updated on every analysis.

#### State Definitions

| State | Condition | Meaning |
|---|---|---|
| `stable` | healthScore ≥ 70 AND maxSectorWeight < 65% AND top3Concentration < 70% | Portfolio is healthy and balanced |
| `concentrated` | top3Concentration ≥ 75% OR any single stock ≥ 50% | Holdings are too concentrated in few assets |
| `risky` | healthScore < 50 OR (maxSectorWeight ≥ 65% AND diversificationScore < 50) | Meaningful risk present, action suggested |
| `improving` | healthScore increased 5+ pts since last snapshot AND was previously risky/concentrated | Portfolio moving in right direction |
| `deteriorating` | healthScore fell 10+ pts OR diversificationScore fell 10+ pts since last snapshot | Negative trajectory detected |

Rules:
- A portfolio has exactly **one active state** at any time.
- State is recalculated on every analysis.
- State history is stored so the user can see "was stable → deteriorating → risky" over time.
- `improving` and `deteriorating` are **transient** states — they revert to `stable`, `concentrated`, or `risky` on next check.

### 3.2 CHANGE Signal Taxonomy

Changes are the triggers that cause state transitions or generate events. Expanded from 7 to 12 types:

| Change Signal | Category | Description |
|---|---|---|
| `SECTOR_CONCENTRATION_INCREASE` | Allocation | Max sector weight increased by 10+ pts |
| `VOLATILITY_INCREASE` | Risk | Health score drops 10+ pts (risk proxy) |
| `ALLOCATION_IMBALANCE` | Allocation | Any single stock deviation >15% from target (if target set) |
| `DIVERSIFICATION_DECREASE` | Risk | Diversification score drops 10+ pts |
| `OVERWEIGHT_SINGLE_STOCK` | Allocation | Single non-ETF stock exceeds 50% |
| `TOP3_OVER_THRESHOLD` | Allocation | Top 3 holdings exceed 75% |
| `SCORE_RECOVERED` | Recovery | Health score rose 10+ pts (was previously <60) |
| `REBALANCE_OPPORTUNITY` | Action | Score can improve 15+ pts with suggested rebalance |
| `SCORE_CRITICAL` | Risk | Health score drops below 40 |
| `NEW_PORTFOLIO_ASSESSED` | Info | First analysis ever run for this portfolio |
| `WEEKLY_SUMMARY` | Summary | Weekly digest (scheduled, premium only) |
| `BENCHMARK_UNDERPERFORM` | Performance | Portfolio return < benchmark by 5+ pts (premium only) |

### 3.3 IMPACT Layer

Every emitted event must include an **impact explanation** — not just what changed, but why it matters.

Format: `{ summary, risk, example }`

Examples:

```
SECTOR_CONCENTRATION_INCREASE:
  summary: "IT 섹터 비중이 72%로 올라갔어요"
  risk:    "같은 섹터의 종목들은 동시에 하락하는 경향이 있어요. 지수 하락 시 포트폴리오 전체가 함께 흔들릴 수 있어요."
  example: "2022년 금리 인상기 나스닥이 -33% 하락했을 때, IT 집중 포트폴리오는 -45% 이상 하락한 경우도 있었어요."

OVERWEIGHT_SINGLE_STOCK:
  summary: "삼성전자 비중이 54%예요"
  risk:    "한 종목이 절반 이상이면, 그 종목의 리스크가 곧 포트폴리오 전체의 리스크가 돼요."
  example: "단일 종목 리스크는 분산 투자로 줄일 수 있는 가장 기본적인 리스크예요."
```

### 3.4 ACTION Layer

Every actionable event type maps to a specific in-app action. Non-actionable events (info, summary) have no action.

| Change Signal | Action Type | In-App Destination |
|---|---|---|
| `SECTOR_CONCENTRATION_INCREASE` | reduce_concentration | Opens rebalancing simulator, highlights sector |
| `OVERWEIGHT_SINGLE_STOCK` | reduce_concentration | Opens rebalancing simulator, highlights the stock |
| `ALLOCATION_IMBALANCE` | rebalance | Opens rebalancing simulator |
| `DIVERSIFICATION_DECREASE` | diversify_sector | Opens rebalancing simulator with diversification target |
| `REBALANCE_OPPORTUNITY` | rebalance | Opens rebalancing simulator, pre-loaded with suggestion |
| `TOP3_OVER_THRESHOLD` | diversify_sector | Opens rebalancing simulator |
| `SCORE_CRITICAL` | monitor_closely | Highlights risk dashboard section |
| `SCORE_RECOVERED` | none (celebratory) | No action needed |
| `BENCHMARK_UNDERPERFORM` | monitor_closely | Premium: shows benchmark comparison chart |

---

## 4. Free vs Premium Strategy

### 4.1 Free Tier Monitoring Features

- All 7 current change signals (no reduction)
- Portfolio state badge (`stable` / `concentrated` / `risky` / `improving` / `deteriorating`)
- In-app notification bell with unread count
- Click-to-read individual notifications
- Mark all read
- Push notification opt-in (on-demand triggers only)
- Up to 20 notifications in history

### 4.2 Premium Tier Monitoring Features

- Everything in free tier, plus:
- `BENCHMARK_UNDERPERFORM` signal (peer comparison)
- `WEEKLY_SUMMARY` digest (scheduled, every Monday 9 AM)
- Portfolio state history timeline (last 90 days of state changes)
- Actionable rebalancing links in notifications (deep links into simulator)
- Impact explanations (the WHY layer) shown in full
- Unread history up to 200 notifications
- Priority push notifications (daily monitoring at critical threshold, not just on analysis)

### 4.3 Premium Retention Loop

```
Daily cron detects state change for premium user
  → stores event with full IMPACT text + ACTION deep link
  → fires push notification immediately (not just on analysis)
  → User opens notification
  → Sees "IT 섹터 비중이 72%로 올라갔어요" + impact explanation
  → Taps "리밸런싱 시뮬레이터 열기" (deep link)
  → Simulator opens pre-loaded
  → User applies or dismisses
  → System records "improvement applied" event
  → Next Monday: weekly summary includes this improvement in digest
```

Free users see: "알림이 있어요. 프리미엄에서 자세한 내용을 확인하세요."
(The title is visible, but the IMPACT and ACTION layers are locked behind premium upgrade CTA.)

---

## 5. Data Model Proposal

### 5.1 New: `portfolio_states` Table

Stores the current and historical state of each portfolio after every analysis.

```
portfolio_states
  id              PK
  portfolioId     FK → portfolios
  userId          FK → users
  state           ENUM('stable','concentrated','risky','improving','deteriorating')
  healthScore     DECIMAL(5,2)
  diversScore     DECIMAL(5,2)
  top3Conc        DECIMAL(5,2)
  maxSectorWeight DECIMAL(5,2)
  maxSectorName   VARCHAR(64)
  snapshotId      FK → portfolio_snapshots
  detectedAt      DATETIME
  createdAt       DATETIME
```

Index: `(portfolioId, detectedAt DESC)` for timeline queries.
Query pattern: `SELECT * WHERE portfolioId = ? ORDER BY detectedAt DESC LIMIT 90`

### 5.2 Updated: `portfolio_state_events` Table

Add new columns to the existing table (backwards compatible):

```
New columns to add:
  impactSummary   TEXT NULL        -- "IT 섹터 비중이 72%로 올라갔어요"
  impactRisk      TEXT NULL        -- why it matters
  actionType      VARCHAR(32) NULL -- 'rebalance' | 'reduce_concentration' | etc.
  actionParams    TEXT NULL        -- JSON: { portfolioId, sectorName, tickerFocus }
  isPremium       BOOLEAN DEFAULT FALSE  -- true = locked for free users
  priority        TINYINT DEFAULT 5      -- 1 (critical) to 10 (info), for sort
  expiresAt       DATETIME NULL    -- some events are time-sensitive
```

### 5.3 Event Priority Scale

| Priority | Level | Meaning | Push? |
|---|---|---|---|
| 1 | Emergency | Health score < 30 | Immediate push |
| 2 | Critical | Health score < 40, major concentration | Push within 1 hour |
| 3 | Warning | Threshold crossed | Push on next daily run |
| 5 | Opportunity | Rebalance available | Push on next daily run |
| 7 | Info | Score recovered, new assessment | In-app only |
| 9 | Summary | Weekly digest | Scheduled push |
| 10 | Passive | Minor changes | In-app only |

### 5.4 Unread Tracking

Current system uses `isRead` boolean per event. No change needed for basic tracking.

Enhancement: Add `openedAt DATETIME NULL` alongside `isRead`, to distinguish "received but dismissed" vs "actually opened and read." Used for engagement analytics in later phases.

### 5.5 State Transition History

`portfolio_states` table IS the state history. No separate table needed.

Query for timeline UI: `SELECT state, healthScore, detectedAt FROM portfolio_states WHERE portfolioId = ? ORDER BY detectedAt DESC LIMIT 30`

---

## 6. UX Proposal

### 6.1 Notification Center (Redesigned Dropdown)

Current: Simple scrollable list of events.

Proposed: Two-section layout

**Section A — Current State Banner (always shown at top)**
```
┌─────────────────────────────────────────┐
│  포트폴리오 상태                          │
│  ⬤ 위험  건강점수 42점  ↓ 지난주 대비 -8  │
│  [리밸런싱 시뮬레이터 열기 →]             │
└─────────────────────────────────────────┘
```
- State badge with color (red=risky, amber=concentrated, green=stable)
- Health score + delta from previous check
- CTA button that deeplinks to the relevant action
- Free users: state shown, CTA links to upgrade prompt

**Section B — Event Feed (below the banner)**
- Priority 1-3 events shown first, highlighted
- Priority 7-10 events shown below a "더 보기" fold
- Each event:
  - Icon (colored by severity)
  - Title (always visible)
  - Impact summary (premium: visible, free: blurred with "프리미엄" badge)
  - Action button (premium: active, free: locked)
  - Time ago ("3시간 전")

### 6.2 Portfolio Timeline

A new view (not a dropdown — a dedicated section or page).

Shows the history of state changes as a vertical timeline:

```
●── 2024-04-28 ── 위험 ──────────────────
│   건강점수 42점  IT 섹터 집중 감지
│   [미조치]
│
●── 2024-04-21 ── 집중 ──────────────────
│   상위 3종목 78% 집중  경고
│   [리밸런싱 적용됨 ✓]
│
●── 2024-04-14 ── 안정 ──────────────────
    건강점수 71점  정상 범위
```

Free users: Last 2 entries visible. Older entries blurred.
Premium users: Last 90 days.

### 6.3 Risk Trend Visualization

A small sparkline chart inside the notification bell dropdown or the main dashboard:

- X-axis: last 8 analysis runs (dates)
- Y-axis: health score (0-100)
- Line color: green when ≥70, amber 50-69, red <50
- Small state badge on each data point

This is a premium feature. Free users see the current score only (no history chart).

### 6.4 Weekly Summary Concept (Premium Only)

Delivered every Monday 9 AM via push notification + in-app event.

Content structure:
```
지난 주 포트폴리오 리포트

현재 상태: 집중 (지난주: 안정)

이번 주 주요 변화:
  ⚠ IT 섹터 비중이 58% → 72%로 증가했어요
  ✓ 삼성전자 비중이 48% → 43%로 감소했어요

지금 권장 조치:
  → IT 섹터 일부를 소비재/헬스케어로 분산하면 건강점수 +12 예상

다음 체크 예정: 2024-05-06 (월)
```

Push notification body: "이번 주 포트폴리오에 변화가 있었어요. 요약을 확인해 보세요."

---

## 7. Suggested Implementation Order

### Phase A — State Foundation (선행 필수)

**Goal:** Make "what state is my portfolio in right now?" answerable.

Tasks:
1. Create `portfolio_states` table + entity
2. In `MonitoringService.detectAfterAnalysis()`: calculate and persist the current state after every analysis
3. In `GET /notifications` response: include a `currentState` field alongside the events array
4. Frontend: Show the state badge on the notification bell (replace or augment unread count)

Dependencies: None — additive only, no existing behavior changed.
Risk: Low. New table, new field in existing API response.

---

### Phase B — Enriched Events (알림 개선)

**Goal:** Add IMPACT and ACTION layers to new events. Existing events unchanged.

Tasks:
1. Add `impactSummary`, `impactRisk`, `actionType`, `actionParams`, `isPremium`, `priority` columns to `portfolio_state_events` (nullable, default NULL/false/5)
2. Update `state-change-detector.ts` to populate these fields for each event type
3. Update `GET /notifications`: strip `impactRisk` and `actionType` for non-premium users (return `null`)
4. Frontend: In notification dropdown, render impact text and action button when present
5. Frontend: Render premium lock UI when `isPremium: true` but user is free tier

Dependencies: Phase A complete, premium user flag accessible in JWT.
Risk: Medium. Requires knowing user's subscription tier in the API response.

---

### Phase C — Timeline + Retention (리텐션)

**Goal:** Give users a reason to return to the app weekly.

Tasks:
1. Portfolio timeline view: `GET /portfolios/:id/state-history` → queries `portfolio_states` table
2. Frontend: Timeline component inside the analyzer page (below main dashboard)
3. Weekly summary: NestJS `@Cron('0 0 * * 1')` (Monday 9 AM KST) → generate weekly summary event per premium user → push notification
4. Push notification onboarding: Surface opt-in prompt prominently on first analysis (not buried in dropdown)

Dependencies: Phase B complete, premium subscription logic validated.
Risk: Medium. Cron job for weekly summary needs careful deduplication (same as daily cron pattern).

---

## Notes

- Phase A can start immediately — zero impact on existing functionality.
- Phase B requires the premium user flag to be available in the auth context. Validate that `req.user` includes subscription status before starting.
- Phase C's weekly summary is the highest-retention feature but also the most complex. Do not start until Phase B is stable.
- The `BENCHMARK_UNDERPERFORM` event type is deferred to Phase B+ because it requires benchmark data to be reliably stored in snapshots.
- Do not delete or modify existing `portfolio_state_events` events. New fields are all nullable — old rows remain valid.
