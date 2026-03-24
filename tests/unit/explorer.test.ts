import { Explorer } from '../../src/agent/explorer';
import { ExplorationResult } from '../../src/reporters/types';

// Mock external dependencies
jest.mock('../../src/agent/llmClient');
jest.mock('playwright');
jest.mock('../../src/agent/analyzer');
jest.mock('../../src/reporters/jsonReporter');
jest.mock('../../src/reporters/markdownReporter');
jest.mock('../../src/reporters/htmlReporter');

import { LLMClient } from '../../src/agent/llmClient';
import { chromium } from 'playwright';
import { Analyzer } from '../../src/agent/analyzer';

const MockLLMClient = LLMClient as jest.MockedClass<typeof LLMClient>;
const mockChromium = chromium as jest.Mocked<typeof chromium>;
const MockAnalyzer = Analyzer as jest.MockedClass<typeof Analyzer>;

const fakeLLMResponse = JSON.stringify({
  testCases: [
    {
      id: '',
      feature: 'login',
      categorie: 'PASSANT',
      titre: 'Connexion avec identifiants valides',
      preconditions: ['Compte existant'],
      etapes: ['Ouvrir la page', 'Saisir email', 'Cliquer sur Connexion'],
      donnees_test: { email: 'user@test.com', password: 'secret' },
      resultat_attendu: "L'utilisateur est redirigé vers le tableau de bord",
      priorite: 'HAUTE',
      automatisable: true,
      complexite: 2,
    },
    {
      id: '',
      feature: 'login',
      categorie: 'NON_PASSANT',
      titre: 'Connexion avec mot de passe incorrect',
      preconditions: ['Compte existant'],
      etapes: ['Ouvrir la page', 'Saisir email valide', 'Saisir mauvais mot de passe'],
      donnees_test: { email: 'user@test.com', password: 'wrong' },
      resultat_attendu: "Un message d'erreur est affiché",
      priorite: 'HAUTE',
      automatisable: true,
      complexite: 1,
    },
  ],
});

const mockAnalyzerResult = {
  elements: [],
  networkCalls: [],
  screenshots: [],
  pageTitle: 'Test Page',
  pageText: 'Some page text',
};

const mockPage = {
  goto: jest.fn().mockResolvedValue(undefined),
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();

  // Set environment variable so LLMClient constructor doesn't throw
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'test-key';

  MockLLMClient.prototype.complete = jest.fn().mockResolvedValue({ text: fakeLLMResponse });

  mockChromium.launch = jest.fn().mockResolvedValue(mockBrowser as never);

  MockAnalyzer.prototype.analyze = jest.fn().mockResolvedValue(mockAnalyzerResult);
});

afterEach(() => {
  delete process.env.LLM_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
});

describe('Explorer', () => {
  it('instantiates an LLMClient', () => {
    new Explorer();
    expect(MockLLMClient).toHaveBeenCalledTimes(1);
  });

  it('explore() returns an ExplorationResult with correct shape', async () => {
    const explorer = new Explorer();
    const result = await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(result).toMatchObject<Partial<ExplorationResult>>({
      url: 'https://example.com',
      feature: 'login',
      totalTestCases: 2,
      summary: {
        passant: 1,
        non_passant: 1,
        complexe: 0,
        simple: 0,
      },
    });
  });

  it('explore() returns testCases array', async () => {
    const explorer = new Explorer();
    const result = await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(Array.isArray(result.testCases)).toBe(true);
    expect(result.testCases).toHaveLength(2);
  });

  it('explore() sets exploredAt as an ISO date string', async () => {
    const explorer = new Explorer();
    const result = await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(new Date(result.exploredAt).getTime()).not.toBeNaN();
  });

  it('calls chromium.launch() to open a browser', async () => {
    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(mockChromium.launch).toHaveBeenCalledTimes(1);
  });

  it('calls LLMClient.complete() with the exploration prompt', async () => {
    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(MockLLMClient.prototype.complete).toHaveBeenCalledTimes(1);
    expect(MockLLMClient.prototype.complete).toHaveBeenCalledWith(expect.any(String));
  });

  it('closes the browser after exploration', async () => {
    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  it('closes the browser even if LLM throws', async () => {
    MockLLMClient.prototype.complete = jest.fn().mockRejectedValue(new Error('LLM error'));

    const explorer = new Explorer();
    await expect(explorer.explore({ url: 'https://example.com', feature: 'login' })).rejects.toThrow(
      'LLM error',
    );

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });
});
