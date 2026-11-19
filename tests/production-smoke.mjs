import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAppServer } from '../backend/server.mjs'

test('production server serves the built frontend, assets and analysis API', async () => {
  const server = createAppServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  try {
    const pageResponse = await fetch(baseUrl)
    assert.equal(pageResponse.status, 200)
    assert.match(pageResponse.headers.get('content-type') || '', /text\/html/)
    const html = await pageResponse.text()
    assert.match(html, /<div id="root"/)

    const scriptPath = html.match(/src="([^"]+\.js)"/)?.[1]
    assert.ok(scriptPath, 'production HTML should reference a bundled JavaScript file')
    const scriptResponse = await fetch(new URL(scriptPath, baseUrl))
    assert.equal(scriptResponse.status, 200)
    assert.match(scriptResponse.headers.get('content-type') || '', /javascript/)

    const cssPath = html.match(/href="([^"]+\.css)"/)?.[1]
    if (cssPath) {
      const cssResponse = await fetch(new URL(cssPath, baseUrl))
      assert.equal(cssResponse.status, 200)
      assert.match(cssResponse.headers.get('content-type') || '', /text\/css/)
    }

    const missingAsset = await fetch(`${baseUrl}/assets/missing-file.js`)
    assert.equal(missingAsset.status, 404)

    const headResponse = await fetch(baseUrl, { method: 'HEAD' })
    assert.equal(headResponse.status, 200)
    assert.equal(await headResponse.text(), '')

    const healthResponse = await fetch(`${baseUrl}/api/health`)
    assert.equal(healthResponse.status, 200)
    assert.equal((await healthResponse.json()).status, 'ok')

    const input = 'TypeError: Cannot read properties of undefined (reading map)'
    const analysisResponse = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input }),
    })
    assert.equal(analysisResponse.status, 200)
    assert.equal((await analysisResponse.json()).input, input)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})
