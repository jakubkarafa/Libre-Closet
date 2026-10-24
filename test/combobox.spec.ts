import { test, expect } from '@playwright/test';

test('a datalist input opens a styled menu, filters and picks', async ({
  page,
}) => {
  await page.goto('/wardrobe/new');
  const input = page.locator('input[name="category"]');
  await expect(input).toHaveAttribute('role', 'combobox');
  await expect(input).not.toHaveAttribute('list', /.*/);

  await input.click();
  const menu = page.locator('ul[role="listbox"]');
  await expect(menu).toBeVisible();

  await input.fill('foot');
  await expect(menu.locator('[role="option"]')).toHaveText(['footwear']);
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(input).toHaveValue('footwear');
  await expect(menu).toBeHidden();

  await input.fill('');
  await input.press('ArrowDown');
  await menu.locator('[role="option"]', { hasText: 'tops' }).click();
  await expect(input).toHaveValue('tops');
});
