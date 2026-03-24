import { test, expect } from '@playwright/test';

test.describe('TodoMVC — Exploratory E2E', () => {
  test('loads the page', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await expect(page).toHaveTitle(/TodoMVC/);
  });

  test('shows the input field', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await expect(page.locator('.new-todo')).toBeVisible();
  });

  test('adds a todo item', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await page.locator('.new-todo').fill('Write exploratory tests');
    await page.locator('.new-todo').press('Enter');
    await expect(page.locator('.todo-list li')).toHaveCount(1);
    await expect(page.locator('.todo-list li')).toContainText('Write exploratory tests');
  });

  test('marks a todo as completed', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await page.locator('.new-todo').fill('Complete this task');
    await page.locator('.new-todo').press('Enter');
    await page.locator('.todo-list li .toggle').click();
    await expect(page.locator('.todo-list li')).toHaveClass(/completed/);
  });
});
