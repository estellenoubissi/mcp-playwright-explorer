import { Page } from 'playwright';
import { UIElement, NetworkCall } from '../reporters/types';
import { inspectDOM } from '../mcp/tools/inspect';
import { setupNetworkInterceptor } from '../mcp/tools/network';
import { takeScreenshot } from '../mcp/tools/screenshot';

export interface AnalysisResult {
  elements: UIElement[];
  networkCalls: NetworkCall[];
  screenshots: string[];
  pageTitle: string;
  pageText: string;
}

export class Analyzer {
  private page: Page;
  private screenshotDir: string;

  constructor(page: Page, screenshotDir = 'outputs/screenshots') {
    this.page = page;
    this.screenshotDir = screenshotDir;
  }

  async analyze(featureName: string): Promise<AnalysisResult> {
    console.log(`🔍 Analyzing feature: ${featureName}`);
    const networkCalls = setupNetworkInterceptor(this.page);
    const screenshots: string[] = [];

    screenshots.push(await takeScreenshot(this.page, `${featureName}-initial`, this.screenshotDir));
    const elements = await inspectDOM(this.page);
    console.log(`Found ${elements.length} interactive elements`);

    const pageTitle = await this.page.title();
    const pageText = await this.page.evaluate(() => document.body.innerText.substring(0, 3000));

    for (const el of elements.filter(e => e.type === 'input')) {
      try {
        await this.page.focus(el.selector);
        screenshots.push(await takeScreenshot(this.page, `${featureName}-${el.label || el.selector}`, this.screenshotDir));
      } catch { /* not interactable */ }
    }

    return { elements, networkCalls, screenshots, pageTitle, pageText };
  }
}
