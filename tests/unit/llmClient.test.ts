import { LLMClient } from '../../src/agent/llmClient';

// Mock external SDKs
jest.mock('@anthropic-ai/sdk');
jest.mock('openai');
jest.mock('groq-sdk');

const { default: Anthropic } = jest.requireMock('@anthropic-ai/sdk') as { default: jest.Mock };
const { default: OpenAI } = jest.requireMock('openai') as { default: jest.Mock };
const { default: Groq } = jest.requireMock('groq-sdk') as { default: jest.Mock };

const mockAnthropicCreate = jest.fn();
const mockOpenAICreate = jest.fn();
const mockGroqCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  Anthropic.mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  }));

  OpenAI.mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
  }));

  Groq.mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  }));
});

describe('LLMClient — Anthropic provider', () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    delete process.env.ANTHROPIC_MODEL;
  });

  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('uses the Anthropic client when LLM_PROVIDER=anthropic', () => {
    new LLMClient();
    expect(Anthropic).toHaveBeenCalledTimes(1);
    expect(OpenAI).not.toHaveBeenCalled();
  });

  it('uses the default model claude-3-5-sonnet-20241022', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"testCases":[]}' }],
    });

    const client = new LLMClient();
    await client.complete('test prompt');

    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-3-5-sonnet-20241022' }),
    );
  });

  it('uses a custom model when ANTHROPIC_MODEL is set', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-3-haiku-20240307';
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
    });

    const client = new LLMClient();
    await client.complete('test prompt');

    expect(mockAnthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-3-haiku-20240307' }),
    );

    delete process.env.ANTHROPIC_MODEL;
  });

  it('complete() returns { text: string } from Anthropic response', async () => {
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'hello from anthropic' }],
    });

    const client = new LLMClient();
    const result = await client.complete('prompt');

    expect(result).toEqual({ text: 'hello from anthropic' });
  });

  it('throws when ANTHROPIC_API_KEY is missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => new LLMClient()).toThrow('ANTHROPIC_API_KEY is not set in .env');
  });
});

describe('LLMClient — OpenAI provider', () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    delete process.env.OPENAI_MODEL;
  });

  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;
  });

  it('uses the OpenAI client when LLM_PROVIDER=openai', () => {
    new LLMClient();
    expect(OpenAI).toHaveBeenCalledTimes(1);
    expect(Anthropic).not.toHaveBeenCalled();
  });

  it('uses the default model gpt-4o', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: '{"testCases":[]}' } }],
    });

    const client = new LLMClient();
    await client.complete('test prompt');

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('uses a custom model when OPENAI_MODEL is set', async () => {
    process.env.OPENAI_MODEL = 'gpt-4-turbo';
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
    });

    const client = new LLMClient();
    await client.complete('test prompt');

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4-turbo' }),
    );

    delete process.env.OPENAI_MODEL;
  });

  it('complete() returns { text: string } from OpenAI response', async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'hello from openai' } }],
    });

    const client = new LLMClient();
    const result = await client.complete('prompt');

    expect(result).toEqual({ text: 'hello from openai' });
  });

  it('throws when OPENAI_API_KEY is missing', () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => new LLMClient()).toThrow('OPENAI_API_KEY is not set in .env');
  });
});

describe('LLMClient — Groq provider', () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test-groq-key';
    delete process.env.GROQ_MODEL;
  });

  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.GROQ_API_KEY;
  });

  it('uses the Groq client when LLM_PROVIDER=groq', () => {
    new LLMClient();
    expect(Groq).toHaveBeenCalledTimes(1);
    expect(Anthropic).not.toHaveBeenCalled();
    expect(OpenAI).not.toHaveBeenCalled();
  });

  it('uses the default model llama-3.3-70b-versatile', async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: '{"testCases":[]}' } }],
    });

    const client = new LLMClient();
    await client.complete('test prompt');

    expect(mockGroqCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'llama-3.3-70b-versatile' }),
    );
  });

  it('uses a custom model when GROQ_MODEL is set', async () => {
    process.env.GROQ_MODEL = 'llama-3.1-8b-instant';
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
    });

    const client = new LLMClient();
    await client.complete('test prompt');

    expect(mockGroqCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'llama-3.1-8b-instant' }),
    );

    delete process.env.GROQ_MODEL;
  });

  it('complete() returns { text: string } from Groq response', async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [{ message: { content: 'hello from groq' } }],
    });

    const client = new LLMClient();
    const result = await client.complete('prompt');

    expect(result).toEqual({ text: 'hello from groq' });
  });

  it('throws when GROQ_API_KEY is missing', () => {
    delete process.env.GROQ_API_KEY;
    expect(() => new LLMClient()).toThrow('GROQ_API_KEY is not set in .env');
  });
});
