import { Page } from 'playwright';
import fs from 'fs';
import path from 'path';

export async function takeScreenshot(
  page: Page,
  label: string,
  outputDir = 'outputs/screenshots'
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
  const filepath = path.join(outputDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filepath}`);
  return filepath;
}
