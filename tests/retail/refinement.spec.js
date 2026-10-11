import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { mkdirSync } from 'node:fs'

mkdirSync('scratch/retail-revision', { recursive: true })

test('collapse control stays anchored and rail animates through intermediate widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openRetail(page, { mode: 'empty' })
  const icon = page.locator('.rc-side__collapse svg')
  const before = await icon.boundingBox()
  const widths = await page.evaluate(async () => {
    const side = document.querySelector('.rc-side')
    const start = performance.now()
    const samples = []
    document.querySelector('.rc-side__collapse').click()
    while (performance.now() - start < 650) {
      await new Promise(requestAnimationFrame)
      samples.push(side.getBoundingClientRect().width)
    }
    return samples
  })
  const after = await icon.boundingBox()
  expect(Math.abs(before.x - after.x)).toBeLessThan(2)
  expect(Math.abs(before.y - after.y)).toBeLessThan(2)
  expect(widths.filter((width) => width > 90 && width < 250).length).toBeGreaterThan(3)
  await expect(page.locator('.rc-side__wordmark')).toHaveCount(1)
  await page.screenshot({ path: 'scratch/retail-revision/collapsed.png' })
})

test('owner preferences reuse the consumer moving toggles', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openRetail(page, { snapshot: 'mars' })
  await page.locator('.rc-account__trigger').click()
  await expect(
    page.locator('.rc-account__panel .rc-preference-toggle > [role="group"]')
  ).toHaveCount(2)
  await expect(page.locator('.rc-account__panel')).toHaveAttribute('role', 'dialog')
  await expect
    .poll(() =>
      page.locator('.rc-preference-toggle [role="group"]').evaluateAll((elements) =>
        elements.map((element) => {
          const thumb = element.querySelector('span')
          return {
            width: thumb.getBoundingClientRect().width,
            background: getComputedStyle(thumb).backgroundColor,
            primary: getComputedStyle(element).getPropertyValue('--primary'),
          }
        })
      )
    )
    .toEqual([
      { width: 50, background: 'rgb(109, 93, 252)', primary: '#6d5dfc' },
      { width: 50, background: 'rgb(109, 93, 252)', primary: '#6d5dfc' },
    ])
  await page.screenshot({ path: 'scratch/retail-revision/account-menu.png' })
  await page.getByRole('button', { name: 'Управление аккаунтом' }).click()
  await expect(page.getByRole('dialog', { name: 'Управление аккаунтом' })).toBeVisible()
  await page.screenshot({ path: 'scratch/retail-revision/account-profile.png' })
})

for (const snapshot of ['bereke', 'mars'])
  for (const theme of ['light', 'dark'])
    for (const width of [1440, 390]) {
      for (const lang of ['ru', 'kz'])
        test(`verified read-only snapshot ${snapshot} ${theme} ${width} ${lang}`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
          await openRetail(page, { snapshot, theme, lang })
          await expect(page.locator('.ov-error')).toHaveCount(0)
          await expect(page.locator('.ov-kpi__value').first()).toHaveText(
            snapshot === 'mars' ? '7' : '0'
          )
          if (snapshot === 'mars') {
            const photo = page.locator('.ov-thumb img').first()
            await expect(photo).toHaveCSS('mix-blend-mode', 'normal')
            await expect
              .poll(() => photo.evaluate((img) => img.naturalWidth), { timeout: 10000 })
              .toBeGreaterThan(0)
          } else {
            await expect(page.locator('.ov-launch')).toBeVisible()
            await expect(page.locator('.ov-kpi__value').nth(2)).toHaveText('—')
          }
          await page.screenshot({
            path: `scratch/retail-revision/${snapshot}-${theme}-${width}${lang === 'ru' ? '' : '-kz'}.png`,
            fullPage: true,
          })
          if (width === 1440) {
            await page.locator('.retail-desktop-content').evaluate((element) => {
              element.scrollTop = element.scrollHeight
            })
            await page.screenshot({
              path: `scratch/retail-revision/${snapshot}-${theme}-details${lang === 'ru' ? '' : '-kz'}.png`,
            })
          }
        })
    }

test('rolling 90-day period persists without manufacturing calendar date ranges', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openRetail(page, { mode: 'empty' })
  await page.getByRole('button', { name: '90 дней', exact: true }).click()
  await expect(page).toHaveURL(/period=90/)
  await expect(page.locator('.ov-error')).toHaveCount(0)
})

test('open account panel stays inside the screen after mobile rotation', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 320 })
  await openRetail(page)
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(async () => {
      const box = await page.locator('.rc-account__panel').boundingBox()
      return box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844
    })
    .toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Аккаунт', exact: true })).toBeFocused()
})

test('filtered bounded demand never claims that the entire store has no missed items', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openRetail(page)
  await page.route('**/rest/v1/rpc/get_missed_opportunities', (route) =>
    route.fulfill({
      json: Array.from({ length: 51 }, (_, index) => ({
        ean: `opaque-test-${index}`,
        name: `Test demand ${index}`,
        miss_count: 1,
      })),
    })
  )
  await page.getByRole('button', { name: '14 дней', exact: true }).click()
  const card = page
    .locator('.ov-card')
    .filter({ has: page.getByRole('heading', { name: 'Упущенная выгода', exact: true }) })
  await expect(card).toContainText('Показаны до 50')
  await page
    .locator('.ov-filter')
    .getByRole('button', { name: 'Нет в наличии', exact: true })
    .click()
  await expect(card).toContainText('В этой выборке подходящих товаров нет')
  await expect(card).not.toContainText('Всё найдено покупателями')
  await expect(page.locator('.ov-attn')).toContainText('В показанной выборке вне каталога: 50')
  await expect(page.locator('.ov-advice')).toContainText('Неизвестных штрихкодов: 50+')
})
