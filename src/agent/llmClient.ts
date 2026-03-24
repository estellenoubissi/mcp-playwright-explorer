import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

export type LLMProvider = 'anthropic' | 'openai' | 'groq';

export interface LLMResponse {
  text: string;
}

export class LLMClient {
  private provider: LLMProvider;
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private groq?: Groq;
  private model: string;

  constructor() {
    this.provider = (process.env.LLM_PROVIDER as LLMProvider) || 'anthropic';

    if (this.provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set in .env');
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o';
      console.log(`🤖 LLM Provider: OpenAI (${this.model})`);
    } else if (this.provider === 'groq') {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set in .env');
      this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
      console.log(`🤖 LLM Provider: Groq (${this.model}) 🆓 FREE`);
    } else {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set in .env');
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
      console.log(`🤖 LLM Provider: Anthropic (${this.model})`);
    }
  }

  async complete(prompt: string): Promise<LLMResponse> {
    if (this.provider === 'openai' && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.15,
        messages: [
          {
            role: 'system',
            content: 'You are a senior QA expert. Always respond with valid JSON only, no markdown, no explanation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });
      return { text: response.choices[0].message.content || '' };
    } else if (this.provider === 'groq' && this.groq) {
      const response = await this.groq.chat.completions.create({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.15,
        messages: [
          {
            role: 'system',
            content: 'You are a senior QA expert. Always respond with valid JSON only, no markdown, no explanation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });
      return { text: response.choices[0].message.content || '' };
    } else if (this.provider === 'anthropic' && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      });
      return { text: (response.content[0] as { type: string; text: string }).text };
    }
    throw new Error(`Unknown LLM provider: ${this.provider}`);
  }
}