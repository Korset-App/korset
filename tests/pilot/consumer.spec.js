import { test, expect } from '@playwright/test'
import { MILK_EAN, UNKNOWN_EAN, openConsumer, stores } from './consumerFixtures.js'

const labels = {
  ru: { danger: 'Не подходит', caution: 'С осторожностью', add: 'Добавить в список покупок' },
  kz: { danger: 'Сай емес', caution: 'Абайлаңыз', add: 'Сатып алу тізіміне қосу' },
}

async function openDairy(page) {
  await page.locator('.catalog-category-card[data-category="dairy_eggs"]').click()
  await expect(page.locator('.catalog-product-card').first()).toBeVisible()
}

for (const { lang, theme } of [
  { lang: 'ru', theme: 'light' },
  { lang: 'kz', theme: 'dark' },
]) {
  test(`catalog opens a milk-allergen Fit-Check in the product card (${lang}, ${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openConsumer(page, { lang, theme })
    await openDairy(page)
    const card = page.locator('.catalog-product-card').filter({
      hasText: lang === 'kz' ? 'Pilot сүт йогурты' : 'Pilot milk yoghurt',
    })
    await expect(card).toContainText(lang === 'kz' ? 'Pilot сүт йогурты' : 'Pilot milk yoghurt')
    await expect(card.locator('.catalog-verdict-badge.danger')).toContainText(labels[lang].danger)
    await card.click()
    await expect(page).toHaveURL(new RegExp(`/s/pilot-a/product/${MILK_EAN}$`))
    const fit = page.getByRole('button', { name: new RegExp(labels[lang].danger) }).first()
    await expect(fit).toBeVisible()
    await fit.click()
    await expect(fit).toContainText(lang === 'kz' ? /сүт/i : /молоко/i)
  })
}

test('guest adds to the store list and switching stores keeps both catalogs and lists separate', async ({ page }) => {
  await openConsumer(page)
  await openDairy(page)
  const add = page.locator('.catalog-product-card').filter({ hasText: 'Pilot milk yoghurt' })
    .locator('.shopping-list-button')
  await expect(add).toHaveAttribute('aria-label', labels.ru.add)
  await add.click()
  await expect(add).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => page.evaluate((id) => {
    const lists = JSON.parse(globalThis.localStorage.getItem('korset_local_shopping_lists_v1') || '{}')
    return lists[id] || []
  }, stores['pilot-a'].id)).toEqual([MILK_EAN])
  await page.goto('/s/pilot-a/shopping-list')
  await expect(page.getByText('Pilot milk yoghurt')).toBeVisible()

  await page.evaluate(() => globalThis.sessionStorage.removeItem('korset_catalog_category'))
  await page.goto('/s/pilot-b/catalog')
  await openDairy(page)
  await expect(page.locator('.catalog-product-card').filter({ hasText: 'Pilot milk yoghurt' })).toHaveCount(0)
  await expect(page.locator('.catalog-product-card').filter({ hasText: 'Pilot B product' })).toBeVisible()
  await page.goto('/s/pilot-b/shopping-list')
  await expect(page.getByText('Список покупок пуст')).toBeVisible()
  const list = await page.evaluate((id) => {
    const lists = JSON.parse(globalThis.localStorage.getItem('korset_local_shopping_lists_v1') || '{}')
    return lists[id] || []
  }, stores['pilot-b'].id)
  expect(list).toEqual([])
  await page.goto('/s/pilot-a/shopping-list')
  await expect(page.getByText('Pilot milk yoghurt')).toBeVisible()
})

test('guest copies an available item from another store while offline without requesting store names', async ({ page, context }) => {
  await openConsumer(page)
  await openDairy(page)
  const add = page.locator('.catalog-product-card').filter({ hasText: 'Pilot unknown ingredients' })
    .locator('.shopping-list-button')
  await add.click()
  await expect(add).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/s/pilot-b/shopping-list')
  await expect(page.getByText('Список покупок пуст')).toBeVisible()

  const storeNameRequests = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/rest/v1/stores' && url.searchParams.has('id')) {
      storeNameRequests.push(request.url())
    }
  })
  await context.setOffline(true)
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false)
  await page.getByRole('button', { name: 'Скопировать из другого магазина' }).click()
  const source = page.locator('.shopping-page__other-lists button')
  await expect(source).toContainText('Другой магазин')
  await expect(source).toContainText('Доступно здесь: 1 из 1')
  await source.click()
  await expect(page.getByText('Pilot B product')).toBeVisible()
  expect(storeNameRequests).toEqual([])
})

test('an open product keeps unknown properties cautious after network loss', async ({ page, context }) => {
  await openConsumer(page)
  await openDairy(page)
  const card = page.locator('.catalog-product-card').filter({ hasText: 'Pilot unknown ingredients' })
  await expect(card).toBeVisible()
  await expect(card.locator('.catalog-verdict-badge')).not.toHaveClass(/safe/)
  await card.click()
  await expect(page).toHaveURL(new RegExp(`/s/pilot-a/product/${UNKNOWN_EAN}$`))
  await expect(page.getByText('Pilot unknown ingredients')).toBeVisible()
  await context.setOffline(true)
  const fit = page.getByRole('button', { name: new RegExp(labels.ru.caution) }).first()
  await expect(fit).toBeVisible()
  await fit.click()
  await expect(fit).toContainText('проверьте упаковку на аллергены')
})
