import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export type PromoType = 'hook' | 'before-after' | 'feature' | 'education' | 'empathy';
export type FeatureFocus = 'rebalancing' | 'risk-analysis' | 'content-radar' | 'portfolio';

export interface PromoScriptRequest {
  type: PromoType;
  featureFocus: FeatureFocus;
  scenario?: string; // optional custom context
}

export interface PromoScriptResult {
  type: PromoType;
  featureFocus: FeatureFocus;
  script15s: string;
  script30s: string;
  subtitleLines: string[];
  caption: string;
  hashtags: string[];
}

const FEATURE_DESCRIPTIONS: Record<FeatureFocus, string> = {
  rebalancing:
    '포트폴리오 리밸런싱 — 특정 종목이 30% 초과하거나 섹터가 60% 초과하면 자동으로 비중 조정 방향을 제시해줌. 수동 계산 없이 클릭 한 번으로 분산 방향을 확인할 수 있음.',
  'risk-analysis':
    '포트폴리오 리스크 분석 — 종목별·섹터별 집중도, 변동성 점수를 시각화. 내 포트폴리오의 위험 구조를 한눈에 파악할 수 있음.',
  'content-radar':
    '콘텐츠 레이더 — 매일 아침 오늘의 핵심 경제 뉴스를 AI가 선별해서 짧은 브리핑으로 제공. 뉴스를 일일이 찾지 않아도 됨.',
  portfolio:
    '포트폴리오 관리 — 보유 종목 비중, 수익률, 섹터 분포를 실시간으로 추적. 내 투자 현황을 전체적으로 한 화면에서 확인 가능.',
};

const TYPE_DESCRIPTIONS: Record<PromoType, string> = {
  hook: '공포/후킹형: 위험한 상황을 짧고 강렬하게 제시한 뒤 포밸런스가 해결책임을 보여주는 구조',
  'before-after': '비포애프터형: 포밸런스 사용 전의 막연한 불안감과 사용 후의 명확함을 대비시키는 구조',
  feature: '기능소개형: 특정 기능을 구체적으로 보여주며 실용성을 강조하는 튜토리얼 느낌의 구조',
  education: '교육형: 재테크 개념을 쉽게 설명하면서 자연스럽게 포밸런스를 언급하는 구조',
  empathy: '공감형: 주식 투자자의 흔한 고민/실수에 공감한 뒤 포밸런스를 부드럽게 소개하는 구조',
};

function buildPrompt(req: PromoScriptRequest): string {
  const featureDesc = FEATURE_DESCRIPTIONS[req.featureFocus];
  const typeDesc = TYPE_DESCRIPTIONS[req.type];
  const scenarioSection = req.scenario
    ? `\n추가 맥락/시나리오: ${req.scenario}`
    : '';

  return `당신은 인스타그램/틱톡 릴스용 금융 앱 홍보 스크립트 전문가입니다.
포밸런스(PoBalance)라는 포트폴리오 리스크 관리 앱의 릴스 홍보 콘텐츠를 작성해주세요.

## 포밸런스 소개
- 포트폴리오 리스크 관리 앱 (주식 예측 앱이 아님)
- 개인 투자자가 자신의 포트폴리오의 위험 구조를 파악하고 분산하도록 돕는 서비스
- www.pobalance.com

## 이번 콘텐츠 기준
콘텐츠 유형: ${typeDesc}
강조할 기능: ${featureDesc}${scenarioSection}

## 금지 표현 (절대 사용 금지)
- 매수 추천, 매도 추천, 수익 보장, 오를 종목
- "이 주식 사세요", "지금 매수하세요"
- 확정적 수익 약속 표현

## 허용 표현
- 참고 정보, 비중 조정, 리스크 관리, 분산, 포트폴리오 점검, 검토 후보
- 실용적이고 구체적인 기능 설명

## 출력 형식 (JSON만 출력, 다른 텍스트 없이)
{
  "script15s": "15초 분량 스크립트. 훅 1문장 + 핵심 메시지 2문장 + CTA 1문장. 총 4문장 이내. 각 문장은 줄바꿈으로 구분.",
  "script30s": "30초 분량 스크립트. 훅 1문장 + 공감/설명 3문장 + 기능 설명 2문장 + CTA 1문장. 총 7문장 이내. 각 문장은 줄바꿈으로 구분.",
  "subtitleLines": ["자막1", "자막2", "자막3", "자막4", "자막5"],
  "caption": "인스타그램 캡션. 2-3문단. 이모지 포함. 마지막에 포밸런스 언급.",
  "hashtags": ["해시태그1", "해시태그2", "해시태그3", "해시태그4", "해시태그5", "해시태그6", "해시태그7", "해시태그8"]
}

자막은 릴스 화면에 순서대로 나타나는 5개의 짧은 텍스트입니다 (각 5-15자).
해시태그는 # 없이 단어만 작성하세요.
반드시 JSON만 출력하세요.`;
}

@Injectable()
export class PromoScriptService {
  private readonly logger = new Logger(PromoScriptService.name);
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generatePromoScript(req: PromoScriptRequest): Promise<PromoScriptResult> {
    this.logger.log(`Generating promo script: type=${req.type} feature=${req.featureFocus}`);

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(req) }],
    });

    const raw = message.content[0];
    if (raw.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    let parsed: {
      script15s: string;
      script30s: string;
      subtitleLines: string[];
      caption: string;
      hashtags: string[];
    };

    try {
      // Strip markdown code fences if present
      const text = raw.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(text);
    } catch {
      this.logger.error('Failed to parse Claude response as JSON', raw.text);
      throw new Error('Claude returned invalid JSON');
    }

    return {
      type: req.type,
      featureFocus: req.featureFocus,
      script15s: parsed.script15s ?? '',
      script30s: parsed.script30s ?? '',
      subtitleLines: Array.isArray(parsed.subtitleLines) ? parsed.subtitleLines : [],
      caption: parsed.caption ?? '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    };
  }
}
