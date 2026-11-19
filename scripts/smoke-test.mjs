import { spawn } from 'node:child_process'

const port = Number(process.env.SMOKE_TEST_PORT || 3217)
const baseUrl = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['backend/server.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString() })
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString() })

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function waitForServer() {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited before becoming ready.\n${serverOutput}`)
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(1_000) })
      if (response.ok) return response
    } catch {
      // Retry while the server starts.
    }
    await delay(250)
  }
  throw new Error(`Server did not become ready within 15 seconds.\n${serverOutput}`)
}

try {
  const health = await (await waitForServer()).json()
  if (health.status !== 'ok' || health.service !== 'arrowera-error-mechanism') {
    throw new Error(`Unexpected health response: ${JSON.stringify(health)}`)
  }

  const homepageResponse = await fetch(`${baseUrl}/`)
  if (!homepageResponse.ok) throw new Error(`Frontend returned HTTP ${homepageResponse.status}`)
  const homepage = await homepageResponse.text()
  if (!homepage.includes('<title>ArrowEra · Error Mechanism</title>')) {
    throw new Error('Production frontend title was not found in the served HTML.')
  }

  const faviconResponse = await fetch(`${baseUrl}/arrow.svg`)
  if (!faviconResponse.ok) throw new Error(`Favicon returned HTTP ${faviconResponse.status}`)

  const analysisResponse = await fetch(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      input: "TypeError: Cannot read properties of undefined (reading 'map')",
    }),
  })
  if (!analysisResponse.ok) throw new Error(`Analysis API returned HTTP ${analysisResponse.status}`)
  const analysis = await analysisResponse.json()
  if (!analysis || typeof analysis !== 'object' || Object.keys(analysis).length === 0) {
    throw new Error('Analysis API returned an empty or invalid result.')
  }

  console.log('Production smoke test passed: health, frontend, favicon, and analysis API.')
} finally {
  if (server.exitCode === null) {
    const exited = new Promise((resolve) => server.once('exit', resolve))
    server.kill('SIGTERM')
    await Promise.race([exited, delay(3_000)])
    if (server.exitCode === null) server.kill('SIGKILL')
  }
}
