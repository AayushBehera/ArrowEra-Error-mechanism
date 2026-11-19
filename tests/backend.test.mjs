import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAppServer } from '../backend/server.mjs'

async function withServer(run) {
  const server = createAppServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  try {
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

async function postAnalysis(baseUrl, body, headers = { 'content-type': 'application/json' }) {
  return fetch(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers,
    body,
  })
}

test('GET /api/health returns service status and security headers', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`)
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(body.status, 'ok')
    assert.equal(body.service, 'arrowera-error-mechanism')
    assert.ok(body.timestamp)
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
  })
})

test('POST /api/analyze returns the existing deterministic engine result', async () => {
  await withServer(async (baseUrl) => {
    const input = 'TypeError: Cannot read properties of undefined (reading map)\n at App (src/App.tsx:12:3)'
    const response = await postAnalysis(baseUrl, JSON.stringify({ input }))
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(body.input, input)
    assert.equal(body.detectedLanguage, 'typescript')
    assert.equal(body.primary?.rule.id, 'js-null-ref')
    assert.ok(Array.isArray(body.reasoning))
  })
})

test('POST /api/analyze rejects empty input', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalysis(baseUrl, JSON.stringify({ input: '   ' }))
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /non-empty/)
  })
})

test('POST /api/analyze rejects non-string input', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalysis(baseUrl, JSON.stringify({ input: 42 }))
    assert.equal(response.status, 400)
  })
})

test('POST /api/analyze rejects unsupported content types', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalysis(baseUrl, 'hello', { 'content-type': 'text/plain' })
    assert.equal(response.status, 415)
  })
})

test('POST /api/analyze rejects malformed JSON', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalysis(baseUrl, '{invalid')
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /valid JSON/)
  })
})

test('POST /api/analyze rejects inputs over 50,000 characters', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalysis(baseUrl, JSON.stringify({ input: 'x'.repeat(50_001) }))
    assert.equal(response.status, 413)
  })
})

test('POST /api/analyze rejects bodies over 64 KB', async () => {
  await withServer(async (baseUrl) => {
    const response = await postAnalysis(baseUrl, JSON.stringify({ input: 'x'.repeat(70 * 1024) }))
    assert.equal(response.status, 413)
  })
})

test('POST /api/analyze rate limits a client after 30 requests per minute', async () => {
  await withServer(async (baseUrl) => {
    const headers = {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.44',
    }
    let lastResponse
    for (let index = 0; index < 31; index += 1) {
      lastResponse = await postAnalysis(baseUrl, JSON.stringify({ input: 'TypeError: x is undefined' }), headers)
    }
    assert.equal(lastResponse.status, 429)
    assert.match((await lastResponse.json()).error, /Too many/)
  })
})

test('unknown API routes return JSON 404', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`)
    assert.equal(response.status, 404)
    assert.equal(typeof (await response.json()).error, 'string')
  })
})
