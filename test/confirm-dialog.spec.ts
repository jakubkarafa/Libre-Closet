import { test, expect } from '@playwright/test';

test('hx-confirm asks in the app dialog, not the browser confirm()', async ({
  page,
  request,
}) => {
  const created = await request.post('/wardrobe', {
    form: { name: 'Confirm test', category: 'tops' },
    maxRedirects: 0,
  });
  const garmentUrl = created.headers()['location'].split('?')[0];
  page.on('dialog', () => {
    throw new Error('native dialog opened');
  });

  await page.goto(garmentUrl);
  const deleteButton = page.locator('button[hx-delete]');
  const dialog = page.locator('#confirm-modal');

  await deleteButton.click();
  await expect(dialog).toBeVisible();
  await expect(page.locator('#confirm-modal-question')).not.toBeEmpty();
  await dialog.locator('button[value="cancel"]').first().click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(garmentUrl));

  await deleteButton.click();
  await dialog.locator('button[value="ok"]').click();
  await expect(page).toHaveURL(/\/wardrobe$/);
});
