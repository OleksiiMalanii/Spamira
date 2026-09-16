import { expect, test } from '@playwright/test';

test('account registration, private history, logout and sign-in', async ({ page }) => {
  const email = `browser-${crypto.randomUUID()}@example.com`;
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Sign in to Spamira' })).toBeVisible();
  await page.getByRole('link', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Your name').fill('Alex Morgan');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('BrowserPassword123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Classification history', exact: true }),
  ).toBeVisible();
  await page.goto('/analyzer');
  await page.getByRole('button', { name: 'Everyday message' }).click();
  await page.getByRole('button', { name: 'Analyze message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Legitimate', exact: true })).toBeVisible();
  await page.getByText('Saved to classification history').click();
  await page.getByLabel('Search messages').fill('meeting for lunch tomorrow');
  await expect(
    page.locator('summary').filter({ hasText: 'Hey, are we still meeting' }).first(),
  ).toBeVisible();
  await page.getByLabel('Filter by classification').selectOption('legitimate');
  await expect(page.getByRole('cell', { name: 'Legitimate', exact: true }).first()).toBeVisible();
  await page.locator('summary').first().click();
  await page.getByRole('link', { name: 'Analyze again', exact: true }).first().click();
  await expect(page.getByLabel('Message content')).toHaveValue(/meeting for lunch tomorrow/);
  await page.goto('/history');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to Spamira' })).toBeVisible();
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Sign in to Spamira' })).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('BrowserPassword123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.locator('summary').filter({ hasText: 'Hey, are we still meeting' }).first(),
  ).toBeVisible();
  await page.goto('/metrics');
  await expect(page.getByRole('heading', { name: 'Confusion matrix' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Model online')).toBeVisible();
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'From text to insight' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test('guest analysis shows probabilities and never offers saved history', async ({ page }) => {
  await page.goto('/analyzer');
  await page.getByRole('button', { name: 'Suspicious text' }).click();
  await page.getByRole('button', { name: 'Analyze message', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Spam', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /Spam.*legitimate/ })).toBeVisible();
  await expect(page.getByText('Guest result · not saved. Create an account')).toBeVisible();
  await expect(page.getByText('Saved to classification history')).not.toBeVisible();
  await page.goto('/register');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});

test('Ukrainian interface persists across pages and keeps draft input', async ({ page }) => {
  await page.goto('/analyzer');
  await page.getByLabel('Message content').fill('Привіт, побачимося завтра!');
  await page.getByRole('button', { name: 'UK', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Аналіз повідомлень', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Текст повідомлення')).toHaveValue('Привіт, побачимося завтра!');
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Створіть свій акаунт' })).toBeVisible();
  await page.getByLabel('Ваше ім’я').fill('Тест');
  await page.getByLabel('Електронна пошта').fill(`uk-${crypto.randomUUID()}@example.com`);
  await page.getByLabel('Пароль', { exact: true }).fill('BrowserPassword123');
  await page.getByRole('button', { name: 'Створити акаунт', exact: true }).click();
  await page.getByLabel('Текст повідомлення').fill('Привіт! Чекаю тебе завтра біля офісу.');
  await page.getByRole('button', { name: 'Проаналізувати', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Не спам', exact: true })).toBeVisible();
  await page.goto('/metrics');
  await expect(page.getByRole('heading', { name: 'Якість за мовами' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Українська', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Behind the predictions' })).toBeVisible();
});
