# Pobalance — Development Rules

## 1. Product Identity

- Pobalance is a portfolio risk-management and monitoring product.
- It is not a stock prediction app.
- It is not an investment advisory service.
- It must not promise returns.

## 2. Mandatory Workflow

- Do not implement immediately unless explicitly approved.
- For non-trivial work, create a plan document first.
- Wait for approval before coding.
- Keep scope narrow.
- Do not refactor unrelated code.

## 3. Financial Wording Rules

Avoid:
- 매수 추천
- 매도 추천
- 수익 보장
- 오를 종목
- 지금 사세요

Prefer:
- 참고 정보
- 비중 조정
- 리스크 관리
- 분산
- 포트폴리오 점검
- 검토 후보

## 4. Engineering Rules

- Always run typecheck/build before push.
- Never break Railway/Vercel deploy.
- Healthcheck must remain working.
- JWT_SECRET fallback is forbidden.
- Admin APIs must enforce backend admin guard.
- Push notifications and in-app notifications are different systems.

## 5. Recommendation Rules

- Do not add individual stock recommendations without explicit approval.
- Use user profile when available: `investorStyle`, `marketPref`, `productPref`.
- If `productPref=STOCK`, do not force ETF recommendation.
- ETF suggestions are diversification candidates, not buy recommendations.

## 6. Monitoring Rules

- No generic scheduled reminders.
- Only condition-based state-change alerts.
- Cron is internal implementation detail.
- User-facing value is meaningful portfolio change detection.

## 7. QA Rules

Before reporting done:
- List files changed.
- Summarize logic changes.
- Include QA checklist.
- Include build/typecheck results.
- Mention risks or limitations.

## 8. Scope Protection

Do not change the following unless the task explicitly asks for it:
- Payment logic
- Auth logic
- Analysis scoring
- Rebalancing engine
- Notification system
