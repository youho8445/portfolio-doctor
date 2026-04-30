# PROJECT_BRIEF.md — Portra AI

## Product Name
Portra AI

## Value Proposition
AI로 포트폴리오의 흐름을 분석하고, 리스크 변화와 리밸런싱 타이밍을 알려주는 투자 관리 서비스

## Target User
- 주식 종목 발굴보다 **보유 포트폴리오 관리**에 관심 있는 투자자
- 초보 ~ 중급 투자자 (자산배분 개념은 알지만 리밸런싱 판단이 어려운 사람)
- 직접 분석할 시간은 없지만 AI 인사이트를 통해 스스로 결정하고 싶은 사람

## Product Positioning
| 우리가 하는 것 | 우리가 하지 않는 것 |
|---|---|
| 포트폴리오 건강도 진단 | 종목 직접 매수/매도 추천 |
| 리밸런싱 타이밍 알림 | 주가 예측 |
| 리스크 변화 감지 | 수익 보장 언어 사용 |
| 초보자 스타터 포트폴리오 가이드 | 무계획 기능 추가 |

## Core Features
1. **포트폴리오 입력 & 저장** — 보유 종목, 수량, 평균 단가 입력
2. **포트폴리오 건강 분석** — AI가 섹터 편중, 리스크 수준, 현황을 진단
3. **리밸런싱 가이드** — 현재 비중 vs 목표 비중 비교, 조정 시뮬레이터
4. **초보자 스타터 포트폴리오** — 투자 성향에 맞는 모범 배분 제안
5. **상태 변화 감지** — 포트폴리오 비중/리스크 임계값 초과 시 감지
6. **알림** — 상태 변화 발생 시 인앱 알림 벨
7. **프리미엄 페이월** — 핵심 AI 분석 기능은 유료 구독 또는 트라이얼 이후 잠금

## Forbidden Directions
- 특정 종목 매수/매도 직접 추천
- 주가 또는 수익률 예측
- "수익 보장", "확실한 수익" 등 투자 광고성 문구
- 계획 없는 즉흥 기능 추가 (반드시 플랜 먼저)

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | MariaDB + TypeORM |
| Auth | JWT + Google OAuth / Kakao OAuth |
| Deployment | Vercel (frontend), Railway (backend) |

## Development Rule
**모든 기능 구현 전 반드시 플랜 먼저 작성, 승인 후 코딩 시작.**

플랜에 반드시 포함할 항목:
1. 현재 코드 구조 파악
2. 변경할 파일 목록
3. 데이터 흐름 (API 요청/응답 포함)
4. 엣지 케이스
5. 리스크
6. 테스트 체크리스트
7. 롤백 플랜
