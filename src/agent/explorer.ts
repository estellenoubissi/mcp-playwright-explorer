import { chromium, Page } from 'playwright';
import { LLMClient } from './llmClient';
import { buildExploratoryPrompt } from '../mcp/prompts/exploratoryPrompt';
import { Analyzer } from './analyzer';
import { Classifier } from './classifier';
import { JsonReporter } from '../reporters/jsonReporter';
import { MarkdownReporter } from '../reporters/markdownReporter';
import { HtmlReporter } from '../reporters/htmlReporter';
import { ExplorationResult, TestCase } from '../reporters/types';

export interface ExplorerOptions {
  url: string;
  feature: string;
  waitForSelector?: string;
  waitForTimeout?: number;
  headless?: boolean;
  outputDir?: string;
  html?: boolean;
  auth?: boolean;
}

export class Explorer {
  private llm: LLMClient;
  private classifier = new Classifier();
  private jsonReporter = new JsonReporter();
  private markdownReporter = new MarkdownReporter();
  private htmlReporter = new HtmlReporter();

  constructor() {
    this.llm = new LLMClient();
  }

  private async authenticate(page: Page, authEnabled: boolean): Promise<void> {
    if (!authEnabled) return;

    const authUrl = process.env.AUTH_URL || '';
    const username = process.env.AUTH_USERNAME || '';
    const password = process.env.AUTH_PASSWORD || '';
    const usernameSelector = process.env.AUTH_USERNAME_SELECTOR || '';
    const passwordSelector = process.env.AUTH_PASSWORD_SELECTOR || '';
    const submitSelector = process.env.AUTH_SUBMIT_SELECTOR || '#login_ok';
    const usernameLabel = process.env.AUTH_USERNAME_LABEL || "Nom d'utilisateur";
    const passwordLabel = process.env.AUTH_PASSWORD_LABEL || 'Mot de passe';
    const sslButtonText = process.env.AUTH_SSL_BUTTON || 'Paramètres avancés';
    const sslContinueText = process.env.AUTH_SSL_CONTINUE || 'Continuer vers le site';

    console.log(`🔐 Authenticating on ${authUrl}...`);

    await page.goto(authUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const advancedButton = page.getByRole('button', { name: sslButtonText });
    const hasSSLWarning = await advancedButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasSSLWarning) {
      console.log('⚠️  SSL certificate warning detected, bypassing...');
      await advancedButton.click();
      const continueLink = page.getByRole('link', { name: new RegExp(sslContinueText) });
      await continueLink.click();
      await page.waitForLoadState('domcontentloaded');
    }

    const usernameField = usernameSelector
      ? page.locator(usernameSelector)
      : page.getByRole('textbox', { name: usernameLabel });
    const passwordField = passwordSelector
      ? page.locator(passwordSelector)
      : page.getByRole('textbox', { name: passwordLabel });

    await usernameField.fill(username);
    await passwordField.fill(password);
    await page.locator(submitSelector).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    console.log('🔐 Authentication successful');
  }

  async explore(options: ExplorerOptions): Promise<ExplorationResult> {
    const { url, feature, waitForSelector, waitForTimeout, headless = true, html = true, auth } = options;

    const authEnabled = auth !== undefined ? auth : process.env.AUTH_ENABLED === 'true';

    console.log(`\n🚀 Starting exploration of "${feature}" at ${url}\n`);

    const browser = await chromium.launch({ headless, args: ['--ignore-certificate-errors'] });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
      await this.authenticate(page, authEnabled);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      if (waitForSelector) {
        console.log(`⏳ Waiting for selector "${waitForSelector}" to be visible...`);
        await page.waitForSelector(waitForSelector, { state: 'visible', timeout: 30000 });
        console.log(`✅ Selector "${waitForSelector}" is now visible`);
      } else if (waitForTimeout) {
        console.log(`⏳ Waiting ${waitForTimeout}ms for the page to fully load...`);
        await page.waitForTimeout(waitForTimeout);
      }

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
      if (html) {
        this.htmlReporter.generate(result);
      }

      console.log(`\n✅ Done! ${result.totalTestCases} test cases generated.`);
      console.log(`   ✅ ${result.summary.passant} passants | ❌ ${result.summary.non_passant} non-passants | 🔴 ${result.summary.complexe} complexes | 🟢 ${result.summary.simple} simples\n`);
      return result;
    } finally {
      await browser.close();
    }
  }
}