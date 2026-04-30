# PHASE_A_IMPLEMENTATION_PLAN.md — Portfolio State Foundation

> Status: Awaiting approval. No code written yet.

---

## Summary

Add a persistent `portfolio_states` table and `GET /portfolios/:id/current-state` endpoint.
Show a minimal state card in the frontend result tab. No redesigns, no premium logic, no notification changes.

---

## 1. Files Affected

### Backend — new files
| File | Purpose |
|---|---|
| `src/entities/portfolio-state.entity.ts` | New TypeORM entity for `portfolio_states` table |
| `src/monitoring/portfolio-state.calculator.ts` | Pure function: `calculateState(current, previous)` |

### Backend — modified files
| File | What changes |
|---|---|
| `src/monitoring/monitoring.module.ts` | Add `PortfolioState` to `TypeOrmModule.forFeature([...])` |
| `src/monitoring/monitoring.service.ts` | Add `computeAndSaveState()` and `getCurrentState()` methods; inject `PortfolioState` repo |
| `src/monitoring/monitoring.controller.ts` | Add `GET /portfolios/:id/current-state` endpoint |
| `src/analysis/analysis.service.ts` | Call `monitoringService.computeAndSaveState()` after analysis (fire-and-forget, same pattern as existing `detectAfterAnalysis`) |

### Frontend — modified files
| File | What changes |
|---|---|
| `frontend/src/types/index.ts` | Add `PortfolioCurrentState` type |
| `frontend/src/lib/api.ts` | Add `getPortfolioCurrentState(portfolioId)` function |
| `frontend/src/app/analyzer/page.tsx` | Add 1 useState, 1 fetch call, 1 state card component in result tab |

### No changes to
- `state-change-detector.ts` — untouched
- `push.service.ts` / `push.controller.ts` — untouched
- `portfolio-state-event.entity.ts` — untouched (no new columns in Phase A)
- All other modules, controllers, services

---

## 2. Database Migration Plan

**No manual migration needed.**

`app.module.ts` uses `synchronize: true`. When the new entity is registered and the backend restarts, TypeORM auto-creates the `portfolio_states` table. Existing tables are untouched.

### New table: `portfolio_states`

```
Column            Type              Constraints
─────────────────────────────────────────────────────
id                INT AUTO_INCREMENT  PK
portfolioId       INT                 NOT NULL, INDEX
userId            INT                 NOT NULL
state             VARCHAR(20)         NOT NULL
  -- values: 'stable' | 'concentrated' | 'risky' | 'improving' | 'deteriorating'
healthScore       DECIMAL(5,2)        NOT NULL
diversScore       DECIMAL(5,2)        NOT NULL
top3Concentration DECIMAL(5,2)        NOT NULL
maxSectorWeight   DECIMAL(5,2)        NOT NULL
maxSectorName     VARCHAR(64)         NOT NULL
reason            VARCHAR(120)        NOT NULL  -- Korean one-liner
changedAt         DATETIME            NOT NULL  -- when this state row was created
createdAt         DATETIME            NOT NULL
```

Index on `(portfolioId, changedAt DESC)` for timeline and "latest state" queries.

---

## 3. State Calculation Logic

Pure function: `calculateState(current, previousState?)` → `{ state, reason }`

### Inputs
- `current`: `{ healthScore, diversScore, top3Concentration, maxSectorWeight, items[] }`
- `previousState?`: last row from `portfolio_states` (or undefined on first analysis)

### Priority order (first match wins)

```
1. risky
   healthScore < 50
   reason: "포트폴리오 건강도가 낮아요. 전반적인 점검이 필요해요."

2. deteriorating
   previousState exists AND (healthScore fell 10+ pts OR diversScore fell 10+ pts)
   reason: "이전 분석보다 포트폴리오 상태가 나빠지고 있어요."

3. concentrated
   top3Concentration >= 75
     OR maxSectorWeight >= 65
     OR any single non-ETF stock weight >= 50
   reason: depends on which triggered:
     - top3: "상위 3개 종목에 자산이 집중되어 있어요."
     - sector: "{maxSectorName} 섹터 비중이 너무 높아요."
     - stock: "단일 종목 비중이 50%를 넘었어요."

4. improving
   previousState exists
     AND (healthScore rose 5+ pts from previousState.healthScore)
     AND previousState.state IN ('risky', 'concentrated', 'deteriorating')
   reason: "이전보다 포트폴리오가 개선되고 있어요."

5. stable (default)
   reason: "포트폴리오가 균형 잡힌 상태예요."
```

### Trend calculation

Derived from comparing `current.healthScore` vs `previousState.healthScore`:
- `up`:   current > previous + 2
- `down`: current < previous - 2
- `same`: within ±2 pts, or no previous state

---

## 4. API Structure

### New endpoint

```
GET /portfolios/:id/current-state
Authorization: Bearer <token>
```

**Response when state exists:**
```json
{
  "state": "concentrated",
  "reason": "상위 3개 종목에 자산이 집중되어 있어요.",
  "trend": "down",
  "metrics": {
    "healthScore": 58,
    "diversScore": 45,
    "top3Concentration": 77.3,
    "maxSectorWeight": 61.2,
    "maxSectorName": "IT"
  },
  "changedAt": "2026-04-30T09:12:00.000Z"
}
```

**Response when no analysis has been run yet (no state exists):**
```json
null
```
(HTTP 200, body is `null` — frontend treats null as "no state yet")

### Integration point in analysis service

After the existing `detectAfterAnalysis` call (line 279 of `analysis.service.ts`), add:

```typescript
this.monitoringService.computeAndSaveState(portfolioId, userId, {
  healthScore,
  diversificationScore,
  top3Concentration: Number(top3Concentration.toFixed(2)),
  maxSectorWeight: Number(maxSectorWeight.toFixed(2)),
  maxSectorName,
  items: itemMetas,
}).catch((err) => this.logger.warn(`State compute failed: ${err}`));
```

Same fire-and-forget pattern as the existing monitoring call — no await, no blocking of analysis response.

---

## 5. Frontend Structure

### New type (`types/index.ts`)

```typescript
export type PortfolioCurrentState = {
  state: 'stable' | 'concentrated' | 'risky' | 'improving' | 'deteriorating';
  reason: string;
  trend: 'up' | 'down' | 'same';
  metrics: {
    healthScore: number;
    diversScore: number;
    top3Concentration: number;
    maxSectorWeight: number;
    maxSectorName: string;
  };
  changedAt: string;
} | null;
```

### New API function (`lib/api.ts`)

```typescript
export async function getPortfolioCurrentState(
  portfolioId: number,
): Promise<import('../types').PortfolioCurrentState> {
  return apiFetch(`/portfolios/${portfolioId}/current-state`);
}
```

### State management (`analyzer/page.tsx`)

One new state variable added alongside `notifications`:
```typescript
const [portfolioState, setPortfolioState] = useState<PortfolioCurrentState>(null);
```

Fetch after analysis completes (same `setTimeout` block as notifications refresh):
```typescript
setTimeout(() => {
  getStateEvents().then(setNotifications).catch(() => {});
  if (currentPortfolioId) {
    getPortfolioCurrentState(currentPortfolioId)
      .then(setPortfolioState)
      .catch(() => {});
  }
}, 2000);
```

Also reset on portfolio switch:
```typescript
setPortfolioState(null); // when switching to a different portfolio
```

### State card UI

Inserted once: at the top of the result tab, **before** the existing health score section.

```
┌──────────────────────────────────────────────────────┐
│  포트폴리오 상태  [ ● 집중 ]   ↓                      │
│  상위 3개 종목에 자산이 집중되어 있어요.               │
└──────────────────────────────────────────────────────┘
```

Visual spec:
- Container: same card style as existing analysis cards (rounded, border, padding)
- Left: label "포트폴리오 상태" in muted text
- Center: colored badge (`stable`=green, `concentrated`=amber, `risky`=red, `improving`=blue, `deteriorating`=orange)
- Right: trend arrow icon (↑ / ↓ / → ) colored by direction
- Below badge: `reason` text in small muted font
- If `portfolioState` is null: render nothing (no card shown before first analysis)

No modal, no drill-down, no action buttons in Phase A.

---

## 6. Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| `synchronize: true` auto-alters tables | Low | New entity = new table only. No changes to existing columns. MariaDB `ALTER TABLE` not triggered. |
| `computeAndSaveState` blocks analysis response | None | Wrapped in `.catch()`, fire-and-forget. Analysis response is not awaited. |
| State card breaks existing layout | Low | Additive only. Placed above an existing section with same card wrapper. Mobile + desktop both handled. |
| `calculateState` produces incorrect state | Low | Pure function, no DB side effects. Returns `stable` as default. Edge: first analysis has no `previousState` → `improving`/`deteriorating` conditions skip gracefully. |
| `synchronize: true` in production Railway | Low | Already in use. The team accepts this risk for current stage. No change to existing behavior. |

---

## 7. Test Checklist

Before marking Phase A complete:

- [ ] Backend: New `portfolio_states` table created on restart (check DB)
- [ ] Backend: `GET /portfolios/:id/current-state` returns correct state after first analysis
- [ ] Backend: State updates correctly on second analysis (improving/deteriorating logic)
- [ ] Backend: Returns `null` (HTTP 200) when no analysis has been run
- [ ] Backend: `computeAndSaveState` failure does NOT break analysis response
- [ ] Frontend: State card appears in result tab after analysis
- [ ] Frontend: State badge color matches state (red/amber/green/blue/orange)
- [ ] Frontend: State card is absent before first analysis (null state)
- [ ] Frontend: Switching portfolios resets state card (null → reload)
- [ ] Regression: Existing notification bell still works normally
- [ ] Regression: Existing analysis results unchanged
- [ ] Regression: All existing portfolio endpoints unaffected

---

## 8. Rollback Plan

Phase A is fully additive. To roll back:

1. Remove `PortfolioState` entity from `monitoring.module.ts` imports → TypeORM stops managing the table
2. Drop the `portfolio_states` table manually in DB (`DROP TABLE portfolio_states`)
3. Remove the `computeAndSaveState` call from `analysis.service.ts` (2 lines)
4. Remove the state card from `analyzer/page.tsx` (delete `portfolioState` state + card JSX)
5. Remove `PortfolioCurrentState` from `types/index.ts` and `getPortfolioCurrentState` from `api.ts`

No existing data is modified or deleted. All other features remain exactly as before.

---

## Waiting for approval to begin implementation.
