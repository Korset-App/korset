import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { createDeadlineFetch } from '../../server/integration/deadlineFetch.js'

async function withServer(respond, run) {
  const server = createServer(respond)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try { await run(`http://127.0.0.1:${server.address().port}`) }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
}

test('database fetch deadline covers a stalled response body after headers arrive', async () => {
  await withServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.flushHeaders()
  }, async url => {
    const response = await createDeadlineFetch({ timeoutMs: 500 })(url)
    assert.equal(response.status, 200)
    await assert.rejects(response.json(), error => ['AbortError', 'TimeoutError'].includes(error.name))
  })
})

test('database fetch preserves caller cancellation without waiting for its own deadline', async () => {
  await withServer(() => {}, async url => {
    const controller = new AbortController()
    const request = createDeadlineFetch({ timeoutMs: 10000 })(url, { signal: controller.signal })
    controller.abort(new Error('Caller stopped request'))
    await assert.rejects(request, /Caller stopped request/)
  })
})

test('database deadline fetch leaves normal response and authorization intact', async () => {
  await withServer((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer local-test-only')
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}')
  }, async url => {
    const response = await createDeadlineFetch({ timeoutMs: 1000 })(url, {
      headers: { Authorization: 'Bearer local-test-only' },
    })
    assert.deepEqual(await response.json(), { ok: true })
  })
})
