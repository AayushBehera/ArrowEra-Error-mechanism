import { createServer as createHttpServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyze } from '../src/engine/analyzer.ts'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DIST = resolve(ROOT, 'dist')
const MAX_BODY_BYTES = 64 * 1024
const MAX_INPUT_LENGTH = 50_000
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30
const rateLimits = new Map()

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendJson(response, status, payload, method = 'GET') {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  response.end(method === 'HEAD' ? undefined : body)
}

function applySecurityHeaders(response) {
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('x-frame-options', 'DENY')
  response.setHeader('referrer-policy', 'strict-origin-when-cross-origin')
  response.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()')
}

function isRateLimited(request) {
  const forwarded = request.headers['x-forwarded-for']
  const address = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null)
    || request.socket.remoteAddress
    || 'unknown'
  const now = Date.now()
  const current = rateLimits.get(address)

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(address, { startedAt: now, count: 1 })
    if (rateLimits.size > 1_000) {
      for (const [key, value] of rateLimits) {
        if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) rateLimits.delete(key)
      }
    }
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX
}

async function readJson(request) {
  const contentType = request.headers['content-type'] || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return { error: { status: 415, message: 'Content-Type must be application/json.' } }
  }

  const declaredLength = Number(request.headers['content-length'])
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { error: { status: 413, message: 'Request body exceeds the 64 KB limit.' } }
  }

  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      return { error: { status: 413, message: 'Request body exceeds the 64 KB limit.' } }
    }
    chunks.push(chunk)
  }

  try {
    return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  } catch {
    return { error: { status: 400, message: 'Request body must contain valid JSON.' } }
  }
}

async function writeStaticFile(target, response, method, cacheControl) {
  const body = await readFile(target)
  response.writeHead(200, {
    'content-type': MIME_TYPES[extname(target)] || 'application/octet-stream',
    'content-length': body.byteLength,
    'cache-control': cacheControl,
  })
  response.end(method === 'HEAD' ? undefined : body)
}

async function serveStatic(pathname, response, method) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    sendJson(response, 400, { error: 'Invalid URL path.' }, method)
    return
  }

  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '')
  const target = resolve(DIST, relativePath)
  if (target !== DIST && !target.startsWith(DIST + sep)) {
    sendJson(response, 403, { error: 'Forbidden.' }, method)
    return
  }

  try {
    let resolvedTarget = target
    const details = await stat(resolvedTarget)
    if (details.isDirectory()) resolvedTarget = resolve(resolvedTarget, 'index.html')
    const isHtml = resolvedTarget.endsWith('index.html')
    const isHashedAsset = /-[A-Za-z0-9_-]{8,}\./.test(resolvedTarget)
    await writeStaticFile(
      resolvedTarget,
      response,
      method,
      isHtml ? 'no-cache' : isHashedAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    )
  } catch {
    // Missing asset requests must not silently receive index.html with a 200 response.
    if (extname(relativePath) || relativePath.startsWith('assets/')) {
      sendJson(response, 404, { error: 'Static asset not found.' }, method)
      return
    }

    try {
      await writeStaticFile(resolve(DIST, 'index.html'), response, method, 'no-cache')
    } catch {
      sendJson(response, 503, { error: 'Frontend build is unavailable. Run npm run build first.' }, method)
    }
  }
}

export function createAppServer() {
  return createHttpServer(async (request, response) => {
    applySecurityHeaders(response)

    try {
      const url = new URL(request.url || '/', 'http://localhost')
      const { pathname } = url
      const method = request.method || 'GET'

      if (pathname === '/api/health' && method === 'GET') {
        sendJson(response, 200, {
          status: 'ok',
          service: 'arrowera-error-mechanism',
          timestamp: new Date().toISOString(),
        })
        return
      }

      if (pathname === '/api/analyze' && method === 'POST') {
        if (isRateLimited(request)) {
          sendJson(response, 429, { error: 'Too many analysis requests. Please retry shortly.' })
          return
        }

        const parsed = await readJson(request)
        if (parsed.error) {
          sendJson(response, parsed.error.status, { error: parsed.error.message })
          return
        }

        const input = parsed.value?.input
        if (typeof input !== 'string') {
          sendJson(response, 400, { error: 'The input field must be a string.' })
          return
        }
        if (!input.trim()) {
          sendJson(response, 400, { error: 'Please provide a non-empty error message.' })
          return
        }
        if (input.length > MAX_INPUT_LENGTH) {
          sendJson(response, 413, { error: 'Error input exceeds the 50,000 character limit.' })
          return
        }

        sendJson(response, 200, analyze(input))
        return
      }

      if (pathname.startsWith('/api/')) {
        sendJson(response, 404, { error: 'API route not found.' }, method)
        return
      }

      if (method !== 'GET' && method !== 'HEAD') {
        sendJson(response, 405, { error: 'Method not allowed.' })
        return
      }

      await serveStatic(pathname, response, method)
    } catch (error) {
      console.error('Request failed:', error)
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined)
        return
      }
      sendJson(response, 500, { error: 'The server could not complete this request.' })
    }
  })
}

const isDirectRun = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  const port = Number.parseInt(process.env.PORT || '3001', 10)
  const host = process.env.HOST || '0.0.0.0'
  const server = createAppServer()

  server.listen(port, host, () => {
    console.log(\`ArrowEra server listening on http://\${host}:\${port}\`)
  })

  const shutdown = () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
