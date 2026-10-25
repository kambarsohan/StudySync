import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const projectDir = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(projectDir, 'dist')
const healthPath = '/_health'
const port = Number(process.env.PORT ?? 3000)
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.')
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' })
    response.end('Method Not Allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  } catch {
    response.writeHead(400, { 'Cache-Control': 'no-store' })
    response.end('Bad Request')
    return
  }

  if (pathname === healthPath) {
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    })
    response.end(request.method === 'HEAD' ? undefined : 'ok')
    return
  }

  const relativePath = normalize(pathname).replace(/^[/\\]+/, '')
  let candidate = resolve(distDir, relativePath || 'index.html')
  if (candidate !== distDir && !candidate.startsWith(`${distDir}${sep}`)) {
    response.writeHead(403, { 'Cache-Control': 'no-store' })
    response.end('Forbidden')
    return
  }

  try {
    let info = await stat(candidate)
    if (info.isDirectory()) {
      candidate = join(candidate, 'index.html')
      info = await stat(candidate)
    }
    if (!info.isFile()) throw new Error('Not a regular file')
  } catch {
    if (extname(pathname)) {
      response.writeHead(404, { 'Cache-Control': 'no-store' })
      response.end('Not Found')
      return
    }
    candidate = join(distDir, 'index.html')
  }

  try {
    const body = await readFile(candidate)
    const extension = extname(candidate).toLowerCase()
    const isHashedAsset = relativePath.startsWith('assets/') && /-[A-Za-z0-9_-]{8,}\./.test(relativePath)
    response.writeHead(200, {
      'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Length': body.length,
      'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    })
    response.end(request.method === 'HEAD' ? undefined : body)
  } catch (error) {
    console.error('StudySync static response failed:', error instanceof Error ? error.message : 'unknown error')
    response.writeHead(500, { 'Cache-Control': 'no-store' })
    response.end('Internal Server Error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`StudySync listening on 0.0.0.0:${port}`)
})
