import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

interface RawHolding {
  stockName: string;
  market: 'KR' | 'US' | null;
  quantity: number | null;
  evaluationAmountKRW: number | null;
  profitLossKRW: number | null;
  returnPct: number | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface ParsedHolding extends RawHolding {
  inferredCostBasisKRW: number | null;
  inferredAvgCostKRW: number | null;
  currency: 'KRW' | 'USD';
  userEdited: boolean;
}

export interface OcrParseResult {
  holdings: ParsedHolding[];
  screenshotSource: 'toss' | 'unknown';
  parsedAt: string;
  rawWarnings: string[];
}

const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async parsePortfolioScreenshot(
    buffer: Buffer,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<OcrParseResult> {
    this.validateMagicBytes(buffer, mimeType);

    const processedBuffer =
      mimeType === 'image/jpeg' ? this.stripJpegExif(buffer) : buffer;

    const base64 = processedBuffer.toString('base64');

    this.logger.log(
      `OCR request: mimeType=${mimeType} size=${processedBuffer.length}`,
    );

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            { type: 'text', text: this.buildPrompt() },
          ],
        },
      ],
    });

    const raw = message.content[0];
    if (raw.type !== 'text') {
      throw new BadRequestException('Unexpected response from Claude API');
    }

    let rawHoldings: RawHolding[];
    try {
      const text = raw.text.trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array found');
      rawHoldings = JSON.parse(match[0]);
    } catch {
      this.logger.error('Failed to parse Claude response', raw.text);
      throw new BadRequestException('OCR parsing failed — could not read screenshot');
    }

    const holdings: ParsedHolding[] = rawHoldings.map((h) => {
      const evalAmt = h.evaluationAmountKRW;
      const pl = h.profitLossKRW;
      const qty = h.quantity;
      const costBasis =
        evalAmt != null && pl != null ? evalAmt - pl : null;
      const avgCost =
        costBasis != null && qty != null && qty > 0
          ? Math.round(costBasis / qty)
          : null;
      const hasRequired = evalAmt != null && pl != null && qty != null;
      return {
        ...h,
        inferredCostBasisKRW: costBasis,
        inferredAvgCostKRW: avgCost,
        currency: 'KRW',
        confidence: hasRequired ? h.confidence : 'low',
        userEdited: false,
      };
    });

    const rawWarnings: string[] = [];
    if (holdings.some((h) => h.market === 'US')) {
      rawWarnings.push(
        '해외주식 금액은 KRW 환산값입니다. 추정 평단가도 KRW 기준입니다.',
      );
    }

    return {
      holdings,
      screenshotSource: 'toss',
      parsedAt: new Date().toISOString(),
      rawWarnings,
    };
  }

  private validateMagicBytes(buffer: Buffer, mimeType: string): void {
    if (mimeType === 'image/jpeg') {
      if (!JPEG_MAGIC.every((b, i) => buffer[i] === b)) {
        throw new BadRequestException('Invalid JPEG file');
      }
    } else if (mimeType === 'image/png') {
      if (!PNG_MAGIC.every((b, i) => buffer[i] === b)) {
        throw new BadRequestException('Invalid PNG file');
      }
    }
  }

  private stripJpegExif(buffer: Buffer): Buffer {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;

    const parts: Buffer[] = [buffer.subarray(0, 2)]; // SOI
    let i = 2;

    while (i < buffer.length - 1) {
      if (buffer[i] !== 0xff) break;
      const marker = buffer[i + 1];

      if (marker === 0xd9 || marker === 0xda) {
        // EOI or SOS — append rest and stop
        parts.push(buffer.subarray(i));
        break;
      }

      if (i + 3 >= buffer.length) break;
      const segLen = buffer.readUInt16BE(i + 2);

      if (marker === 0xe1) {
        // APP1 (EXIF) — skip
        i += 2 + segLen;
      } else {
        parts.push(buffer.subarray(i, i + 2 + segLen));
        i += 2 + segLen;
      }
    }

    return Buffer.concat(parts);
  }

  private buildPrompt(): string {
    return `You are a financial data parser. Extract all portfolio holdings from this Korean brokerage app screenshot.

Return ONLY a JSON array with no other text. Each element must be an object with these fields:
- stockName: string — the stock name as shown (Korean or English)
- market: "KR" or "US" — based on section header: 해외주식 means US, 국내주식 means KR
- quantity: integer — the number before 주 (e.g. "37주" → 37)
- evaluationAmountKRW: integer — the evaluation amount in Korean won, remove commas and 원 (e.g. "7,957,553원" → 7957553)
- profitLossKRW: integer (signed) — the profit/loss amount; + prefix or upward indicator = positive, - prefix or downward indicator = negative; remove commas and 원
- returnPct: float — the return percentage without the % sign (e.g. "8.1%" → 8.1)
- confidence: "high" if all fields extracted cleanly, "medium" if minor uncertainty, "low" if any required field is missing

Parsing rules:
- Korean won amounts like "7,957,553원" → remove commas and 원 → 7957553
- Quantities like "37주" → 37
- Return rates like "8.1%" → 8.1, "+16.7%" → 16.7
- Profit/loss: "+598,264원" → 598264, if shown in red/positive context → positive integer
- If a field is not visible, use null
- Do NOT infer or guess ticker symbols — omit the ticker field entirely

Return ONLY the JSON array. No markdown, no explanation.`;
  }
}
