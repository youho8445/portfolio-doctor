# Guest Analysis Funnel Plan

## 1. Current Flow Summary

```
Landing page
  → CTA → /analyzer
    → mount: isLoggedIn? NO → openModal() (auth modal appears)
    → all API calls blocked until login
    → user must sign up / log in just to enter portfolio
```

**Bottleneck:** User cannot see any value before creating an account.  
All analysis requires: (1) valid JWT, (2) saved portfolio row in DB, (3) portfolioId owned by that user.  
No public/stateless analysis endpoint exists.

---

## 2. Proposed Guest Flow

```
Landing page
  → CTA "무료 분석 시작" → /analyzer (no auth check)
  → Guest enters portfolio items manually (ticker search, weights)
  → "분석하기" button → POST /analysis/guest (stateless, no DB write)
  → Guest result page shows:
      ✅ Health score
      ✅ Top 1~2 risk signals
      ✅ Sector/concentration summary
      ✅ Basic educational explanation
      🔒 Detailed rebalancing actions  ← signup gate
      🔒 Before/after score simulation ← signup gate
      🔒 Save portfolio                ← signup gate
      🔒 Alerts / monitoring           ← signup gate
  → Signup gate CTA: "AI가 리밸런싱 액션을 찾았어요"
      → opens existing AuthModal
      → after signup, offer to save current guest portfolio
```

**Logged-in free user:** unchanged from today (save + basic analysis).  
**Premium user:** unchanged from today (full rebalancing, alerts, simulation).

---

## 3. Files Likely Affected

### Backend (NestJS at `src/`)
| File | Change |
|------|--------|
| `src/analysis/analysis.controller.ts` | Add `POST /analysis/guest` (no JWT guard) |
| `src/analysis/analysis.service.ts` | Add `analyzeGuest(items[])` method |
| `src/analysis/dto/analyze-portfolio.dto.ts` | Add `GuestAnalysisDto` with inline items |
| `src/analytics/analytics.controller.ts` | Add 4 new guest funnel events to whitelist |

### Frontend (Next.js at `frontend/src/`)
| File | Change |
|------|--------|
| `frontend/src/app/analyzer/page.tsx` | Remove hard auth gate on mount; add guest-mode path |
| `frontend/src/app/page.tsx` | Update CTA copy to reflect guest-first flow |
| `frontend/src/lib/api.ts` | Add `analyzePortfolioGuest(items[])` API call |
| `frontend/src/types/index.ts` | Add `GuestPortfolioItem` type for inline analysis input |

---

## 4. Backend / API Changes

### New endpoint: `POST /analysis/guest`

- **No JWT guard** (public)
- **No portfolioId** — items sent inline in request body
- **Throttled:** 10 req/min per IP to prevent abuse
- **No DB write** — analysis runs entirely in memory

**Request body:**
```typescript
{
  items: {
    ticker: string;       // e.g. "005930.KS"
    name: string;         // display name
    weight: number;       // 0–100
    amount?: number;      // optional KRW amount
    avgCost?: number;     // optional avg buy price
  }[];
  period?: '1M' | '3M' | '1Y';       // default '1Y'
  benchmarkCode?: string;             // default 'SP500'
  userId?: null;                      // always null for guests
}
```

**Response** (subset of full AnalysisResult):
```typescript
{
  healthScore: number;
  diversificationScore: number;
  scoreBreakdown: ScoreRule[];
  top3Concentration: number;
  sectorExposure: { sector: string; weight: number }[];
  warnings: string[];           // top 1~2 only
  insights: string[];           // top 1~2 only
  portfolioStyle: string;
  rebalanceResult: null;        // always null for guests — gated
  isPremium: false;
  isGuest: true;
}
```

**Implementation notes:**
- Reuse existing `analysis.service.ts` score/insight logic
- Do NOT call the rebalance engine for guest (skip it entirely to keep response fast and avoid leaking full advice)
- Fetch current prices via existing `SecurityPrice` repo (same as authenticated flow)
- Securities lookup: match ticker to `securities` table — if not found, accept name from client
- Limit to 20 items max to prevent abuse

**New analytics events to whitelist** (in `analytics.controller.ts`):
```
guest_analysis_started
guest_analysis_completed
guest_signup_gate_viewed
guest_signup_clicked
```

---

## 5. Frontend Changes

### `frontend/src/app/analyzer/page.tsx`

**Remove hard auth gate on mount:**
```typescript
// CURRENT (line ~273):
if (!isLoggedIn) { openModal(); return; }

// NEW:
// No redirect/modal on mount — guests proceed to portfolio input
```

**Add guest-mode state tracking:**
```typescript
const isGuest = !isLoggedIn;
```

**Portfolio input panel:** already works client-side (securities search, weight input).  
Guest users use the same panel but:
- "저장" / "불러오기" buttons → hidden or show signup prompt
- Portfolio saved in React state only (no DB)

**"분석하기" button handler:**
```typescript
// If guest: call analyzePortfolioGuest(items)
// If logged-in: existing flow (save portfolio to DB → call analyzePortfolio(portfolioId))
```

**Analysis result display (guest):**
- Health score card: ✅ shown
- Risk signals / warnings: ✅ top 1~2 shown
- Sector exposure chart: ✅ shown
- Rebalancing section: replaced with signup gate card
- Save/alerts buttons: hidden or show signup prompt

**Signup gate card (replaces rebalancing panel for guests):**
```
┌─────────────────────────────────────────────────────────┐
│  🔒  AI가 리밸런싱 액션을 찾았어요                          │
│                                                         │
│  상세 조정 비율과 적용 후 점수 변화는                        │
│  가입 후 확인할 수 있습니다.                                │
│                                                         │
│  [무료로 가입하고 계속 보기]                               │
└─────────────────────────────────────────────────────────┘
```
- Clicking the CTA fires `guest_signup_clicked` event then opens `AuthModal`
- Gate card appears on scroll into view → fires `guest_signup_gate_viewed` event

**After signup (in AuthModal success callback):**
- If guest portfolio items exist in state → offer "지금 입력한 포트폴리오를 저장할까요?" confirm dialog
- If confirmed → create portfolio in DB + add items → run full authenticated analysis

### `frontend/src/lib/api.ts`

Add:
```typescript
export async function analyzePortfolioGuest(
  items: { ticker: string; name: string; weight: number; amount?: number; avgCost?: number }[],
  period: '1M' | '3M' | '1Y' = '1Y',
  benchmarkCode = 'SP500',
) {
  const res = await fetch(`${API_BASE_URL}/analysis/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, period, benchmarkCode }),
  });
  if (!res.ok) throw new Error('Guest analysis failed');
  return res.json();
}
```

### `frontend/src/app/page.tsx`

- CTA copy: "30일 무료로 시작하기" → "지금 바로 분석해보기 (가입 불필요)"
- Sub-copy: "포트폴리오를 입력하면 바로 건강 점수를 확인할 수 있어요. 저장과 알림은 무료 가입 후 가능합니다."

---

## 6. Analytics Events

| Event | Where fired | Purpose |
|-------|-------------|---------|
| `guest_analysis_started` | Client: "분석하기" clicked (no token) | Funnel entry |
| `guest_analysis_completed` | Client: guest result received | Funnel conversion |
| `guest_signup_gate_viewed` | Client: gate card enters viewport | Gate impression |
| `guest_signup_clicked` | Client: gate CTA clicked | Intent signal |

Existing events unaffected:
- `page_view_landing`, `page_view_analyzer`, `analysis_run`
- `checkout_page_view`, `payment_success`

---

## 7. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Abuse: bots running thousands of guest analyses | Medium | IP throttle (10 req/min), max 20 items |
| Guest state lost on page refresh | Low | Acceptable — guest flow is ephemeral by design |
| Securities price fetch may fail for unknown tickers | Low | Return null price; analysis skips personal return calc |
| Post-signup portfolio save adds complexity to auth callback | Medium | Implement save-on-signup as optional confirm dialog, never auto-save silently |
| Existing logged-in flow breaks if auth gate removed | High | Gate removal is conditional: only skip if `!isLoggedIn`; all save/load actions still require auth |
| Premium gating must not regress | High | `isGuest: true` in guest response guarantees no rebalanceResult is returned from server |

---

## 8. Implementation Steps

### Step 1 — Backend: Guest analysis endpoint
- Add `GuestAnalysisDto` with inline items array in `src/analysis/dto/`
- Add `analyzeGuest(dto)` method to `AnalysisService` (reuse score + insights, skip rebalance)
- Add `POST /analysis/guest` route in `AnalysisController` (no JWT guard, throttle decorator)
- Add 4 guest events to analytics whitelist

### Step 2 — Backend: Typecheck + test
- `npx tsc --noEmit` passes
- Manual curl test: `POST /analysis/guest` with sample items returns score

### Step 3 — Frontend: API layer
- Add `analyzePortfolioGuest()` to `frontend/src/lib/api.ts`
- Add `GuestPortfolioItem` type to `frontend/src/types/index.ts`

### Step 4 — Frontend: Analyzer page — guest mode
- Remove hard auth gate from initial `useEffect`
- Add `isGuest` derived state
- Branch "분석하기" handler: guest path calls `analyzePortfolioGuest()`, logged-in path unchanged
- Hide save/load portfolio buttons for guests (or show inline sign-up prompt)

### Step 5 — Frontend: Guest result display
- Health score + warnings: show for all
- Rebalancing panel: replace with `GuestSignupGate` component when `isGuest && analysis`
- Signup gate: opens `AuthModal`, fires analytics events
- Post-signup: check for pending guest items → show save dialog

### Step 6 — Frontend: Landing page CTA copy
- Update copy to reflect guest-first flow

### Step 7 — QA checklist
- [ ] Guest can enter portfolio + run analysis without login
- [ ] No portfolio row created in DB for guest analysis
- [ ] Guest result shows health score + top 1~2 warnings
- [ ] Rebalancing section shows locked gate for guest
- [ ] Gate CTA opens auth modal
- [ ] After signup, guest items offered for save
- [ ] Logged-in free user flow unchanged
- [ ] Premium user flow unchanged
- [ ] Admin page analytics show new guest events
- [ ] TypeScript typecheck passes (backend + frontend)
- [ ] Frontend build passes
- [ ] No regression in existing conversion/payment funnel

---

*Created: 2026-05-16*  
*Status: Awaiting approval before implementation*
