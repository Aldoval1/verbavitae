/**
 * Verba Vitae — Production Web Server & Real-Time Collaborative Mural Hub
 * 
 * Supports:
 * - High-performance static file serving (HTML, CSS, JS, Media, Fonts)
 * - Video streaming with HTTP 206 Range requests
 * - Sub-20ms WebSocket synchronization for Promethean boards & mobile devices
 * - Persistent mural state storage (JSON on disk with debounced atomic writes)
 * - REST API endpoints for initial state bootstrap & fallback synchronization
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.PORT, 10) || 8080;
const ROOT_DIR = path.resolve(__dirname);
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, 'mural_state.json');

// MIME types dictionary
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

// -------------------------------------------------------------
// In-Memory Mural State & Persistence
// -------------------------------------------------------------
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

let muralState = {
    eventId: 'hispanic-in-17-syllables',
    title: 'Hispanic in 17 Syllables',
    status: 'LIVE', // 'LIVE' | 'CLOSED'
    updatedAt: Date.now(),
    strokes: [],
    images: []
};

// Load saved state from disk if available
if (fs.existsSync(STATE_FILE)) {
    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.strokes)) {
            muralState = Object.assign(muralState, parsed);
            console.log(`[Mural State] Loaded ${muralState.strokes.length} strokes and ${muralState.images.length} images from disk.`);
        }
    } catch (err) {
        console.error('[Mural State] Error reading state file, using fresh state:', err);
    }
} else {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(muralState, null, 2), 'utf8');
        console.log('[Mural State] Initialized state file on disk.');
    } catch (err) {
        console.error('[Mural State] Failed writing initial state file:', err);
    }
}

// Debounced atomic save to prevent file corruption
let saveTimeout = null;
function scheduleSave() {
    muralState.updatedAt = Date.now();
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveTimeout = null;
        const tmpFile = STATE_FILE + '.tmp.' + Date.now();
        const dataStr = JSON.stringify(muralState);
        fs.writeFile(tmpFile, dataStr, 'utf8', (err) => {
            if (err) {
                console.error('[Mural State] Error writing tmp file:', err);
                return;
            }
            fs.rename(tmpFile, STATE_FILE, (renameErr) => {
                if (renameErr) {
                    console.error('[Mural State] Error renaming state file:', renameErr);
                }
            });
        });
    }, 100);
}

// -------------------------------------------------------------
// HTTP Request Helper Utilities
// -------------------------------------------------------------
function sendJson(res, statusCode, data) {
    const jsonStr = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(jsonStr),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(jsonStr);
}

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 50 * 1024 * 1024) { // 50MB limit
                req.destroy();
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                resolve(parsed);
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

// -------------------------------------------------------------
// Static File Serving
// -------------------------------------------------------------
function serveStaticFile(req, res, pathname) {
    // URL normalizations & Clean URL rewrites
    let relativePath = decodeURIComponent(pathname);

    // Default routes
    if (relativePath === '/' || relativePath === '') {
        relativePath = '/index.html';
    } else if (relativePath === '/hispanicin17' || relativePath === '/hispanicin17/') {
        relativePath = '/hispanicin17/index.html';
    } else if (relativePath === '/mural' || relativePath === '/mural/') {
        relativePath = '/mural.html';
    } else if (relativePath === '/verbainmotion' || relativePath === '/verbainmotion/') {
        relativePath = '/verbainmotion/index.html';
    }

    // Resolve safe absolute file path
    let filePath = path.join(ROOT_DIR, relativePath);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    // Check if target exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats) {
            // Try appending .html (Clean URLs like /events -> events.html)
            const htmlPath = filePath + '.html';
            if (fs.existsSync(htmlPath)) {
                return streamFile(req, res, htmlPath, fs.statSync(htmlPath));
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        if (stats.isDirectory()) {
            const indexHtml = path.join(filePath, 'index.html');
            if (fs.existsSync(indexHtml)) {
                return streamFile(req, res, indexHtml, fs.statSync(indexHtml));
            }
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('403 Forbidden: Directory Listing Denied');
            return;
        }

        streamFile(req, res, filePath, stats);
    });
}

function streamFile(req, res, filePath, stats) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // HTTP 206 Partial Content support for videos and large assets
    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm')) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunksize = (end - start) + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stats.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });

        const fileStream = fs.createReadStream(filePath, { start, end });
        fileStream.pipe(res);
        return;
    }

    // Standard static file response with intelligent caching
    const isCacheable = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.svg' || ext === '.woff2' || ext === '.mp4';
    const cacheHeader = isCacheable ? 'public, max-age=86400' : 'no-cache, must-revalidate';

    res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': cacheHeader,
        'Last-Modified': stats.mtime.toUTCString()
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
}

// -------------------------------------------------------------
// Primary HTTP Server
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // ---------------------------------------------------------
    // REST API Routes
    // ---------------------------------------------------------
    if (pathname.startsWith('/api/mural')) {
        // GET /api/mural: Retrieve current live state
        if (req.method === 'GET') {
            const since = parseInt(parsedUrl.searchParams.get('since'), 10) || 0;
            let filteredStrokes = muralState.strokes;
            let filteredImages = muralState.images;

            if (since > 0) {
                filteredStrokes = filteredStrokes.filter(s => (s.createdAt || 0) >= since || (s.updatedAt || 0) >= since);
                filteredImages = filteredImages.filter(img => (img.updatedAt || 0) >= since);
            } else {
                // Return only active (non-deleted) on full sync
                filteredStrokes = filteredStrokes.filter(s => !s.deleted);
                filteredImages = filteredImages.filter(img => !img.deleted);
            }

            return sendJson(res, 200, {
                success: true,
                eventId: muralState.eventId,
                title: muralState.title,
                status: muralState.status,
                updatedAt: muralState.updatedAt,
                strokeCount: filteredStrokes.length,
                strokes: filteredStrokes,
                images: filteredImages
            });
        }

        // POST /api/mural/stroke: Save new stroke
        if (req.method === 'POST' && (pathname === '/api/mural/stroke' || pathname === '/api/mural/stroke/')) {
            try {
                const body = await parseJsonBody(req);
                const stroke = body.stroke || body;
                if (!stroke || !stroke.id || !Array.isArray(stroke.points)) {
                    return sendJson(res, 400, { error: 'Invalid stroke data' });
                }

                stroke.deleted = false;
                stroke.createdAt = stroke.createdAt || Date.now();
                stroke.updatedAt = Date.now();

                // Upsert stroke
                const existingIdx = muralState.strokes.findIndex(s => s.id === stroke.id);
                if (existingIdx !== -1) {
                    muralState.strokes[existingIdx] = stroke;
                } else {
                    muralState.strokes.push(stroke);
                }

                scheduleSave();

                // Broadcast to all WebSocket clients
                broadcastToAll({
                    type: 'stroke_add',
                    stroke: stroke
                });

                return sendJson(res, 200, { success: true, id: stroke.id });
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }

        // POST /api/mural/stroke/delete: Erase stroke
        if (req.method === 'POST' && (pathname === '/api/mural/stroke/delete' || pathname === '/api/mural/stroke/delete/')) {
            try {
                const body = await parseJsonBody(req);
                const strokeId = body.id || body.strokeId;
                if (!strokeId) {
                    return sendJson(res, 400, { error: 'Missing stroke id' });
                }

                const idx = muralState.strokes.findIndex(s => s.id === strokeId);
                if (idx !== -1) {
                    muralState.strokes.splice(idx, 1);
                    scheduleSave();
                }

                broadcastToAll({
                    type: 'stroke_delete',
                    id: strokeId
                });

                return sendJson(res, 200, { success: true, id: strokeId });
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }

        // POST /api/mural/image: Save or update image
        if (req.method === 'POST' && (pathname === '/api/mural/image' || pathname === '/api/mural/image/')) {
            try {
                const body = await parseJsonBody(req);
                const image = body.image || body;
                if (!image || !image.id || !image.url) {
                    return sendJson(res, 400, { error: 'Invalid image data' });
                }

                image.deleted = false;
                image.updatedAt = Date.now();

                const existingIdx = muralState.images.findIndex(img => img.id === image.id);
                if (existingIdx !== -1) {
                    Object.assign(muralState.images[existingIdx], image);
                } else {
                    muralState.images.push(image);
                }

                scheduleSave();

                broadcastToAll({
                    type: 'image_update',
                    image: image
                });

                return sendJson(res, 200, { success: true, id: image.id });
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }

        // POST /api/mural/image/delete: Erase image
        if (req.method === 'POST' && (pathname === '/api/mural/image/delete' || pathname === '/api/mural/image/delete/')) {
            try {
                const body = await parseJsonBody(req);
                const imageId = body.id || body.imageId;
                if (!imageId) {
                    return sendJson(res, 400, { error: 'Missing image id' });
                }

                const idx = muralState.images.findIndex(img => img.id === imageId);
                if (idx !== -1) {
                    muralState.images.splice(idx, 1);
                    scheduleSave();
                }

                broadcastToAll({
                    type: 'image_delete',
                    id: imageId
                });

                return sendJson(res, 200, { success: true, id: imageId });
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }

        // POST /api/mural/status: Update event status ('LIVE' | 'CLOSED')
        if (req.method === 'POST' && (pathname === '/api/mural/status' || pathname === '/api/mural/status/')) {
            try {
                const body = await parseJsonBody(req);
                const newStatus = body.status === 'CLOSED' ? 'CLOSED' : 'LIVE';
                muralState.status = newStatus;
                scheduleSave();

                broadcastToAll({
                    type: 'status_change',
                    status: newStatus
                });

                return sendJson(res, 200, { success: true, status: newStatus });
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }

        // POST /api/mural/clear: Admin clear canvas
        if (req.method === 'POST' && (pathname === '/api/mural/clear' || pathname === '/api/mural/clear/')) {
            try {
                muralState.strokes = [];
                muralState.images = [];
                scheduleSave();

                broadcastToAll({
                    type: 'clear'
                });

                return sendJson(res, 200, { success: true, message: 'Mural cleared.' });
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }

        return sendJson(res, 404, { error: 'API route not found' });
    }

    // Static site serving fallback
    serveStaticFile(req, res, pathname);
});

// -------------------------------------------------------------
// Real-Time WebSocket Server
// -------------------------------------------------------------
const wss = new WebSocketServer({ server });

function broadcastToAll(messageObj, exceptWs = null) {
    const payload = JSON.stringify(messageObj);
    wss.clients.forEach(client => {
        if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`[WebSocket] New client connected from ${clientIp}. Total active clients: ${wss.clients.size}`);

    // Send immediate initial state synchronization payload
    const activeStrokes = muralState.strokes.filter(s => !s.deleted);
    const activeImages = muralState.images.filter(img => !img.deleted);

    ws.send(JSON.stringify({
        type: 'sync',
        status: muralState.status,
        strokes: activeStrokes,
        images: activeImages,
        serverTime: Date.now()
    }));

    // Handle incoming client messages
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());

            if (msg.type === 'ping') {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
                return;
            }

            if (msg.type === 'stroke_add' && msg.stroke) {
                const stroke = msg.stroke;
                stroke.deleted = false;
                stroke.createdAt = stroke.createdAt || Date.now();
                stroke.updatedAt = Date.now();

                // Prevent duplicates
                const idx = muralState.strokes.findIndex(s => s.id === stroke.id);
                if (idx !== -1) {
                    muralState.strokes[idx] = stroke;
                } else {
                    muralState.strokes.push(stroke);
                }

                scheduleSave();

                // Relay immediately to all other connected clients
                broadcastToAll({
                    type: 'stroke_add',
                    stroke: stroke
                }, ws);
            } else if (msg.type === 'stroke_delete' && msg.id) {
                const idx = muralState.strokes.findIndex(s => s.id === msg.id);
                if (idx !== -1) {
                    muralState.strokes.splice(idx, 1);
                    scheduleSave();
                }

                broadcastToAll({
                    type: 'stroke_delete',
                    id: msg.id
                }, ws);
            } else if (msg.type === 'image_update' && msg.image) {
                const image = msg.image;
                image.deleted = false;
                image.updatedAt = Date.now();

                const idx = muralState.images.findIndex(img => img.id === image.id);
                if (idx !== -1) {
                    Object.assign(muralState.images[idx], image);
                } else {
                    muralState.images.push(image);
                }

                scheduleSave();

                broadcastToAll({
                    type: 'image_update',
                    image: image
                }, ws);
            } else if (msg.type === 'image_delete' && msg.id) {
                const idx = muralState.images.findIndex(img => img.id === msg.id);
                if (idx !== -1) {
                    muralState.images.splice(idx, 1);
                    scheduleSave();
                }

                broadcastToAll({
                    type: 'image_delete',
                    id: msg.id
                }, ws);
            }
        } catch (err) {
            console.error('[WebSocket] Message handling error:', err);
        }
    });

    ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected. Total active clients: ${wss.clients.size}`);
    });

    ws.on('error', (err) => {
        console.warn('[WebSocket] Client socket error:', err.message);
    });
});

// Periodic heartbeat interval to keep connections alive across mobile & proxies (Cloudflare, Railway)
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (!ws.isAlive) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 25000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` Verba Vitae Production & Realtime Mural Server`);
    console.log(` Listening on port: ${PORT}`);
    console.log(` http://localhost:${PORT}/hispanicin17`);
    console.log(` WebSocket mounted at: ws://localhost:${PORT}/ws/mural`);
    console.log(`=======================================================`);
});
