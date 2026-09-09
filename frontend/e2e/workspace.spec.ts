import { expect, test } from '@playwright/test';

test('analyze, revisit history, inspect metrics, and navigate the workspace', async ({ page }) => {
  await page.goto('/analyzer');
  await expect(page.getByRole('heading', { name: 'Message analyzer', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Everyday message' }).click();
  await page.getByRole('button', { name: 'Analyze message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Legitimate', exact: true })).toBeVisible();
  await expect(page.getByText('Saved to classification history')).toBeVisible();
  await page.getByText('Saved to classification history').click();
  await expect(
    page.getByRole('heading', { name: 'Classification history', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Search messages').fill('meeting for lunch tomorrow');
  await expect(
    page.locator('summary').filter({ hasText: 'Hey, are we still meeting' }).first(),
  ).toBeVisible();
  await page.getByLabel('Filter by classification').selectOption('legitimate');
  await expect(page.getByRole('cell', { name: 'Legitimate', exact: true }).first()).toBeVisible();
  await page.goto('/metrics');
  await expect(page.getByRole('heading', { name: 'Confusion matrix' })).toBeVisible();
  await expect(page.getByText('True positives')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Model online')).toBeVisible();
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'From text to insight' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test('spam analysis provides a probability breakdown', async ({ page }) => {
  await page.goto('/analyzer');
  await page.getByRole('button', { name: 'Suspicious text' }).click();
  await page.getByRole('button', { name: 'Analyze message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Spam', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Spam.*legitimate/ })).toBeVisible();
});
