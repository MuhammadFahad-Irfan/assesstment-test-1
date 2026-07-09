import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ProposedItem {
  category: string;
  description: string;
  amount: number;
  currency: string;
}

interface EventContext {
  title: string;
  date: Date;
  currency: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set — AI calls will fail.');
    }
    this.client = new GoogleGenerativeAI(apiKey ?? '');
    this.modelName =
      this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  }

  /**
   * Ask Gemini to draft a budget for the event. Returns parsed line items.
   * The prompt includes the event title, date, and currency, and instructs the
   * model to use that currency. We still validate the currency downstream — a
   * prompt is a request, not a guarantee.
   */
  async generateBudgetProposal(
    event: EventContext,
    userMessage: string,
  ): Promise<ProposedItem[]> {
    const model = this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = this.buildPrompt(event, userMessage);

    let text: string;
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text();
    } catch (err) {
      this.logger.error('Gemini request failed', err as Error);
      throw new InternalServerErrorException(
        'Failed to generate a proposal from Gemini',
      );
    }

    return this.parseItems(text);
  }

  private buildPrompt(event: EventContext, userMessage: string): string {
    const dateStr = event.date.toISOString().slice(0, 10);
    return [
      'You are a budgeting assistant for events.',
      'Produce a realistic budget for the event described below.',
      '',
      `Event title: ${event.title}`,
      `Event date: ${dateStr}`,
      `Currency (use this and ONLY this for every item): ${event.currency}`,
      '',
      `User request: ${userMessage}`,
      '',
      'Respond with ONLY a JSON array (no prose, no markdown fences).',
      'Each element must be an object with exactly these keys:',
      '  "category": string (e.g. "Venue", "Catering", "Marketing"),',
      '  "description": string (short line-item description),',
      `  "amount": number (positive, in ${event.currency}, max 2 decimals),`,
      `  "currency": string (must be exactly "${event.currency}").`,
      'Return between 4 and 10 items. Do not include totals or commentary.',
    ].join('\n');
  }

  /** Robustly parse the model's JSON, tolerating stray code fences. */
  private parseItems(raw: string): ProposedItem[] {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: extract the first [...] block.
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) {
        throw new InternalServerErrorException(
          'Gemini returned a non-JSON response',
        );
      }
      parsed = JSON.parse(match[0]);
    }

    // Some models wrap the array as { items: [...] }.
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as any)?.items ?? (parsed as any)?.budget;

    if (!Array.isArray(arr) || arr.length === 0) {
      throw new InternalServerErrorException(
        'Gemini did not return any budget items',
      );
    }

    return arr.map((item: any, i: number) => {
      const amount = Number(item?.amount);
      if (
        typeof item?.category !== 'string' ||
        typeof item?.description !== 'string' ||
        typeof item?.currency !== 'string' ||
        !Number.isFinite(amount)
      ) {
        throw new InternalServerErrorException(
          `Gemini item at index ${i} is malformed`,
        );
      }
      return {
        category: item.category.trim(),
        description: item.description.trim(),
        amount: Math.round(amount * 100) / 100,
        currency: item.currency.trim().toUpperCase(),
      };
    });
  }
}
