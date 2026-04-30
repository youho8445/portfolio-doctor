# CURRENT_PRODUCT_STATUS.md — Portra AI

> Last updated: 2026-04-30
> No code was modified to produce this document.

---

## 1. Product Name

**Portra AI**
"AI로 포트폴리오의 흐름을 분석하고, 리스크 변화와 리밸런싱 타이밍을 알려주는 투자 관리 서비스"

Deployed at:
- Frontend: `https://portfolio-doctor-alpha.vercel.app` (Vercel)
- Backend: `https://portfolio-doctor-production.up.railway.app` (Railway)

---

## 2. Implemented Features

---

### 2.1 Auth

**What it does:**
Three auth paths: Google OAuth, email/password signup, phone OTP. All paths create a user with a 7-day trial and store consent versions. JWT-based session (Bearer token, 7-day expiry).

**Consent tracking:** Users must agree to Terms (2026-04-01), Privacy (2026-04-01), and Risk Disclaimer (2026-04-01) on signup. Optional marketing consent stored separately.

**Main frontend files:**
- `frontend/src/components/AuthModal.tsx` — login/signup modal (email, Google, phone tabs)
- `frontend/src/contexts/AuthContext.tsx` — token storage, user state
- `frontend/src/app/auth/callback/page.tsx` — OAuth redirect handler

**Main backend files:**
- `src/auth/auth.controller.ts` — all auth routes
- `src/auth/auth.service.ts` — signup, login, token issuance
- `src/auth/strategies/jwt.strategy.ts` — token validation
- `src/auth/sms/mock-sms.provider.ts` — SMS stub
- `src/entities/user.entity.ts` — User table
- `src/entities/user-consent.entity.ts` — consent version tracking
- `src/entities/phone-verification.entity.ts` — OTP state

**Related APIs:**
```
POST /auth/email/signup       — email registration
POST /auth/email/login        — email login → { access_token, user }
POST /auth/google             — Google sign-in (access token exchange)
POST /auth/phone/send-code    — send 6-digit OTP
POST /auth/phone/verify-code  — verify OTP + create user
POST /auth/complete-signup    — finalize pending-token flow (consent)
GET  /auth/me                 — current user profile
PATCH /auth/password          — change password
```

**Current limitations:**
- Phone SMS uses `MockSmsProvider` — logs code to console only, no real SMS sent
- Apple Login: entity field exists (`appleId`) but OAuth flow not implemented, button removed from UI
- `JWT_SECRET` falls back to hardcoded `'default-secret'` if env var not set

**Free or premium:** Free — all users regardless of tier

---

### 2.2 Portfolio Input / Save / Load / Delete

**What it does:**
Users can create named portfolios, add securities by search (ticker, name, Korean name), set weights by percentage or by investment amount, save to DB, and reload later. Up to N portfolios per user (no hard cap enforced).

Two input modes:
- **Weight mode**: enter percentage directly (0–100)
- **Amount mode**: enter KRW investment amount → system auto-recalculates weights as % of total

Also supports an "adjustment simulator" — add/withdraw a lump sum and see recalculated weights before applying.

**Main frontend files:**
- `frontend/src/app/analyzer/page.tsx` — full input UI (search, add, weight/amount toggle, sidebar portfolio list)
- `frontend/src/lib/api.ts` — all API calls

**Main backend files:**
- `src/portfolios/portfolios.service.ts`
- `src/portfolios/portfolios.controller.ts`
- `src/entities/portfolio.entity.ts`
- `src/entities/portfolio-item.entity.ts`

**Related APIs:**
```
GET    /portfolios            — list user's portfolios
POST   /portfolios            — create portfolio { name }
GET    /portfolios/:id        — get portfolio with items
GET    /portfolios/:id/items  — items only
POST   /portfolios/:id/items  — add/update item { securityId, weight?, amount?, avgCost? }
DELETE /portfolios/:id/items  — clear all items
PATCH  /portfolios/:id        — rename portfolio
DELETE /portfolios/:id        — delete portfolio (cascade to items)
```

**Current limitations:**
- No CSV/JSON import or export
- No portfolio copy/duplicate
- avgCost is stored but not validated against actual trade history

**Free or premium:** Free

---

### 2.3 Beginner Guide / Starter Portfolio Builder

**What it does:**
A 5-step wizard that generates a suggested starter portfolio based on the user's risk profile, market preference, and investment budget. Calculates affordability (can the user buy at least 1 share?), shows estimated share counts and prices, and offers to load the result directly into the portfolio input screen.

Steps:
1. Risk profile (3 questions: loss tolerance, time horizon, goal)
2. Market preference (KR / US / Both)
3. Product type (ETF / stocks / mixed / any)
4. Investment amount (quick picks or manual entry)
5. Suggested portfolio with per-ticker breakdown

Outputs: style classification (conservative / balanced / growth / aggressive), suggested tickers with weights, reasons, prices, share counts, and cash remainder.

**Main frontend files:**
- `frontend/src/components/BeginnerGuide.tsx` — full 780-line wizard
- Referenced from `frontend/src/app/analyzer/page.tsx`

**Main backend files:**
- None — purely frontend logic + price API calls

**Related APIs:**
- Uses `GET /securities/{ticker}/quote` for live price lookups (via existing prices service)

**Current limitations:**
- Fractional shares not supported (flagged as a warning in stock-only mode)
- Curated universe is hardcoded (~25 assets) — not dynamically updated
- Cannot auto-execute or connect to a brokerage

**Free or premium:** Free

---

### 2.4 Market Price Fetching

**What it does:**
Fetches historical daily close prices from Yahoo Finance and stores them in `price_daily` table. Also fetches USD/KRW exchange rate. Prices are used by the analysis engine to compute returns and portfolio value.

Auto-fetch on demand: if a security has no price data when analysis is triggered, it fetches the last 1 year from Yahoo Finance automatically.

Manual trigger: admin can push a full price-fetch job via the admin page.

Daily scheduled refresh: cron job at 0 AM UTC (9 AM KST) via `@Cron('0 0 * * *')`.

Exchange rate: fetches `USDKRW=X` from Yahoo Finance, applies +1.75% spread (typical Korean bank buying rate). Fallback: 1400 KRW/USD.

**Main frontend files:**
- `frontend/src/app/admin/page.tsx` — price sync UI

**Main backend files:**
- `src/prices/prices.service.ts`
- `src/prices/prices.controller.ts`
- `src/admin/price-fetch.service.ts`
- `src/entities/price-daily.entity.ts`
- `src/entities/benchmark-price-daily.entity.ts`

**Related APIs:**
```
GET  /prices/current?ids=1,2,3    — latest close prices for securities
GET  /prices/data-freshness       — last price and benchmark update dates
GET  /prices/exchange-rate        — USD/KRW with spread + source timestamp
POST /admin/prices/run            — trigger full fetch job (admin only)
GET  /admin/prices/status         — fetch job status (idle/running/done/error)
```

**Current limitations:**
- Yahoo Finance 2 library requires Node ≥ 20 (Railway runs Node 18 — warnings suppressed but functional)
- No intraday or real-time prices — daily close only
- If Yahoo Finance is unavailable, analysis will fail for securities with no cached data

**Free or premium:** Free (price data is infrastructure, not a user-facing feature)

---

### 2.5 Portfolio Analysis

**What it does:**
Computes a comprehensive portfolio health report. Given a portfolio's holdings and a time period, it calculates:

| Metric | Description |
|---|---|
| `healthScore` (0–100) | Deducted by 5 rules (holdings, concentration, sector bias, overweight single stock, underperformance) |
| `diversificationScore` (0–100) | Penalized by holdings count, top-3 concentration, sector concentration; ETF holdings give a bonus |
| `top3Concentration` | % of portfolio in top 3 holdings |
| `maxSectorWeight` | Largest sector by weight |
| `portfolioReturn` | Weighted return over the selected period |
| `benchmarkReturn` | S&P 500 return over same period |
| `excessReturn` | Portfolio - Benchmark |
| `personalReturn` | Actual return vs average purchase cost (if avgCost provided) |
| `sectorExposure` | Array of sector → weight % |
| `portfolioStyle` | One of 6 style labels (ETF중심형, 테크집중형, etc.) |
| `scoreBreakdown` | 5 rules with label, pass/fail, why, action |
| `warnings` | Korean-language alerts |
| `insights` | Diversification insights |
| `rebalanceHints` | Plain-text suggestions |
| `rebalanceResult` | Full rebalancing plan (see section 2.6) |
| `history` | Trend data from past snapshots |

After each analysis, a `portfolio_snapshot` row is saved, which feeds the monitoring system.

**Main frontend files:**
- `frontend/src/app/analyzer/page.tsx` — result tab renders all metrics

**Main backend files:**
- `src/analysis/analysis.service.ts`
- `src/analysis/score.engine.ts`
- `src/analysis/insights.engine.ts`
- `src/analysis/rebalance.engine.ts`

**Related APIs:**
```
POST /analysis/portfolios/:id    — run analysis { period?: '1M'|'3M'|'1Y', benchmarkCode?: string }
```

**Current limitations:**
- Period is fixed to `1Y` in the frontend (UI toggle not wired up)
- Benchmark fixed to `SP500` in the frontend
- No multi-currency analysis (all amounts normalized to USD via exchange rate)

**Free or premium:** Core analysis = Free during trial or if BillingMode is FREE/SOFT_PAYWALL. Premium gate applied when BillingMode is PAID and trial has expired.

---

### 2.6 Rebalancing

**What it does:**
The rebalance engine produces a concrete action plan: which holdings to reduce, which to add, and optionally proposes adding VOO (S&P 500 ETF) to improve diversification. Shows a before/after score comparison. Also tracks baseline drift (how the portfolio has changed since first analysis).

**Rebalancing rules (in order):**
1. Individual stock >30% → trim to 25%, redistribute freed weight
2. Top 3 holdings >70% → trim top 2 to 20%, redistribute
3. Add VOO at 10–20% if ETF shortfall detected and holdings < 5
4. Sector bias >60% → advisory warning (no forced allocation)

Baseline drift compares current weights vs. first snapshot, shows which holdings were added, removed, or shifted.

Frontend also has an **Apply Adjustment** flow: user enters a lump sum to add or withdraw, the system recalculates all weights, and the user can apply it to the saved portfolio.

**Main frontend files:**
- `frontend/src/app/analyzer/page.tsx` — rebalance section in result tab

**Main backend files:**
- `src/analysis/rebalance.engine.ts`

**Related APIs:**
- Included in `POST /analysis/portfolios/:id` response as `rebalanceResult`

**Current limitations:**
- No one-click "apply rebalance" button — user adjusts weights manually
- No partial application (can't apply only some suggestions)
- VOO suggestion is hardcoded — not configurable

**Free or premium:** Rebalance suggestion = visible to all. Deep action details may be gated by `isPremium` flag on the frontend.

---

### 2.7 Monitoring / State Detection

**What it does:**
Two parallel systems run after every analysis:

**A. Event detection** (`portfolio_state_events`): Compares the latest two snapshots to detect 7 types of adverse changes. One event of each type per portfolio per day (deduplication).

| Event Type | Trigger |
|---|---|
| `SCORE_DROP` | Health score falls ≥10 pts or crosses below 50 |
| `DIVERSIFICATION_DROP` | Diversification score drops ≥10 pts |
| `OVERWEIGHT_ENTERED` | Any non-ETF stock crosses 50% weight |
| `SECTOR_BIAS_ENTERED` | Largest sector crosses 65% |
| `TOP3_CONCENTRATION_ENTERED` | Top 3 holdings cross 75% |
| `REBALANCE_NEEDED` | Health score crosses from ≥60 to <60 |
| `OPPORTUNITY_AVAILABLE` | Rebalancing would improve score by ≥15 pts |

**B. State tracking** (`portfolio_states`): Records the current state label after every analysis.

| State | Condition |
|---|---|
| `risky` | healthScore < 50 |
| `deteriorating` | Score or diversification dropped ≥10 pts from previous |
| `concentrated` | top3 ≥75%, or sector ≥65%, or single stock ≥50% |
| `improving` | Was risky/concentrated/deteriorating, now +5 pts from previous |
| `stable` | Default — none of the above |

Detection also runs as a daily cron job at 9 AM KST for all portfolios.

**Main frontend files:**
- `frontend/src/app/analyzer/page.tsx` — state card (result tab top), notification bell

**Main backend files:**
- `src/monitoring/monitoring.service.ts`
- `src/monitoring/state-change-detector.ts`
- `src/monitoring/portfolio-state.calculator.ts`
- `src/entities/portfolio-state-event.entity.ts`
- `src/entities/portfolio-state.entity.ts`

**Related APIs:**
```
GET  /portfolios/:id/current-state   — { state, reason, trend, metrics, changedAt }
GET  /portfolios/:id/state-events    — 20 most recent events for portfolio
GET  /notifications                  — 50 most recent events across all portfolios
POST /notifications/:id/read         — mark one event read
POST /notifications/read-all         — mark all read
```

**Current limitations:**
- No state history timeline view (records exist in DB, no API/UI for history yet)
- First analysis never triggers events (requires a previous snapshot for comparison)
- Daily cron detects changes but only sends web push if VAPID is configured

**Free or premium:** Free

---

### 2.8 Notifications / State Events

**What it does:**
Two notification channels:

**In-app:** Bell icon in the analyzer page header. Shows unread count badge. Dropdown lists up to 15 recent events with severity color coding (red/amber/green/gray). Click to mark read. "모두 읽음" button marks all.

**Web push:** Browser/OS native notifications via Web Push API + Service Worker. Requires user opt-in (browser permission) and VAPID key configuration on the server.

**Main frontend files:**
- `frontend/src/app/analyzer/page.tsx` — bell icon, dropdown, unread badge
- `frontend/public/sw.js` — service worker for push handling

**Main backend files:**
- `src/push/push.service.ts`
- `src/push/push.controller.ts`
- `src/entities/push-subscription.entity.ts`

**Related APIs:**
```
GET    /push/vapid-public-key    — public key for browser subscription
POST   /push/subscribe           — register push subscription { endpoint, keys }
DELETE /push/unsubscribe         — remove subscription { endpoint }
```

**Current limitations:**
- VAPID keys not configured in Railway production environment → web push is silently disabled
- No push opt-in prompt shown to users unless they open the notification dropdown
- No grouping or priority ordering of notification types in the UI

**Free or premium:** In-app notifications = Free. Push notifications = Free (infrastructure not yet active)

---

### 2.9 Trial / Premium / Paywall

**What it does:**
All new users receive a 7-day trial (`trialEndsAt` on User entity). During trial, all analysis features are accessible as if premium. After trial expiry, access depends on BillingMode:

| BillingMode | Effect |
|---|---|
| `FREE` | Everyone has premium access (paywall disabled) |
| `SOFT_PAYWALL` | Paywall UI visible but payment not required |
| `PAID` | Trial OR PremiumUnlock required to access premium features |

Payment is handled by **Toss Payments** (Korean PG). After successful payment, a `premium_unlocks` row is created linking user + portfolio.

**Main frontend files:**
- `frontend/src/app/analyzer/page.tsx` — paywall UI if `isPremium = false`

**Main backend files:**
- `src/payments/payments.service.ts`
- `src/payments/payments.controller.ts`
- `src/entities/premium-unlock.entity.ts`
- `src/admin/admin.service.ts` — BillingMode storage + grant trial

**Related APIs:**
```
POST /payments/confirm           — verify Toss payment + store unlock
GET  /payments/status/:portfolioId — check if portfolio is unlocked
```

**Current limitations:**
- `TOSS_SECRET_KEY` env var not set in Railway → payment confirmation will fail with 401
- No refund or cancellation flow
- No subscription model — current design is per-portfolio one-time unlock
- No payment UI code visible — Toss SDK widget integration assumed on frontend side
- `stripeSessionId` column name is misleading (actually stores Toss orderId)

**Free or premium:** Trial users = premium for 7 days. After that, requires unlock in PAID mode.

---

### 2.10 Admin Page

**What it does:**
A protected internal page at `/admin` for the product operator. Allows toggling billing mode, managing users, and triggering price data sync.

| Feature | What it does |
|---|---|
| Billing Mode Toggle | Switch between FREE / SOFT_PAYWALL / PAID instantly |
| User List | View all registered users (id, name, email, phone, trial expiry) |
| Change Password | Set any user's password via bcrypt hash |
| Grant Trial | Add 7 days to a user's trial expiry |
| Delete User | Remove user + cascade to all their data |
| Price Fetch Status | See last run result (idle / running / done / error) |
| Run Price Fetch | Trigger full Yahoo Finance batch job |

**Main frontend files:**
- `frontend/src/app/admin/page.tsx`

**Main backend files:**
- `src/admin/admin.controller.ts`
- `src/admin/admin.service.ts`
- `src/admin/price-fetch.service.ts`

**Related APIs:**
```
GET   /admin/settings/billing-mode        — get current mode
PATCH /admin/settings/billing-mode        — set mode { mode }
GET   /admin/users                        — list all users
PATCH /admin/users/:id/password           — change password { password }
POST  /admin/users/:id/trial              — grant trial { days? }
DELETE /admin/users/:id                   — delete user
GET   /admin/prices/status                — price fetch job status
POST  /admin/prices/run                   — trigger price fetch
```

**Current limitations:**
- `ADMIN_EMAIL` env var not configured → all admin API routes return 403
- No audit log for admin actions
- No 2FA for admin access

**Free or premium:** Internal operator tool — not user-facing

---

### 2.11 Branding

**What it does:**
All app surfaces use "Portra AI" branding with a consistent visual identity: gradient logo (purple → blue → green), DM Sans typography, dark `#0F1020` background for icon contexts.

Logo concept: an area chart (rising portfolio curve) with a gradient fill and a green peak indicator dot — represents portfolio performance growth.

Brand colors:
- Primary purple: `#6C5CE7`
- Vibrant blue: `#2D9CDB`
- Mint green: `#2ECC71`
- Dark background: `#0F1020`

**Main frontend files:**
- `frontend/src/components/brand/PortraLogo.tsx` — `PortraLogo`, `PortraSymbol`, `PortraAppIcon` components
- `frontend/src/components/brand/PortraIcon.tsx` — re-export alias
- `frontend/public/portra-icon.svg` — 512×512 static SVG for favicon/OG
- `frontend/src/app/layout.tsx` — app title and description metadata

**Current limitations:**
- No PWA `manifest.json` — app cannot be installed as a PWA
- Favicon served from `/app/favicon.ico` (not SVG-based)
- No OG / Twitter card meta tags for social sharing

---

## 3. Current Core User Flow

```
1. Landing on /analyzer
   → Not logged in → AuthModal shown automatically

2. Signup/Login
   → Email signup (name + email + password + 3 required consents)
   → OR Google OAuth
   → OR Phone OTP (SMS mocked in current build)
   → 7-day trial starts immediately on account creation

3. Create portfolio
   → Click "새 포트폴리오" in sidebar
   → Search securities by ticker, name, or Korean name
   → Add items: set weight (%) or investment amount (KRW)
   → Optionally run Beginner Guide wizard to get AI starter suggestion

4. Run analysis
   → Click "분석하기"
   → Backend computes health score, diversification, returns, sector exposure
   → Snapshot saved to DB
   → State detection runs async (post-analysis + daily cron)
   → Result tab opens

5. Review results
   → Portfolio state card (stable / concentrated / risky / improving / deteriorating)
   → Health score + diversification score
   → Sector exposure breakdown
   → Rebalancing suggestions with before/after score
   → Baseline drift (changes since first analysis)
   → Score breakdown (5 rules)
   → Warnings and insights

6. Rebalance (manual)
   → Review suggested actions in result tab
   → Manually adjust weights in input tab
   → Re-run analysis to confirm improvement

7. Monitor over time
   → Notification bell shows unread count when state events detected
   → Click bell → see event list (SCORE_DROP, SECTOR_BIAS_ENTERED, etc.)
   → Daily cron re-checks all portfolios at 9 AM KST

8. Trial expires (after 7 days, in PAID billing mode)
   → isPremium = false returned from analysis
   → Paywall UI shown for premium features
   → Payment via Toss Payments to unlock
```

---

## 4. Known Unfinished Areas

| Area | Status | Notes |
|---|---|---|
| **Payment live integration** | Not active | `TOSS_SECRET_KEY` not set in Railway. confirmPayment() will return 401. |
| **Phone auth real provider** | Stubbed | `MockSmsProvider` only logs code to console. No real SMS sent. |
| **Push notifications** | Not active | VAPID keys not configured in Railway. All push calls silently no-op. |
| **Weekly summary** | Not implemented | Planned in MONITORING_REDESIGN Phase C. No cron, no template, no API. |
| **PWA / App installation** | Not implemented | No manifest.json. Cannot be added to home screen. |
| **Legal pages** | Unclear | Terms/Privacy/Risk Disclaimer text is referenced in consent UI but no dedicated legal pages at `/terms`, `/privacy`, etc. |
| **Apple Login** | Incomplete | Entity field exists, button removed from UI. OAuth flow not implemented. |
| **Admin access** | Not configured | `ADMIN_EMAIL` env var missing → 403 on all admin routes in production. |
| **Trial expiration UX** | Basic | `isPremium: false` flag returned but no dedicated "trial expired" interstitial or countdown. Planned in ROADMAP Phase 2. |
| **Portfolio import/export** | Not implemented | Manual add-by-search only. |
| **Analysis period selector** | Stubbed | UI wired to 1Y fixed. `period` param accepted by API but not used in frontend. |
| **Notification impact/action layer** | Not implemented | Planned in MONITORING_REDESIGN Phase B. Current events have title + message only. |
| **State history timeline** | Data exists, no UI | `portfolio_states` table populated after Phase A but no timeline view yet. |

---

## 5. Current Technical Risks

### 5.1 Data Freshness
**Risk:** Price data is fetched from Yahoo Finance on demand (first analysis) and via daily cron. If Yahoo Finance is unavailable, analyses for securities with no cached data will fail. There is no price staleness indicator shown to users.

**Current mitigation:** `GET /prices/data-freshness` endpoint exists; admin page shows last sync date. Not surfaced to end users.

### 5.2 Notification / Event Duplication
**Risk:** Deduplication is per event type per day per portfolio. If a user runs analysis 3 times in one day, only one `SCORE_DROP` event fires. However, on the daily cron, the same event could fire even if the user already saw it from a manual analysis earlier that day — the check only prevents two events of the same type on the same day, not "already notified today."

**Current mitigation:** Day-boundary deduplication is correct. No cross-channel dedup risk currently (push disabled).

### 5.3 Monitoring Accuracy — First Analysis
**Risk:** The first time a user runs analysis, no previous snapshot exists. Both `detectAfterAnalysis` and `calculateState` return early / fall back to `stable` with no events fired. This means a newly created portfolio with serious concentration issues will not generate alerts on first analysis.

**Impact:** User's first analysis impression may not reflect actual risk level in the notification system.

### 5.4 Premium Gate Consistency
**Risk:** `isPremium` is returned from the analysis API and the frontend decides what to show. If the frontend code has gaps (e.g., some feature shown without checking `isPremium`), premium features leak to free users. The backend does not enforce feature-level access — it only sets the flag.

**Impact:** In PAID billing mode, some premium features may be accessible without payment depending on frontend completeness.

### 5.5 Investment Advice Wording Risk
**Risk:** Rebalancing suggestions, insights, and warnings use directive language ("리밸런싱이 필요한 상태예요", "조금만 바꾸면 크게 좋아질 수 있어요"). In Korea, providing specific investment recommendations without a license is regulated under the Financial Investment Services and Capital Markets Act (자본시장법).

**Current mitigation:** The product description explicitly states it is not investment advisory. Risk Disclaimer consent is required at signup. However, individual event/suggestion copy should be reviewed against the disclaimer wording.

### 5.6 JWT Secret Fallback
**Risk:** If `JWT_SECRET` env var is not set, the JWT strategy falls back to the hardcoded string `'default-secret'`. In production, this means all tokens are signed with a known, public key.

**Status:** Needs to be confirmed set in Railway environment variables.

### 5.7 synchronize: true in Production
**Risk:** TypeORM `synchronize: true` is active in `app.module.ts`. This auto-alters the DB schema on every backend restart to match entity definitions. In production, this can cause data loss if an entity column is removed or renamed carelessly.

**Current mitigation:** Acceptable at current early stage. Should be migrated to explicit migration files before public launch.
