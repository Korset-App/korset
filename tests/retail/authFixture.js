export async function signInRetail(page, { owner = true, storeSlug = 'audit' } = {}) {
  const store = await page.evaluate((storeSlug) =>
    JSON.parse(localStorage.getItem(`korset_store_data_${storeSlug}`)), storeSlug
  )
  const user = {
    id: owner ? store.owner_id : '00000000-0000-4000-8000-000000000003',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'owner@example.test',
    app_metadata: {},
    user_metadata: { name: 'Тестовый владелец', avatar_id: 'av23' },
  }
  const claims = {
    sub: user.id,
    aud: user.aud,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  const token = [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(JSON.stringify(claims)),
    'test-only-signature',
  ].join('.')
  await page.route('**/auth/v1/user', async (route) => {
    if (route.request().method() === 'PUT') {
      user.user_metadata = { ...user.user_metadata, ...route.request().postDataJSON().data }
    }
    return route.fulfill({ json: user })
  })
  await page.route('**/rest/v1/users**', (route) =>
    route.fulfill({
      json: { id: user.id, name: user.user_metadata.name, avatar_id: user.user_metadata.avatar_id },
    })
  )
  await page.evaluate(
    async ({ accessToken }) => {
      const { supabase } = await import('/src/utils/supabase.js')
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: 'retail-test-only',
      })
      if (error) throw error
    },
    { accessToken: token }
  )
  await page.goto(`/retail/${storeSlug}/dashboard`)
}
