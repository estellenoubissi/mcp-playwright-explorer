import { Page } from 'playwright';
import { UIElement } from '../../reporters/types';

export async function inspectDOM(page: Page): Promise<UIElement[]> {
  return page.evaluate((): UIElement[] => {
    const results: UIElement[] = [];

    document.querySelectorAll('input, textarea, select').forEach((el) => {
      const input = el as HTMLInputElement;
      results.push({
        type: input.tagName === 'SELECT' ? 'select' : 'input',
        selector: input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : input.tagName.toLowerCase(),
        label: input.labels?.[0]?.textContent?.trim(),
        placeholder: input.placeholder,
        required: input.required,
      });
    });

    document.querySelectorAll('button, [role="button"], input[type="submit"]').forEach((el) => {
      results.push({
        type: 'button',
        selector: el.id ? `#${el.id}` : 'button',
        label: el.textContent?.trim(),
      });
    });

    return results;
  });
}
