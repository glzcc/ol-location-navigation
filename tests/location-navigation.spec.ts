import { expect, test } from '@playwright/test';

test('renders the navigation workstation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '定位导航工作台' })).toBeVisible();
  await expect(page.locator('.ol-location-navigation canvas').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '规划路径' })).toBeVisible();
});

test('plans a route from the demo network', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '规划路径' }).click();
  await expect(page.getByText('路径规划完成')).toBeVisible();
  await expect(page.getByText('总距离')).toBeVisible();
  await expect(page.getByText(/到达/)).toBeVisible();
});
