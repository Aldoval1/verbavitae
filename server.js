/**
 * Verba Vitae — Hardened Production Static Web Server
 *
 * Supports:
 * - High-performance static file serving (HTML, CSS, JS, Media, Fonts)
 * - Video streaming with HTTP 206 Range requests
 * - Strict path traversal and sensitive file protection
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const ROOT_DIR = path.resolve(__dirname);

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
};

// Block sensitive server/config files from public web access
const BLOCKED_FILES = new Set([
    'server.js',
    'package.json',
    'package-lock.json',
    'firebase.json',
    'firestore.rules',
    'storage.rules',
    'cname',
    '.gitignore'
]);

function isPathAllowed(relativePath, resolvedPath) {
    // Ensure resolved path is strictly inside ROOT_DIR
    const rootWithSep = ROOT_DIR.endsWith(path.sep) ? ROOT_DIR : ROOT_DIR + path.sep;
    if (resolvedPath !== ROOT_DIR && !resolvedPath.startsWith(rootWithSep)) {
        return false;
    }

    const normalizedRel = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const segments = normalizedRel.split('/');

    for (const seg of segments) {
        if (!seg) continue;
        // Block dotfiles/dotfolders (.git, .env, etc.) and node_modules
        if (seg.startsWith('.') || seg.toLowerCase() === 'node_modules') {
            return false;
        }
    }

    const baseName = path.basename(resolvedPath).toLowerCase();
    if (BLOCKED_FILES.has(baseName)) {
        return false;
    }

    return true;
}

function serveStaticFile(req, res, pathname) {
    let relativePath;
    try {
        relativePath = decodeURIComponent(pathname);
    } catch (_) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('400 Bad Request');
        return;
    }

    if (relativePath === '/' || relativePath === '') {
        relativePath = '/index.html';
    } else if (relativePath === '/verbainmotion' || relativePath === '/verbainmotion/') {
        relativePath = '/verbainmotion.html';
    } else if (relativePath === '/speech' || relativePath === '/speech/') {
        relativePath = '/speech.html';
    }

    const filePath = path.resolve(ROOT_DIR, '.' + relativePath);

    if (!isPathAllowed(relativePath, filePath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats) {
            const htmlPath = filePath + '.html';
            if (isPathAllowed(relativePath + '.html', htmlPath) && fs.existsSync(htmlPath)) {
                return streamFile(req, res, htmlPath, fs.statSync(htmlPath));
            }
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        if (stats.isDirectory()) {
            const indexHtml = path.join(filePath, 'index.html');
            if (fs.existsSync(indexHtml)) {
                return streamFile(req, res, indexHtml, fs.statSync(indexHtml));
            }
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('403 Forbidden');
            return;
        }

        streamFile(req, res, filePath, stats);
    });
}

function streamFile(req, res, filePath, stats) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm')) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

        if (isNaN(start) || isNaN(end) || start > end || end >= stats.size) {
            res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` });
            res.end();
            return;
        }

        const chunksize = (end - start) + 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff'
        });

        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
    }

    const isCacheable = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff2', '.mp4'].includes(ext);
    const cacheHeader = isCacheable ? 'public, max-age=86400' : 'no-cache, must-revalidate';

    res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': cacheHeader,
        'Last-Modified': stats.mtime.toUTCString(),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN'
    });

    fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('405 Method Not Allowed');
        return;
    }
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    serveStaticFile(req, res, parsedUrl.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Verba Vitae server listening on http://localhost:${PORT}`);
});
