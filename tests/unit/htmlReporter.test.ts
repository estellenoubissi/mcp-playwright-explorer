import fs from 'fs';
import path from 'path';
import os from 'os';
import { HtmlReporter } from '../../src/reporters/htmlReporter';
import { ExplorationResult } from '../../src/reporters/types';

const mockResult: ExplorationResult = {
  url: 'https://example.com',
  feature: 'Todo List',
  exploredAt: '2024-01-15T10:00:00.000Z',
  totalTestCases: 2,
  summary: { passant: 1, non_passant: 1, complexe: 0, simple: 0 },
  testCases: [
    {
      id: 'TC-001',
      feature: 'Todo List',
      categorie: 'PASSANT',
      titre: 'Ajouter un élément',
      preconditions: ['La page est ouverte'],
      etapes: ['Saisir le texte', 'Appuyer sur Entrée'],
      donnees_test: { text: 'Acheter du lait' },
      resultat_attendu: "L'élément apparaît dans la liste",
      priorite: 'HAUTE',
      automatisable: true,
      complexite: 2,
      tags: ['smoke'],
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'TC-002',
      feature: 'Todo List',
      categorie: 'NON_PASSANT',
      titre: 'Ajouter un élément vide',
      preconditions: ['La page est ouverte'],
      etapes: ['Appuyer sur Entrée sans texte'],
      donnees_test: {},
      resultat_attendu: "Aucun élément n'est ajouté",
      priorite: 'MOYENNE',
      automatisable: false,
      complexite: 1,
    },
  ],
};

describe('HtmlReporter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-reporter-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the output directory if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'reports');
    new HtmlReporter(nestedDir);
    expect(fs.existsSync(nestedDir)).toBe(true);
  });

  it('generate() returns the filepath of the created file', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    expect(typeof filepath).toBe('string');
    expect(fs.existsSync(filepath)).toBe(true);
  });

  it('generate() creates a file with the correct naming pattern', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const filename = path.basename(filepath);
    expect(filename).toMatch(/^todo-list-\d+\.html$/);
  });

  it('generate() logs the filepath to stdout', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('✅ HTML report saved:'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining(filepath));
    spy.mockRestore();
  });

  it('generates a valid HTML file starting with <!DOCTYPE html>', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it('includes the feature name in the HTML', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('Todo List');
  });

  it('includes the URL in the HTML', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('https://example.com');
  });

  it('includes stat counts for all categories', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('stat-passant');
    expect(content).toContain('stat-non');
    expect(content).toContain('stat-complexe');
    expect(content).toContain('stat-simple');
  });

  it('includes a card for each test case', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('TC-001');
    expect(content).toContain('TC-002');
    expect(content).toContain('Ajouter un élément');
    expect(content).toContain('Ajouter un élément vide');
  });

  it('includes filter buttons for categories and priorities', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('data-cat="PASSANT"');
    expect(content).toContain('data-cat="NON_PASSANT"');
    expect(content).toContain('data-pri="CRITIQUE"');
    expect(content).toContain('data-pri="HAUTE"');
  });

  it('includes inline JavaScript for filtering', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('<script>');
    expect(content).toContain('applyFilters');
    expect(content).toContain('searchInput');
  });

  it('escapes HTML special characters in test data', () => {
    const resultWithSpecialChars: ExplorationResult = {
      ...mockResult,
      testCases: [
        {
          ...mockResult.testCases[0],
          titre: 'Test with <script>alert("xss")</script>',
        },
      ],
    };
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(resultWithSpecialChars);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).not.toContain('<script>alert("xss")</script>');
    expect(content).toContain('&lt;script&gt;');
  });

  it('includes inline CSS styles', () => {
    const reporter = new HtmlReporter(tmpDir);
    const filepath = reporter.generate(mockResult);
    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('<style>');
    expect(content).toContain('#22c55e');
    expect(content).toContain('#ef4444');
    expect(content).toContain('#f97316');
    expect(content).toContain('#3b82f6');
  });
});
