import { Page } from 'playwright';

export interface NavigateOptions {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

export async function navigateTo(page: Page, options: NavigateOptions): Promise<void> {
  const { url, waitUntil = 'networkidle', timeout = 30000 } = options;
  console.log(`🌐 Navigating to: ${url}`);
  await page.goto(url, { waitUntil, timeout });
}
