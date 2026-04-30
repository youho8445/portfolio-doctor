# PHASE_B_IMPLEMENTATION_PLAN.md — IMPACT + ACTION Layer

> Status: Awaiting approval. No code written yet.
> Prerequisite: Phase A complete (✓ merged on 2026-04-30)

---

## Summary

Add two new layers to the monitoring system:
- **IMPACT**: a 1-2 sentence explanation of *why* the detected change is dangerous
- **ACTION**: a labeled button that deep-links the user into the rebalancing simulator

Free vs premium split is defined below. No new tables. No redesigns. No notification overhaul.

---

## 1. What Changes and Why

### Current state (Phase A)
Each `portfolio_state_events` row has: `eventType, title, message, severity`
The notification dropdown renders: dot color, title, message, date.
Nothing tells the user *why* it matters or *what to do*.

### Phase B additions
Each new event will carry:
- `impactBody` — 1-2 sentences explaining the risk behind the detected change
- `actionType` — machine-readable action category  
- `actionLabel` — CTA button text
- `isPremiumFeature` — whether impact/action are locked for free users

Old event rows remain valid (new columns NULL → no breakage).

---

## 2. Files Affected

### Backend — modified files

| File | What changes |
|---|---|
| `src/entities/portfolio-state-event.entity.ts` | Add 4 nullable columns |
| `src/monitoring/state-change-detector.ts` | Extend `DetectedEvent` interface + populate new fields in all 7 event definitions |
| `src/monitoring/monitoring.service.ts` | Update `saveNewEvents()` to persist the 4 new fields |
| `src/auth/auth.controller.ts` | Add `isPremiumUser` field to `GET /auth/me` response |
| `src/admin/admin.service.ts` | Expose `getBillingMode()` for use in auth/me (already exists, just needs injection) |

### Frontend — modified files

| File | What changes |
|---|---|
| `frontend/src/types/index.ts` | Add 4 fields to `StateEvent` type; add `isPremiumUser` to `AuthUser` type |
| `frontend/src/contexts/AuthContext.tsx` | AuthUser already has `trialEndsAt`; derive `isPremiumUser` from it on the client |
| `frontend/src/app/analyzer/page.tsx` | (1) Add `id` to rebalance section, (2) update notification dropdown to show impact + action, (3) add action button to state card |

### No changes to
- `portfolio-state.calculator.ts` — untouched
- `portfolio-state.entity.ts` — untouched
- `monitoring.module.ts` / `monitoring.controller.ts` — untouched
- All other modules, services, controllers

---

## 3. Database Migration Plan

**No manual migration needed.** `synchronize: true` is active.

### New columns on `portfolio_state_events`

```
impactBody        TEXT         NULL    — 1-2 sentence risk explanation (premium)
actionType        VARCHAR(32)  NULL    — 'rebalance' | 'reduce_concentration' |
                                         'diversify_sector' | 'monitor' | NULL
actionLabel       VARCHAR(60)  NULL    — CTA button text shown in UI
isPremiumFeature  BOOLEAN      DEFAULT FALSE — gates impactBody + actionButton display
```

All nullable. Old rows untouched. New rows populated from updated `detectStateChanges()`.

---

## 4. IMPACT + ACTION Definitions Per Event Type

All Korean text is final copy — no placeholder strings.

| Event Type | impactBody | actionType | actionLabel | isPremiumFeature |
|---|---|---|---|---|
| `SCORE_DROP` | "건강 점수 하락은 포트폴리오 전체의 리스크가 높아졌다는 신호예요. 지금 조치하지 않으면 같은 방향으로 계속 악화될 수 있어요." | `rebalance` | "리밸런싱 확인하기 →" | `true` |
| `DIVERSIFICATION_DROP` | "분산도가 낮아지면 특정 종목이나 섹터의 충격이 포트폴리오 전체에 직접 영향을 줘요. 한쪽이 흔들리면 전체가 함께 흔들려요." | `rebalance` | "분산도 개선하기 →" | `true` |
| `OVERWEIGHT_ENTERED` | "한 종목이 50% 이상이면, 그 회사 한 곳의 이슈가 내 자산의 절반에 영향을 줘요. 분산 투자의 핵심은 한 바구니에 담지 않는 것이에요." | `reduce_concentration` | "비중 조정하기 →" | `true` |
| `SECTOR_BIAS_ENTERED` | "같은 섹터 종목들은 경제 흐름에 따라 함께 움직여요. 섹터 편중은 여러 종목을 보유해도 실질적으로 분산이 안 된 상태예요." | `diversify_sector` | "섹터 분산하기 →" | `true` |
| `TOP3_CONCENTRATION_ENTERED` | "상위 3개가 75%를 넘으면 그 3종목의 성과가 곧 포트폴리오 전체 성과예요. 나머지 종목들은 사실상 영향이 없는 셈이에요." | `rebalance` | "집중도 낮추기 →" | `true` |
| `REBALANCE_NEEDED` | "건강 점수 60점 미만은 이미 개선이 필요한 구간이에요. 지금 리밸런싱하면 리스크를 줄이면서 더 나은 성과를 기대할 수 있어요." | `rebalance` | "지금 리밸런싱하기 →" | `true` |
| `OPPORTUNITY_AVAILABLE` | "작은 비중 조정으로 큰 점수 향상이 가능한 상태예요. 지금이 가장 효율적으로 포트폴리오를 개선할 수 있는 타이밍이에요." | `rebalance` | "개선 적용하기 →" | `false` |

**Note on `OPPORTUNITY_AVAILABLE`**: `isPremiumFeature = false` — this is a positive signal, always shown to free users to drive engagement and analysis re-runs.

---

## 5. Free vs Premium Strategy

### Determining premium status
`GET /auth/me` will add `isPremiumUser: boolean` to the response.

**Backend rule (auth/me):**
```
isPremiumUser = (billingMode === 'FREE' || billingMode === 'SOFT_PAYWALL')
             OR (trialEndsAt != null AND trialEndsAt > now)
```
This mirrors the same logic already used in `analysis.service.ts` for the `isPremium` flag,
but applied at the user level (not per-portfolio).

**Frontend:** `AuthContext` already calls `GET /auth/me` on mount and re-hydrates. Adding `isPremiumUser` to `AuthUser` means all components that call `useAuth()` get it automatically — including the notification dropdown.

### What free users see in the notification dropdown

```
┌──────────────────────────────────────────┐
│  ⚡ 한 종목에 너무 많이 몰렸어요           │  ← title (always shown)
│  삼성전자 비중이 54%가 됐어요.             │  ← message (always shown)
│  [🔒 자세한 이유 보기 — 프리미엄]         │  ← locked button (free users only)
│  2026-04-30                               │
└──────────────────────────────────────────┘
```

Clicking "🔒 자세한 이유 보기" → triggers `handleCheckout()` (existing premium upgrade flow).
Exception: `OPPORTUNITY_AVAILABLE` events show the action button for free users without a lock.

### What premium users see

```
┌──────────────────────────────────────────┐
│  ⚡ 한 종목에 너무 많이 몰렸어요           │  ← title
│  삼성전자 비중이 54%가 됐어요.             │  ← message
│  한 종목이 50% 이상이면, 그 회사 한 곳의   │  ← impactBody (premium)
│  이슈가 내 자산의 절반에 영향을 줘요.      │
│  [비중 조정하기 →]                        │  ← action button (premium)
│  2026-04-30                               │
└──────────────────────────────────────────┘
```

### What the API returns
The API (`GET /notifications`) always returns all fields including `impactBody`.
Gating is purely in the frontend based on `isPremiumUser` from `AuthContext`.
This is acceptable for Phase B — `impactBody` is educational text, not sensitive.

---

## 6. Connecting Action to the Rebalancing Simulator

### Current situation
The rebalancing simulator is rendered inside the result tab when `analysis.rebalanceResult` exists.
There is no anchor point and no direct link from the notification dropdown.

### Phase B changes

**Step 1 — Add anchor ID to rebalancing section in `page.tsx`:**
Add `id="rebalance-section"` to the outer `<div>` of the rebalancing content block
(the block that contains the blur overlay at line ~1797 and the apply button at line ~2057).

**Step 2 — Action click handler:**

```typescript
function handleNotificationAction(portfolioId: number) {
  setNotifOpen(false);
  // If this portfolio is loaded in the analyzer, switch to result tab and scroll
  if (currentPortfolioId === portfolioId && analysis) {
    setActiveTab('result');
    // Small delay to let tab switch render before scrolling
    setTimeout(() => {
      document.getElementById('rebalance-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
  // If a different portfolio is loaded, do nothing — user sees the notification is for a different portfolio
}
```

**Step 3 — Add action button to state card (Phase A enhancement):**
The state card currently shows badge + reason + trend arrow.
For states `risky`, `concentrated`, `deteriorating`: add a small text link "리밸런싱 확인하기 →"
that calls `handleNotificationAction(analysis.portfolioId)`.

This is always visible (not premium-gated) because clicking it only scrolls to the rebalancing section,
which already has its own paywall overlay for free users.

```
┌─────────────────────────────────────────────────────────────┐
│  [ ● 집중 ]  상위 3개 종목에 자산이 집중되어 있어요.   ↓     │
│             리밸런싱 확인하기 →                               │  ← new (non-premium)
└─────────────────────────────────────────────────────────────┘
```

---

## 7. API Structure Changes

### Modified: `GET /auth/me`

**Current response:**
```json
{ "id": 1, "email": "...", "name": "...", "phoneNumber": null, "trialEndsAt": "2026-05-07T..." }
```

**New response (additive):**
```json
{ "id": 1, "email": "...", "name": "...", "phoneNumber": null, "trialEndsAt": "2026-05-07T...", "isPremiumUser": true }
```

No change to request format. No breaking change.

### Unchanged: `GET /notifications`

Response now includes `impactBody`, `actionType`, `actionLabel`, `isPremiumFeature` on new events.
Old events return `null` for these fields — handled gracefully by the frontend.

---

## 8. Frontend Structure

### `frontend/src/types/index.ts`

Add to `StateEvent`:
```typescript
impactBody: string | null;
actionType: string | null;
actionLabel: string | null;
isPremiumFeature: boolean;
```

Add to `AuthUser`:
```typescript
isPremiumUser?: boolean;
```

### `frontend/src/contexts/AuthContext.tsx`

No new logic needed. `GET /auth/me` is already called on mount and the response is stored in `user`.
`user.isPremiumUser` will be available after the `isPremiumUser` field is added to the response.

### `frontend/src/app/analyzer/page.tsx`

Three surgical changes:

1. **Rebalance section anchor** (1 line)
   Add `id="rebalance-section"` to the outer div of the rebalancing section.

2. **`handleNotificationAction()` function** (~10 lines)
   New function as described in Section 6.

3. **Notification dropdown per-item update** (expand existing `renderNotifDropdown`)
   After the message line, conditionally render:
   - Premium user + impactBody present → render impactBody paragraph
   - Premium user + actionLabel present → render action button
   - Free user + `isPremiumFeature = true` → render locked "자세한 이유 보기 🔒" button
   - Free user + `isPremiumFeature = false` (OPPORTUNITY) → render action button (no lock)

4. **State card action link** (~5 lines)
   After the `reason` text, if `state` is `risky | concentrated | deteriorating` and `analysis` is loaded,
   render a small "리밸런싱 확인하기 →" button.

---

## 9. Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| New nullable columns break old rows | None | Columns are NULL-default, old rows valid |
| `detectStateChanges()` change breaks existing events | Low | Only adds new fields; existing 7 events still fire with same title/message/severity |
| `isPremiumUser` stale in AuthContext | Low | `GET /auth/me` is called fresh on every page mount; worst case 1 session stale |
| Scroll fails if analysis is not loaded | Low | `handleNotificationAction` checks `currentPortfolioId === portfolioId && analysis` before scrolling |
| Impact text sounds like investment advice | Medium | Text explains portfolio mechanics, not predictions. Must be reviewed against risk disclaimer wording |
| `isPremiumUser` leaks from API for non-premium | None | `impactBody` is educational text, not private data |

---

## 10. Test Checklist

- [ ] Backend: New columns exist in `portfolio_state_events` after restart
- [ ] Backend: New events have `impactBody`, `actionType`, `actionLabel`, `isPremiumFeature` populated
- [ ] Backend: Old events (impactBody = null) still render correctly in dropdown
- [ ] Backend: `GET /auth/me` returns `isPremiumUser: true` for trial user in PAID mode
- [ ] Backend: `GET /auth/me` returns `isPremiumUser: true` in FREE billing mode
- [ ] Frontend: Premium user sees `impactBody` text below message in dropdown
- [ ] Frontend: Premium user sees action button; click closes dropdown, switches to result tab, scrolls to rebalance section
- [ ] Frontend: Free user sees lock button instead of impact/action (except OPPORTUNITY_AVAILABLE)
- [ ] Frontend: Free user clicking lock button triggers checkout flow
- [ ] Frontend: OPPORTUNITY_AVAILABLE shows action button for free user (no lock)
- [ ] Frontend: State card shows "리밸런싱 확인하기 →" for risky/concentrated/deteriorating states
- [ ] Frontend: State card action scrolls to rebalance section when analysis is loaded
- [ ] Frontend: State card action does nothing gracefully when no analysis is loaded
- [ ] Regression: Existing notification bell, unread count, mark-as-read all work unchanged
- [ ] Regression: Existing rebalancing section renders and functions unchanged

---

## 11. Rollback Plan

Phase B is fully additive. To roll back:

1. Remove 4 new columns from entity → TypeORM drops them on restart (only new events affected)
2. Revert `detectStateChanges()` to remove new fields from DetectedEvent
3. Revert `saveNewEvents()` to not persist new fields
4. Revert `GET /auth/me` to remove `isPremiumUser`
5. Revert notification dropdown JSX to previous state
6. Remove `id="rebalance-section"` and `handleNotificationAction()`
7. Remove state card action link

No existing data is lost. All prior notifications remain intact.

---

## Waiting for approval to begin implementation.
