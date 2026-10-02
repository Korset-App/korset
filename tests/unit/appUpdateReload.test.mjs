import test from 'node:test'
import assert from 'node:assert/strict'
const updates = await import('../../src/utils/appUpdateReload.js').catch(() => ({}))

test('installing the first service worker does not reload an active scanner', () => {
  assert.equal(typeof updates.createUpdateReloadHandler, 'function')
  let reloads = 0
  const update = updates.createUpdateReloadHandler({ hasController: false, canReload: () => true, reload: () => { reloads += 1 } })
  update()
  assert.equal(reloads, 0)
  update()
  assert.equal(reloads, 1)
})

test('a deployed update waits until the camera and product screen are left', () => {
  assert.equal(typeof updates.createUpdateReloadHandler, 'function')
  let reloads = 0
  let pathname = '/s/mars/scan'
  let tick
  const update = updates.createUpdateReloadHandler({
    hasController: true,
    canReload: () => updates.isSafeUpdateRoute(pathname),
    reload: () => { reloads += 1 },
    schedule: (callback) => { tick = callback },
  })
  update()
  assert.equal(reloads, 0)
  pathname = '/s/mars/product/fixture'
  tick()
  assert.equal(reloads, 0)
  pathname = '/s/mars/catalog'
  tick()
  update()
  assert.equal(reloads, 1)
})
