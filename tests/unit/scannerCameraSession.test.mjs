import test from 'node:test'
import assert from 'node:assert/strict'
import * as cameraEngine from '../../src/utils/scannerEngine.js'

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

function createController(options = {}) {
  assert.equal(typeof cameraEngine.createCameraController, 'function')
  return cameraEngine.createCameraController(options)
}

test('camera switching waits for the old capture and releases it before the new one', async () => {
  const controller = createController()
  const pending = deferred()
  const entered = deferred()
  const calls = []
  const first = controller.start(async (session) => {
    session.setScanner({ stop: async () => { calls.push('stop-old') }, clear() {} })
    entered.resolve()
    await pending.promise
    assert.equal(session.isCurrent(), false)
  })
  await entered.promise
  const second = controller.start(async (session) => {
    calls.push('start-front')
    assert.equal(session.isCurrent(), true)
  })
  pending.resolve()
  await Promise.all([first, second])
  assert.deepEqual(calls, ['stop-old', 'start-front'])
  await controller.stop()
})

test('closing during camera permission releases a stream that arrives late', async () => {
  const controller = createController()
  const pending = deferred()
  const entered = deferred()
  let stops = 0
  const track = { stop() { stops += 1 } }
  const first = controller.start(async (session) => {
    entered.resolve()
    await pending.promise
    session.setStream({ getTracks: () => [track] })
    assert.equal(session.isCurrent(), false)
  })
  await entered.promise
  const closing = controller.stop()
  pending.resolve()
  await Promise.all([first, closing])
  assert.equal(stops, 1)
})

test('a failed half-open camera releases tracks even when scanner stop fails', async () => {
  let stops = 0
  const controller = createController()
  await assert.rejects(controller.start(async (session) => {
    session.setStream({ getTracks: () => [{ stop() { stops += 1 } }] })
    session.setScanner({ stop: async () => { throw new Error('not scanning') }, clear() {} })
    throw new Error('no frames')
  }), /no frames/)
  assert.equal(stops, 1)
})

test('superseded starts do not acquire another camera', async () => {
  const controller = createController()
  const pending = deferred()
  const entered = deferred()
  const calls = []
  const first = controller.start(async () => { entered.resolve(); await pending.promise })
  await entered.promise
  const second = controller.start(async () => { calls.push('superseded') })
  const third = controller.start(async () => { calls.push('latest') })
  pending.resolve()
  await Promise.all([first, second, third])
  assert.deepEqual(calls, ['latest'])
  await controller.stop()
})

test('video readiness requires advancing frames instead of only live-looking metadata', async () => {
  assert.equal(typeof cameraEngine.waitForCameraFrames, 'function')
  const video = { readyState: 4, videoWidth: 640, paused: false, currentTime: 0, play: async () => {}, setAttribute() {} }
  assert.equal(await cameraEngine.waitForCameraFrames(() => video, { timeoutMs: 30, pollMs: 5 }), false)
  const timer = setInterval(() => { video.currentTime += 0.1 }, 5)
  try {
    assert.equal(await cameraEngine.waitForCameraFrames(() => video, { timeoutMs: 50, pollMs: 5 }), true)
  } finally {
    clearInterval(timer)
  }
})

test('a video with live metadata but stalled frames reports interruption once', async () => {
  assert.equal(typeof cameraEngine.watchCameraFrames, 'function')
  const track = new EventTarget()
  track.readyState = 'live'
  track.muted = false
  const video = { currentTime: 1, paused: false, readyState: 4 }
  let interruptions = 0
  const stop = cameraEngine.watchCameraFrames(video, track, () => { interruptions += 1 }, { stallMs: 20, pollMs: 5 })
  await new Promise((resolve) => setTimeout(resolve, 50))
  stop()
  track.dispatchEvent(new Event('ended'))
  assert.equal(interruptions, 1)
})

test('an old screen never stops the video belonging to a remounted screen', async () => {
  let currentVideo = null
  let newStops = 0
  const oldSurface = { querySelector: () => null, remove() {} }
  const controller = createController({
    getSurface: () => oldSurface,
    getVideo: () => currentVideo,
  })
  const pending = deferred()
  const entered = deferred()
  const work = controller.start(async () => { entered.resolve(); await pending.promise })
  await entered.promise
  const closing = controller.stop()
  currentVideo = { srcObject: { getTracks: () => [{ stop() { newStops += 1 } }] } }
  pending.resolve()
  await Promise.all([work, closing])
  assert.equal(newStops, 0)
})

test('stop does not wait forever for an unanswered browser permission request', async () => {
  const controller = createController()
  const entered = deferred()
  const pending = deferred()
  const work = controller.start(async (session) => {
    entered.resolve()
    await pending.promise
    session.setStream({ getTracks: () => [] })
  })
  await entered.promise
  const stopped = await Promise.race([
    controller.stop().then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 30)),
  ])
  pending.resolve()
  await work
  assert.equal(stopped, true)
})

test('an unanswered camera request reaches a bounded startup deadline', async () => {
  const controller = createController({ startTimeoutMs: 10 })
  const pending = deferred()
  await assert.rejects(controller.start(async () => { await pending.promise }), /camera start timeout/)
  pending.resolve()
  await controller.stop()
})

test('retry never starts a second capture while the cancelled permission request is pending', async () => {
  const controller = createController({ startTimeoutMs: 15 })
  const pending = deferred()
  const entered = deferred()
  const calls = []
  const oldTrack = { stop() { calls.push('old-stop') } }
  const first = controller.start(async (session) => {
    await session.startCapture(async () => {
      entered.resolve()
      calls.push('old-request')
      await pending.promise
      session.setStream({ getTracks: () => [oldTrack] })
    })
  })
  await entered.promise
  await assert.rejects(first, /camera start timeout/)
  const retry = controller.start(async (session) => {
    await session.startCapture(async () => { calls.push('new-request') })
  })
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.deepEqual(calls, ['old-request'])
  pending.resolve()
  await retry
  assert.deepEqual(calls, ['old-request', 'old-stop', 'new-request'])
  await controller.stop()
})

test('startup timeout cannot revive a session still releasing its previous attempt', async () => {
  const pendingStop = deferred()
  const controller = createController({ startTimeoutMs: 10 })
  let currentAfterRelease = null
  await assert.rejects(controller.start(async (session) => {
    session.setScanner({ stop: () => pendingStop.promise, clear() {} })
    await session.releaseCamera()
    currentAfterRelease = session.isCurrent()
  }), /camera start timeout/)
  pendingStop.resolve()
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(currentAfterRelease, false)
})
