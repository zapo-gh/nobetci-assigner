import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { join, extname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT || 4173
const DIST_DIR = resolve(__dirname, 'dist')

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.csv': 'text/csv',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain'
}

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

function serveFile(filePath, res) {
  if (!existsSync(filePath)) {
    return false
  }

  try {
    const stats = statSync(filePath)
    if (!stats.isFile()) {
      return false
    }

    const content = readFileSync(filePath)
    const mimeType = getMimeType(filePath)

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': content.length,
      'Cache-Control': mimeType.includes('html') 
        ? 'no-cache, no-store, must-revalidate' 
        : 'public, max-age=31536000, immutable'
    })

    res.end(content)
    return true
  } catch (error) {
    console.error(`Error serving file ${filePath}:`, error)
    return false
  }
}

function serveIndexHtml(res) {
  const indexPath = join(DIST_DIR, 'index.html')
  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath, 'utf-8')
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(content),
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    })
    res.end(content)
    return true
  }
  return false
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let filePath = url.pathname

  // Remove leading slash and resolve path
  if (filePath === '/' || filePath === '') {
    filePath = 'index.html'
  } else {
    filePath = filePath.slice(1) // Remove leading slash
  }

  const fullPath = resolve(DIST_DIR, filePath)
  const normalizedDistDir = resolve(DIST_DIR)

  // Security: Ensure file is within dist directory
  if (!fullPath.startsWith(normalizedDistDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('Forbidden')
    return
  }

  // Try to serve the requested file
  if (serveFile(fullPath, res)) {
    return
  }

  // If file doesn't exist and it's not a static asset, serve index.html (SPA routing)
  const ext = extname(filePath).toLowerCase()
  const isStaticAsset = ['.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.pdf', '.csv'].includes(ext)

  if (isStaticAsset) {
    // Static asset not found - return 404
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('404 Not Found')
  } else {
    // For routes, serve index.html (SPA fallback)
    if (!serveIndexHtml(res)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('404 Not Found - index.html not found')
    }
  }
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Serving files from: ${DIST_DIR}`)
})

server.on('error', (error) => {
  console.error('Server error:', error)
  process.exit(1)
})

