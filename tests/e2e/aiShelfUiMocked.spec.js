import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 390, height: 844 }
const DESKTOP_VIEWPORT = { width: 1280, height: 900 }

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    return {
      innerWidth: window.innerWidth,
      docScrollWidth: doc.scrollWidth,
      bodyScrollWidth: body?.scrollWidth || 0,
    }
  })

  expect(Math.max(metrics.docScrollWidth, metrics.bodyScrollWidth)).toBeLessThanOrEqual(
    metrics.innerWidth + 2
  )
}

async function expectInputAboveBottomNav(page, input) {
  const nav = page.locator('nav').last()
  await expect(nav).toBeVisible()
  await expect(input).toBeVisible()

  const inputBox = await input.boundingBox()
  const navBox = await nav.boundingBox()

  expect(inputBox).not.toBeNull()
  expect(navBox).not.toBeNull()
  expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(navBox.y + 2)
}

function longShelfReply() {
  return [
    'Я бы начал с вариантов, которые есть именно в этом магазине: сначала проверил состав, затем наличие и только потом цену.',
    'По карточкам видно, что часть данных неполная, поэтому для аллергенов и халал-статуса лучше сверить упаковку перед покупкой.',
    'Если нужно купить быстро, возьмите первый вариант и проверьте состав на полке; если нужен самый спокойный выбор, сравните ещё одну альтернативу.',
  ].join(' ')
}

const longProductName =
  'Очень длинное название продукта без резких переносов Premium Family Pack халал без сахара с подробным описанием состава'

const productA = {
  ean: '4870204070018',
  name: 'Йогурт натуральный без сахара',
  brand: 'Demo',
  category: 'dairy',
  ingredients: 'молоко, закваска',
  allergens: ['milk'],
  halalStatus: 'unknown',
  priceKzt: 890,
  stockStatus: 'in_stock',
}

const productB = {
  ean: '4870204070094',
  name: 'Напиток овсяный без молока',
  brand: 'Demo',
  category: 'dairy',
  ingredients: 'вода, овес, масло подсолнечное',
  allergens: [],
  halalStatus: 'likely_halal',
  priceKzt: 1190,
  stockStatus: 'in_stock',
}

test.describe('AI shelf-use UI smoke', () => {
  test('general AI stays usable on mobile with long reply and product cards', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)

    await page.route('**/api/ai', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: longShelfReply(),
          productGroups: [
            {
              id: 'shelf-options',
              title: 'Подходящие варианты',
              products: [
                {
                  ean: '4870204070018',
                  name: longProductName,
                  brand: 'Premium Demo Brand',
                  priceKzt: 12990,
                  stockStatus: 'in_stock',
                },
                {
                  ean: '4870204070094',
                  name: 'Короткая альтернатива',
                  brand: 'Demo',
                  priceKzt: 990,
                  stockStatus: 'low_stock',
                },
              ],
            },
          ],
          followUps: ['Сравнить варианты', 'Показать дешевле'],
          warnings: ['missing_composition'],
          ragUsed: false,
        }),
      })
    })

    await page.goto('/s/store-one/ai', { waitUntil: 'domcontentloaded' })

    const input = page.getByPlaceholder('Спросить про товары...')
    await input.fill('Подбери безопасный перекус у полки')
    await input.press('Enter')

    await expect(page.getByText(longProductName)).toBeVisible()
    await expect(page.getByText('Сравнить варианты')).toBeVisible()
    await expect(page.locator('a[href="/s/store-one/product/4870204070018"]')).toBeVisible()

    await expectInputAboveBottomNav(page, input)
    await expectNoHorizontalOverflow(page)
  })

  test('product AI keeps chips, error state, and composer usable on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)

    await page.route('**/api/ai', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Mocked shelf error' }),
      })
    })

    await page.addInitScript((product) => {
      window.history.replaceState(
        {
          usr: { product },
          key: 'product-ai-ui-smoke',
          idx: 0,
        },
        '',
        window.location.href
      )
    }, productA)

    await page.goto('/s/store-one/product/4870204070018/ai', { waitUntil: 'domcontentloaded' })

    await expect(page.getByText('Можно мне этот продукт?')).toBeVisible()
    await expect(page.getByText('Разберите состав простыми словами')).toBeVisible()

    const input = page.getByPlaceholder('Спросить о продукте...')
    await input.fill('Можно мне это при аллергии?')
    await input.press('Enter')

    await expect(page.getByText(/Ошибка: Mocked shelf error/)).toBeVisible()
    await expectInputAboveBottomNav(page, input)
    await expectNoHorizontalOverflow(page)
  })

  test('compare screen uses human labels without fake precision on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT)

    await page.addInitScript(
      ({ productA, productB }) => {
        window.history.replaceState(
          {
            usr: { productA, productB },
            key: 'compare-ui-smoke',
            idx: 0,
          },
          '',
          window.location.href
        )
      },
      { productA, productB }
    )

    await page.goto('/s/store-one/product/4870204070018/compare/4870204070094', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.getByText('Йогурт натуральный без сахара').first()).toBeVisible()
    await expect(page.getByText('Напиток овсяный без молока').first()).toBeVisible()
    await expect(page.getByText('Хороший вариант').first()).toBeVisible()
    await expect(page.getByText('Разница небольшая')).toBeVisible()
    await expect(page.getByText('%')).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })

  test('general AI shell has no horizontal overflow on desktop', async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.goto('/s/store-one/ai', { waitUntil: 'domcontentloaded' })

    await expect(page.getByPlaceholder('Спросить про товары...')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
