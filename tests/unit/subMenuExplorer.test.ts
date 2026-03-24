import { SubMenuExplorer } from '../../src/agent/subMenuExplorer';
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
      feature: 'Liste',
      categorie: 'PASSANT',
      titre: 'Afficher la liste des utilisateurs',
      preconditions: ['Utilisateurs existants'],
      etapes: ['Accéder à la liste'],
      donnees_test: {},
      resultat_attendu: 'La liste des utilisateurs est affichée',
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

const makeAnchorLocator = (overrides: Partial<{
  isVisible: () => Promise<boolean>;
  getAttribute: (name: string) => Promise<string | null>;
  textContent: () => Promise<string>;
}> = {}) => ({
  isVisible: jest.fn().mockResolvedValue(true),
  getAttribute: jest.fn().mockImplementation((name: string) =>
    name === 'href' ? Promise.resolve('/sub-menu-1') : Promise.resolve(null),
  ),
  textContent: jest.fn().mockResolvedValue('Sub Menu 1'),
  ...overrides,
});

const mockPage = {
  goto: jest.fn().mockResolvedValue(undefined),
  url: jest.fn().mockReturnValue('https://example.com/feature'),
  locator: jest.fn().mockReturnValue({
    all: jest.fn().mockResolvedValue([makeAnchorLocator()]),
    click: jest.fn().mockResolvedValue(undefined),
  }),
  getByRole: jest.fn().mockReturnValue({
    isVisible: jest.fn().mockResolvedValue(false),
    fill: jest.fn().mockResolvedValue(undefined),
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

  process.env.LLM_PROVIDER = 'anthropic';
  process.env.ANTHROPIC_API_KEY = 'test-key';

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

describe('SubMenuExplorer', () => {
  it('instantiates an LLMClient', () => {
    new SubMenuExplorer();
    expect(MockLLMClient).toHaveBeenCalledTimes(1);
  });

  it('exploreWithSubMenus() returns an array of ExplorationResult', async () => {
    const explorer = new SubMenuExplorer();
    const results = await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('exploreWithSubMenus() each result has correct shape', async () => {
    const explorer = new SubMenuExplorer();
    const results = await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    for (const result of results) {
      expect(result).toMatchObject<Partial<ExplorationResult>>({
        totalTestCases: expect.any(Number),
        summary: expect.objectContaining({
          passant: expect.any(Number),
          non_passant: expect.any(Number),
          complexe: expect.any(Number),
          simple: expect.any(Number),
        }),
      });
    }
  });

  it('launches chromium with --ignore-certificate-errors', async () => {
    const explorer = new SubMenuExplorer();
    await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    expect(mockChromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({ args: expect.arrayContaining(['--ignore-certificate-errors']) }),
    );
  });

  it('creates a browser context with ignoreHTTPSErrors', async () => {
    const explorer = new SubMenuExplorer();
    await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreHTTPSErrors: true }),
    );
  });

  it('closes the browser after exploration', async () => {
    const explorer = new SubMenuExplorer();
    await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  it('closes the browser even if LLM throws', async () => {
    MockLLMClient.prototype.complete = jest.fn().mockRejectedValue(new Error('LLM error'));

    const explorer = new SubMenuExplorer();
    await expect(
      explorer.exploreWithSubMenus({ url: 'https://example.com/feature', feature: 'Feature' }),
    ).rejects.toThrow('LLM error');

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
  });

  it('skips authentication when AUTH_ENABLED is not set', async () => {
    const explorer = new SubMenuExplorer();
    await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    // First goto is for the main URL (no auth goto)
    expect(mockPage.goto).toHaveBeenCalledWith(
      'https://example.com/feature',
      expect.any(Object),
    );
  });

  it('performs authentication when AUTH_ENABLED=true is set in env', async () => {
    process.env.AUTH_ENABLED = 'true';
    process.env.AUTH_URL = 'https://example.com/login';
    process.env.AUTH_USERNAME = 'ldap_user';
    process.env.AUTH_PASSWORD = 'secret';

    const mockFill = jest.fn().mockResolvedValue(undefined);
    mockPage.getByRole = jest.fn().mockReturnValue({
      isVisible: jest.fn().mockResolvedValue(false),
      fill: mockFill,
      click: jest.fn().mockResolvedValue(undefined),
    });
    mockPage.locator = jest.fn().mockReturnValue({
      all: jest.fn().mockResolvedValue([makeAnchorLocator()]),
      click: jest.fn().mockResolvedValue(undefined),
    });

    const explorer = new SubMenuExplorer();
    await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    // First goto should be for auth URL
    expect(mockPage.goto).toHaveBeenNthCalledWith(1, 'https://example.com/login', expect.any(Object));
    expect(mockFill).toHaveBeenCalledTimes(2);
  });

  it('detectSubMenuItems() returns empty array when no links found', async () => {
    mockPage.locator = jest.fn().mockReturnValue({
      all: jest.fn().mockResolvedValue([]),
      click: jest.fn().mockResolvedValue(undefined),
    });

    const explorer = new SubMenuExplorer();
    const items = await explorer.detectSubMenuItems(mockPage as never);

    expect(items).toEqual([]);
  });

  it('detectSubMenuItems() filters out external links', async () => {
    const externalAnchor = makeAnchorLocator({
      getAttribute: jest.fn().mockImplementation((name: string) =>
        name === 'href' ? Promise.resolve('https://external.com/page') : Promise.resolve(null),
      ),
    });

    mockPage.locator = jest.fn().mockReturnValue({
      all: jest.fn().mockResolvedValue([externalAnchor]),
      click: jest.fn().mockResolvedValue(undefined),
    });

    const explorer = new SubMenuExplorer();
    const items = await explorer.detectSubMenuItems(mockPage as never);

    expect(items).toEqual([]);
  });

  it('detectSubMenuItems() filters out invisible links', async () => {
    const invisibleAnchor = makeAnchorLocator({
      isVisible: jest.fn().mockResolvedValue(false),
    });

    mockPage.locator = jest.fn().mockReturnValue({
      all: jest.fn().mockResolvedValue([invisibleAnchor]),
      click: jest.fn().mockResolvedValue(undefined),
    });

    const explorer = new SubMenuExplorer();
    const items = await explorer.detectSubMenuItems(mockPage as never);

    expect(items).toEqual([]);
  });

  it('detectSubMenuItems() deduplicates links with same href', async () => {
    const anchor1 = makeAnchorLocator();
    const anchor2 = makeAnchorLocator(); // same href as anchor1

    mockPage.locator = jest.fn().mockReturnValue({
      all: jest.fn().mockResolvedValue([anchor1, anchor2]),
      click: jest.fn().mockResolvedValue(undefined),
    });

    const explorer = new SubMenuExplorer();
    const items = await explorer.detectSubMenuItems(mockPage as never);

    expect(items).toHaveLength(1);
  });

  it('exploreWithSubMenus() explores main page only when no sub-menus are detected', async () => {
    mockPage.locator = jest.fn().mockReturnValue({
      all: jest.fn().mockResolvedValue([]),
      click: jest.fn().mockResolvedValue(undefined),
    });

    const explorer = new SubMenuExplorer();
    const results = await explorer.exploreWithSubMenus({
      url: 'https://example.com/feature',
      feature: 'Feature',
    });

    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('https://example.com/feature');
    expect(results[0].feature).toBe('Feature');
  });
});
