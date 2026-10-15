import { test, expect } from '@playwright/test'
import { openRetail } from './fixtures.js'
import { signInRetail } from './authFixture.js'

test('mobile account offers theme, language and account management', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openRetail(page)
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Управление аккаунтом' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'KZ', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Тёмная', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Быстрые действия' }).click()
  await expect(page.getByRole('menuitem', { name: 'Открыть витрину' })).toHaveAttribute(
    'href',
    '/s/audit'
  )
})

test('a failed scan query never generates a claim that there are no scans', async ({ page }) => {
  await openRetail(page, { mode: 'partial-error' })
  await expect(page.locator('.ov .retail-skel')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('.ov')).not.toContainText('сканов ещё нет')
  await expect(page.locator('.ov').getByRole('alert').first()).toBeVisible()
})

test('QR dialog closes with Escape and returns focus to its action', async ({ page }) => {
  await openRetail(page)
  await page.getByRole('button', { name: 'Быстрые действия' }).click()
  await page.getByRole('menuitem', { name: /QR.*кассу|QR.*покупател/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Быстрые действия' })).toBeFocused()
})

test('large values stay inside their cells on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await openRetail(page, { large: true, lang: 'kz' })
  await expect(page.locator('.ov .retail-skel')).toHaveCount(0)
  const overflows = await page.locator('.ov-kpi__value').evaluateAll((elements) =>
    elements
      .filter((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return range.getBoundingClientRect().right > el.getBoundingClientRect().right + 1
      })
      .map((el) => el.textContent)
  )
  expect(overflows).toEqual([])
})

test('period changes survive refresh and Back restores the previous period', async ({ page }) => {
  await openRetail(page)
  const period = page.getByRole('group', { name: 'Период статистики' })
  await period.getByRole('button', { name: '30 дней' }).click()
  await expect(page).toHaveURL(/period=30/)
  await page.reload()
  await expect(period.getByRole('button', { name: '30 дней' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.goBack()
  await expect(period.getByRole('button', { name: '7 дней' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})

test('account controls actually switch language and theme on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openRetail(page)
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
  await page.getByRole('button', { name: 'Тёмная', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'KZ', exact: true }).click()
  await expect(page.locator('.ov-title')).toHaveText('Дүкенге шолу')
  await page.getByRole('button', { name: 'Аккаунтты басқару' }).click()
  const dialog = page.getByRole('dialog', { name: 'Аккаунтты басқару' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Сақтау', exact: true })).not.toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Жабу', exact: true }).last()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Аккаунт', exact: true })).toBeFocused()
})

test('QR print contains only the sheet and its address stays readable', async ({ page }) => {
  await openRetail(page)
  await page.getByRole('button', { name: 'Быстрые действия' }).click()
  await page.getByRole('menuitem', { name: 'QR для покупателей', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.rc-qr-sheet__url')).toHaveText('http://127.0.0.1:5187/s/audit')
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('#root')).toBeHidden()
  await expect(page.locator('.rc-qr-code svg')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Распечатать' })).toBeHidden()
})

test('unauthenticated access without development preview requires login', async ({ page }) => {
  await openRetail(page, { preview: false })
  await expect(page).toHaveURL(/\/retail\/login/)
  await expect(page.locator('.ov-title')).toHaveCount(0)
})

test('collapsed sidebar keeps accessible labels and persists its state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await openRetail(page)
  await page.getByRole('button', { name: 'Свернуть меню' }).click()
  await expect(page.locator('.rc-side')).toHaveClass(/rc-side--collapsed/)
  await expect(
    page.locator('.rc-side').getByRole('link', { name: 'Каталог', exact: true })
  ).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Развернуть меню' })).toBeVisible()
})

test('account actions remain reachable on a short mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 320 })
  await openRetail(page)
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
  await page.locator('.rc-account__panel').evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect(page.getByRole('button', { name: 'Выйти из аккаунта' })).toBeInViewport()
})

test('an authenticated visitor who does not own the store cannot open the cabinet', async ({
  page,
}) => {
  await openRetail(page)
  await signInRetail(page, { owner: false })
  await expect(page.getByText('Нет доступа', { exact: true })).toBeVisible()
  await expect(page.locator('.ov-title')).toHaveCount(0)
})

test('account form validates passwords and preserves the profile update contract', async ({
  page,
}) => {
  await openRetail(page)
  await signInRetail(page)
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
  await page.getByRole('button', { name: 'Управление аккаунтом' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Имя', exact: true }).fill(' Новый владелец ')
  await dialog.getByRole('button', { name: 'Безопасность', exact: true }).click()
  await dialog.getByLabel('Новый пароль', { exact: true }).fill('short')
  await dialog.getByLabel('Повторите пароль', { exact: true }).fill('short')
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Пароль должен быть не менее 6 символов')
  await dialog.getByLabel('Новый пароль', { exact: true }).fill('local-test-password')
  await dialog.getByLabel('Повторите пароль', { exact: true }).fill('different-local-password')
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Пароли не совпадают')
  await dialog.getByLabel('Повторите пароль', { exact: true }).fill('local-test-password')
  const request = page.waitForRequest(
    (request) => request.url().includes('/auth/v1/user') && request.method() === 'PUT'
  )
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  expect((await request).postDataJSON()).toMatchObject({
    data: { name: 'Новый владелец', avatar_id: 'av23' },
    password: 'local-test-password',
  })
  await expect(dialog.getByRole('status')).toHaveText('Профиль обновлён')
  await expect(dialog).toHaveCount(0)
})

test('saving profile does not submit a password hidden on the other tab', async ({ page }) => {
  await openRetail(page)
  await signInRetail(page)
  await page.getByRole('button', { name: 'Аккаунт', exact: true }).click()
  await page.getByRole('button', { name: 'Управление аккаунтом' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Безопасность', exact: true }).click()
  await dialog.getByLabel('Новый пароль', { exact: true }).fill('local-test-password')
  await dialog.getByLabel('Повторите пароль', { exact: true }).fill('local-test-password')
  await dialog.getByRole('button', { name: 'Профиль', exact: true }).click()
  const request = page.waitForRequest(
    (request) => request.url().includes('/auth/v1/user') && request.method() === 'PUT'
  )
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click()
  expect((await request).postDataJSON()).not.toHaveProperty('password')
})

for (const width of [1440, 390]) {
  test(`shared navigation opens each existing section at ${width}`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 960 })
    await openRetail(page)
    await signInRetail(page)
    const navigation = width >= 1024 ? page.locator('.rc-side__nav') : page.locator('.rc-mnav')
    for (const [label, section] of [
      ['Каталог', 'products'],
      ['Витрина', 'storefront'],
      ['Подключение', 'integration'],
      ['Настройки', 'settings'],
      ['Обзор', 'dashboard'],
    ]) {
      await navigation.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/retail/audit/${section}`))
      await expect(navigation.getByRole('link', { name: label, exact: true })).toHaveAttribute(
        'aria-current',
        'page'
      )
      await expect(page.getByRole('button', { name: 'Аккаунт', exact: true })).toBeVisible()
    }
    expect(errors).toEqual([])
  })
}

test('failed clipboard writes show a failure instead of a success message', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Test permission denied')
        },
      },
    })
  })
  await openRetail(page)
  await page.getByRole('button', { name: 'Быстрые действия' }).click()
  await page.getByRole('menuitem', { name: 'Скопировать ссылку на магазин' }).click()
  await expect(page.getByRole('status')).toContainText('Не удалось скопировать ссылку')
})
