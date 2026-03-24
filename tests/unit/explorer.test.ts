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
  getByRole: jest.fn().mockReturnValue({
    isVisible: jest.fn().mockResolvedValue(false),
    fill: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
  }),
  locator: jest.fn().mockReturnValue({
    click: jest.fn().mockResolvedValue(undefined),
  }),
  waitForLoadState: jest.fn().mockResolvedValue(undefined),
};

const mockContext = {
  newPage: jest.fn().mockResolvedValue(mockPage),
};

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  jest.clearAllMocks();

  // Set environment variable so LLMClient constructor doesn't throw
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'test-key';

  // Ensure auth is disabled by default
  delete process.env.AUTH_ENABLED;
  delete process.env.AUTH_URL;
  delete process.env.AUTH_USERNAME;
  delete process.env.AUTH_PASSWORD;

  MockLLMClient.prototype.complete = jest.fn().mockResolvedValue({ text: fakeLLMResponse });

  mockChromium.launch = jest.fn().mockResolvedValue(mockBrowser as never);

  MockAnalyzer.prototype.analyze = jest.fn().mockResolvedValue(mockAnalyzerResult);
});

afterEach(() => {
  delete process.env.LLM_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.AUTH_ENABLED;
  delete process.env.AUTH_URL;
  delete process.env.AUTH_USERNAME;
  delete process.env.AUTH_PASSWORD;
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

  it('calls chromium.launch() with --ignore-certificate-errors arg', async () => {
    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(mockChromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({ args: expect.arrayContaining(['--ignore-certificate-errors']) }),
    );
  });

  it('creates a browser context with ignoreHTTPSErrors', async () => {
    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login' });

    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreHTTPSErrors: true }),
    );
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

  it('skips authentication when AUTH_ENABLED is not set', async () => {
    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login' });

    // page.goto should only be called once (for the main URL), not for auth URL
    expect(mockPage.goto).toHaveBeenCalledTimes(1);
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });

  it('skips authentication when auth option is false', async () => {
    process.env.AUTH_ENABLED = 'true';
    process.env.AUTH_URL = 'https://example.com/login';
    process.env.AUTH_USERNAME = 'user';
    process.env.AUTH_PASSWORD = 'pass';

    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login', auth: false });

    // page.goto should only be called once (main URL), auth is disabled via option
    expect(mockPage.goto).toHaveBeenCalledTimes(1);
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  });

  it('performs authentication when AUTH_ENABLED=true is set in env', async () => {
    process.env.AUTH_ENABLED = 'true';
    process.env.AUTH_URL = 'https://example.com/login';
    process.env.AUTH_USERNAME = 'ldap_user';
    process.env.AUTH_PASSWORD = 'secret';

    const mockFill = jest.fn().mockResolvedValue(undefined);
    const mockLocatorClick = jest.fn().mockResolvedValue(undefined);
    mockPage.getByRole = jest.fn().mockReturnValue({
      isVisible: jest.fn().mockResolvedValue(false),
      fill: mockFill,
      click: jest.fn().mockResolvedValue(undefined),
    });
    mockPage.locator = jest.fn().mockReturnValue({ click: mockLocatorClick });

    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login' });

    // page.goto called twice: once for auth URL, once for main URL
    expect(mockPage.goto).toHaveBeenCalledTimes(2);
    expect(mockPage.goto).toHaveBeenNthCalledWith(1, 'https://example.com/login', expect.any(Object));
    expect(mockPage.goto).toHaveBeenNthCalledWith(2, 'https://example.com', expect.any(Object));
    expect(mockFill).toHaveBeenCalledTimes(2);
    expect(mockLocatorClick).toHaveBeenCalledWith();
  });

  it('performs authentication when auth option is true', async () => {
    process.env.AUTH_URL = 'https://example.com/login';
    process.env.AUTH_USERNAME = 'ldap_user';
    process.env.AUTH_PASSWORD = 'secret';

    const mockFill = jest.fn().mockResolvedValue(undefined);
    mockPage.getByRole = jest.fn().mockReturnValue({
      isVisible: jest.fn().mockResolvedValue(false),
      fill: mockFill,
      click: jest.fn().mockResolvedValue(undefined),
    });
    mockPage.locator = jest.fn().mockReturnValue({ click: jest.fn().mockResolvedValue(undefined) });

    const explorer = new Explorer();
    await explorer.explore({ url: 'https://example.com', feature: 'login', auth: true });

    expect(mockPage.goto).toHaveBeenCalledTimes(2);
    expect(mockPage.goto).toHaveBeenNthCalledWith(1, 'https://example.com/login', expect.any(Object));
    expect(mockFill).toHaveBeenCalledTimes(2);
  });
});
