import { expect, test } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://crossboder.vercel.app';

const badTextPatterns = [
  'Invalid Date',
  '操作失败',
  '加载失败',
  '获取供应商列表失败',
  '加载物流信息失败',
  'asn.title',
  'productionOrder.subtitle',
  'assembly.firmware',
  'ota.robot_firmware',
];

const corePages = [
  { nav: '仪表盘', expected: '仪表板' },
  { nav: '生产计划', expected: '生产计划' },
  { nav: 'ASN发货单', expected: 'ASN管理' },
  { nav: '收货管理', expected: '收货管理' },
  { nav: '异常中心', expected: '异常中心' },
  { nav: '物流仪表板', expected: '物流看板' },
  { nav: '物流跟踪', expected: '物流管理' },
  { nav: '供应商管理', expected: '供应商管理' },
  { nav: '出货订单', expected: '发货订单管理' },
  { nav: 'OTA版本', expected: '固件版本管理' },
];

const directRoutes = [
  '/',
  '/login',
  '/production-plans',
  '/logistics-dashboard',
  '/shipping-orders',
  '/ota/versions',
];

async function expectNoBadText(page: import('@playwright/test').Page) {
  const bodyText = await page.locator('body').innerText();
  for (const pattern of badTextPatterns) {
    expect(bodyText, `unexpected text: ${pattern}`).not.toContain(pattern);
  }
}

async function enterDemo(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: /进入系统/ })).toBeVisible();
  await page.getByRole('button', { name: /进入系统/ }).click();
  await expect(page.getByText('演示管理员')).toBeVisible();
}

test.describe('production smoke', () => {
  test('SPA direct routes are served by Vercel', async ({ page }) => {
    for (const route of directRoutes) {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route).toBeLessThan(400);
    }
  });

  test('demo login and core pages render without known failures', async ({ page }) => {
    await enterDemo(page);

    for (const item of corePages) {
      await page.getByText(item.nav, { exact: true }).first().click();
      await expect(page.getByText(item.expected).first()).toBeVisible();
      await expectNoBadText(page);
    }
  });
});
