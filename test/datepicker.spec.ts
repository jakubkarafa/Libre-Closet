import { test, expect } from '@playwright/test';

test('a date field opens the app calendar and submits YYYY-MM-DD', async ({
  page,
}) => {
  await page.goto('/wardrobe/new');
  const input = page.locator('input[name="dateAquired"]');
  const field = page.locator('input[name="dateAquired"] + .datepicker-field');
  await expect(input).toBeHidden();
  await expect(field).toBeVisible();

  await field.click();
  const panel = page.locator('.datepicker[role="dialog"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[role="grid"]')).toBeVisible();
  await expect(panel.locator('[aria-current="date"]')).toBeFocused();

  // keyboard: a week on, then a month back, then pick
  const now = new Date();
  const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const lastOfPrev = new Date(week.getFullYear(), week.getMonth(), 0).getDate();
  const expected = new Date(
    week.getFullYear(),
    week.getMonth() - 1,
    Math.min(week.getDate(), lastOfPrev),
  );
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('Enter');
  await expect(panel).toBeHidden();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await expect(input).toHaveValue(iso(expected));
  await expect(field).toBeFocused();

  // Escape closes without a change; Clear empties
  await field.click();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(input).toHaveValue(iso(expected));
  await field.click();
  await panel.locator('.datepicker-foot button').last().click();
  await expect(input).toHaveValue('');
});
