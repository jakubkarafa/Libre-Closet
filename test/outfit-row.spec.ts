import { test, expect } from '@playwright/test';

test('outfit rows keep their height while cycling, the empty slot too', async ({
  page,
  request,
}) => {
  await request.post('/wardrobe', {
    form: { name: 'Row height test', category: 'tops' },
    maxRedirects: 0,
  });
  await page.goto('/outfits/new');
  const row = page.locator('.outfit-row[data-category="tops"]');
  const height = async () => (await row.boundingBox())!.height;
  const first = await height();
  const steps = Number(await row.getAttribute('data-count')) + 1; // every garment and the empty slot
  for (let i = 0; i < steps; i++) {
    const index = await row.getAttribute('data-index');
    await row.locator('button.btn-circle').nth(1).click();
    await expect(row).not.toHaveAttribute('data-index', index!);
    expect(await height()).toBe(first);
  }
});
