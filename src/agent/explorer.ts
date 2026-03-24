import { chromium } from 'playwright';
import { LLMClient } from './llmClient';
import { buildExploratoryPrompt } from '../mcp/prompts/exploratoryPrompt';
import { Analyzer } from './analyzer';
import { Classifier } from './classifier';
import { JsonReporter } from '../reporters/jsonReporter';
import { MarkdownReporter } from '../reporters/markdownReporter';
import { ExplorationResult, TestCase } from '../reporters/types';

export interface ExplorerOptions {
  url: string;
  feature: string;
  headless?: boolean;
  outputDir?: string;
}

export class Explorer {
  private llm: LLMClient;
  private classifier = new Classifier();
  private jsonReporter = new JsonReporter();
  private markdownReporter = new MarkdownReporter();

  constructor() {
    this.llm = new LLMClient();
  }

  async explore(options: ExplorerOptions): Promise<ExplorationResult> {
    const { url, feature, headless = true } = options;
    console.log(`\n🚀 Starting exploration of "${feature}" at ${url}\n`);

    const browser = await chromium.launch({ headless });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const analysis = await new Analyzer(page).analyze(feature);

      const prompt = [
        buildExploratoryPrompt(url, feature),
        `\n## Éléments UI détectés :\n${JSON.stringify(analysis.elements, null, 2)}`,
        `\n## Titre : ${analysis.pageTitle}`,
        `\n## Texte visible :\n${analysis.pageText}`,
        `\n## Appels réseau :\n${JSON.stringify(analysis.networkCalls, null, 2)}`,
      ].join('\n');

      console.log('🤖 Calling LLM...');
      const response = await this.llm.complete(prompt);

      const match = response.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in LLM response');

      const parsed = JSON.parse(match[0]) as { testCases?: TestCase[] };
      const classified = this.classifier.classify(parsed.testCases || []);

      const result: ExplorationResult = {
        url, feature,
        exploredAt: new Date().toISOString(),
        totalTestCases: classified.length,
        summary: {
          passant: classified.filter(t => t.categorie === 'PASSANT').length,
          non_passant: classified.filter(t => t.categorie === 'NON_PASSANT').length,
          complexe: classified.filter(t => t.categorie === 'COMPLEXE').length,
          simple: classified.filter(t => t.categorie === 'SIMPLE').length,
        },
        testCases: classified,
      };

      this.jsonReporter.generate(result);
      this.markdownReporter.generate(result);

      console.log(`\n✅ Done! ${result.totalTestCases} test cases generated.`);
      console.log(`   ✅ ${result.summary.passant} passants | ❌ ${result.summary.non_passant} non-passants | 🔴 ${result.summary.complexe} complexes | 🟢 ${result.summary.simple} simples\n`);
      return result;
    } finally {
      await browser.close();
    }
  }
}