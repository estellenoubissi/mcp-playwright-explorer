import { chromium, Page } from 'playwright';
import { LLMClient } from './llmClient';
import { buildExploratoryPrompt } from '../mcp/prompts/exploratoryPrompt';
import { Analyzer } from './analyzer';
import { Classifier } from './classifier';
import { JsonReporter } from '../reporters/jsonReporter';
import { MarkdownReporter } from '../reporters/markdownReporter';
import { HtmlReporter } from '../reporters/htmlReporter';
import { ExplorationResult, TestCase } from '../reporters/types';

export interface SubMenuExplorerOptions {
  url: string;
  feature: string;
  navSelector?: string;
  headless?: boolean;
  outputDir?: string;
  html?: boolean;
  auth?: boolean;
}

interface SubMenuItem {
  label: string;
  href: string;
  selector: string;
}

export class SubMenuExplorer {
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

    console.log('🔐 Authentication successful');
  }

  async detectSubMenuItems(page: Page, navSelector?: string): Promise<SubMenuItem[]> {
    const baseUrl = page.url();
    let origin: string;
    try {
      origin = new URL(baseUrl).origin;
    } catch {
      origin = '';
    }

    const selectors = navSelector
      ? [navSelector]
      : [
          'nav a',
          'nav li a',
          '.nav a',
          '.navbar a',
          '.menu a',
          '[role="navigation"] a',
          'ul li a',
        ];

    const items: SubMenuItem[] = [];

    for (const selector of selectors) {
      const elements = await page.locator(selector).all();
      for (const el of elements) {
        const isVisible = await el.isVisible().catch(() => false);
        if (!isVisible) continue;

        const href = await el.getAttribute('href').catch(() => null);
        if (!href) continue;

        // Resolve relative URLs
        let resolvedHref: string;
        try {
          resolvedHref = new URL(href, baseUrl).href;
        } catch {
          continue;
        }

        // Skip external links
        if (origin && !resolvedHref.startsWith(origin)) continue;

        // Skip anchor-only links
        if (href.startsWith('#')) continue;

        const label = ((await el.textContent().catch(() => '')) ?? '').trim();
        if (!label) continue;

        // Deduplicate by href
        if (items.some((i) => i.href === resolvedHref)) continue;

        items.push({ label, href: resolvedHref, selector });
      }

      if (items.length > 0) break;
    }

    console.log(
      `🗂️ Detected ${items.length} sub-menus: [${items.map((i) => i.label).join(', ')}]`,
    );

    return items;
  }

  private async exploreSubMenu(
    page: Page,
    href: string,
    label: string,
    html: boolean,
    outputDir?: string,
  ): Promise<ExplorationResult> {
    await page.goto(href, { waitUntil: 'networkidle', timeout: 30000 });
    const analysis = await new Analyzer(page).analyze(label);

    const prompt = [
      buildExploratoryPrompt(href, label),
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
      url: href,
      feature: label,
      exploredAt: new Date().toISOString(),
      totalTestCases: classified.length,
      summary: {
        passant: classified.filter((t) => t.categorie === 'PASSANT').length,
        non_passant: classified.filter((t) => t.categorie === 'NON_PASSANT').length,
        complexe: classified.filter((t) => t.categorie === 'COMPLEXE').length,
        simple: classified.filter((t) => t.categorie === 'SIMPLE').length,
      },
      testCases: classified,
    };

    this.jsonReporter.generate(result);
    this.markdownReporter.generate(result);
    if (html) this.htmlReporter.generate(result);

    return result;
  }

  async exploreWithSubMenus(options: SubMenuExplorerOptions): Promise<ExplorationResult[]> {
    const { url, feature, navSelector, headless = true, html = true, outputDir, auth } = options;
    const authEnabled = auth !== undefined ? auth : process.env.AUTH_ENABLED === 'true';

    console.log(`\n🚀 Starting sub-menu exploration of "${feature}" at ${url}\n`);

    const browser = await chromium.launch({ headless, args: ['--ignore-certificate-errors'] });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    const results: ExplorationResult[] = [];

    try {
      await this.authenticate(page, authEnabled);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const subMenuItems = await this.detectSubMenuItems(page, navSelector);

      if (subMenuItems.length === 0) {
        console.log('⚠️ No sub-menus detected, exploring main page only');
        const result = await this.exploreSubMenu(page, url, feature, html, outputDir);
        results.push(result);
      } else {
        for (let i = 0; i < subMenuItems.length; i++) {
          const { label, href } = subMenuItems[i];
          console.log(`\n📂 Exploring sub-menu [${i + 1}/${subMenuItems.length}]: "${label}"`);

          const result = await this.exploreSubMenu(page, href, label, html, outputDir);
          results.push(result);

          if (i < subMenuItems.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      const totalTestCases = results.reduce((sum, r) => sum + r.totalTestCases, 0);
      const totalPassant = results.reduce((sum, r) => sum + r.summary.passant, 0);
      const totalNonPassant = results.reduce((sum, r) => sum + r.summary.non_passant, 0);
      const totalComplexe = results.reduce((sum, r) => sum + r.summary.complexe, 0);
      const totalSimple = results.reduce((sum, r) => sum + r.summary.simple, 0);
      const reportDir = outputDir || 'outputs/test-cases';

      console.log('\n============================================');
      console.log('🎯 Sub-menu exploration complete!');
      console.log(`   📂 ${results.length} sub-menus explored`);
      console.log(`   🧪 Total: ${totalTestCases} test cases generated`);
      console.log(
        `   ✅ ${totalPassant} passants | ❌ ${totalNonPassant} non-passants | 🔴 ${totalComplexe} complexes | 🟢 ${totalSimple} simples`,
      );
      console.log(`   📁 Reports saved in: ${reportDir}`);
      console.log('============================================\n');

      return results;
    } finally {
      await browser.close();
    }
  }
}
