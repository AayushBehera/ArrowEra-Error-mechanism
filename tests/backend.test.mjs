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

test('GET /api/health returns service status', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`)
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(body.status, 'ok')
    assert.equal(body.service, 'arrowera-error-mechanism')
    assert.ok(body.timestamp)
  })
})

test('POST /api/analyze returns the existing deterministic engine result', async () => {
  await withServer(async (baseUrl) => {
    const input = 'TypeError: Cannot read properties of undefined (reading map)\n at App (src/App.tsx:12:3)'
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input }),
    })
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
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: '   ' }),
    })
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /non-empty/)
  })
})

test('POST /api/analyze rejects non-string input', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: 42 }),
    })
    assert.equal(response.status, 400)
  })
})

test('POST /api/analyze rejects unsupported content types', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello',
    })
    assert.equal(response.status, 415)
  })
})

test('unknown API routes return JSON 404', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/unknown`)
    assert.equal(response.status, 404)
    assert.equal(typeof (await response.json()).error, 'string')
  })
})

test('GET /api/observability/traces returns bounded request traces', async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`)
    const traceId = health.headers.get('x-trace-id')
    assert.ok(traceId)
    const response = await fetch(`${baseUrl}/api/observability/traces?limit=10`)
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.ok(Array.isArray(body.traces))
    assert.ok(body.traces.some((trace) => trace.traceId === traceId))
  })
})

test('GET /api/integrations/status never exposes provider credentials', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/integrations/status`)
    const body = await response.json()
    assert.equal(response.status, 200)
    assert.equal(typeof body.render.configured, 'boolean')
    assert.equal(typeof body.vercel.configured, 'boolean')
    assert.equal(JSON.stringify(body).includes('API_KEY'), false)
  })
})

test('workflow jobs endpoint validates repository coordinates', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/project/workflows/123/jobs?repository=invalid`)
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /owner\/name/)
  })
})


test('POST /api/analyze rejects malformed JSON', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    })
    assert.equal(response.status, 400)
    assert.match((await response.json()).error, /valid JSON/)
  })
})

test('POST /api/analyze rejects declared bodies over 64 KB', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: 'x'.repeat(70 * 1024) }),
    })
    assert.equal(response.status, 413)
  })
})

test('POST /api/analyze rejects inputs over 50,000 characters', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: 'x'.repeat(50_001) }),
    })
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
      lastResponse = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ input: 'TypeError: x is undefined' }),
      })
    }
    assert.equal(lastResponse.status, 429)
    assert.match((await lastResponse.json()).error, /Too many/)
  })
})
