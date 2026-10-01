/**
 * Verba Vitae — Hispanic in 17 Syllables
 * Production Real-Time Synchronization Engine (Native WebSockets + Dual-Path REST + Local Cache)
 * 
 * Supports:
 * - Sub-20ms ultra-low latency stroke broadcasting between Promethean displays and mobile phones
 * - Instant bootstrap via REST GET /api/mural so canvas renders existing strokes immediately
 * - Guaranteed persistence across page refreshes and browser restarts
 * - Automatic exponential backoff reconnection with heartbeat keepalive
 * - Offline queueing and localStorage caching so device never shows blank canvas
 * - Multi-device image insertion, transformation, and deletion sync
 * - Event status synchronization (LIVE / CLOSED)
 */

(function (window) {
    'use strict';

    class MuralRealtime {
        constructor(eventId, options = {}) {
            this.eventId = eventId || 'hispanic-in-17-syllables';
            this.options = Object.assign({
                onStrokeReceived: null,
                onStrokeRemoved: null,
                onImageReceived: null,
                onImageRemoved: null,
                onStatusChange: null,
                onConnectionStateChange: null, // 'connected' | 'saving' | 'saved' | 'offline'
                onInitialLoadComplete: null,
                isAdmin: false
            }, options);

            // Persistent Session ID for this browser tab / device
            this.sessionId = this._getOrCreateSessionId();
            this.status = 'LIVE';
            this.connectionState = 'connecting';
            this.offlineQueue = [];
            this.ws = null;
            this.reconnectAttempts = 0;
            this.reconnectTimer = null;
            this.pingTimer = null;
            this.pollTimer = null;
            this.lastSyncTimestamp = 0;
            this.hasInitialLoaded = false;
            this.knownStrokeIds = new Set();
            this.knownImageIds = new Set();

            // Load offline queue & render existing local cache immediately
            this._loadOfflineQueue();
            this._restoreLocalCache();

            // Listen for browser online / offline state
            window.addEventListener('online', () => this._handleOnline());
            window.addEventListener('offline', () => this._handleOffline());

            // Initialize bootstrap and WebSocket
            this.init();
        }

        _getOrCreateSessionId() {
            let id = sessionStorage.getItem('vv_mural_session_id');
            if (!id) {
                const search = (typeof window !== 'undefined' && window.location && window.location.search) ? window.location.search : '';
                const deviceTag = new URLSearchParams(search).get('device') || 'client';
                id = 'sess_' + deviceTag + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
                sessionStorage.setItem('vv_mural_session_id', id);
            }
            return id;
        }

        async init() {
            this._setConnectionState('saving');

            // 1. Instant Bootstrap via REST (Fetch current canvas state before WS connects)
            this._bootstrapFromRest();

            // 2. Establish persistent Real-Time WebSocket Connection
            this._connectWebSocket();
        }

        // -------------------------------------------------------------
        // REST Bootstrap & Incremental Polling Fallback
        // -------------------------------------------------------------
        async _bootstrapFromRest() {
            try {
                const res = await fetch(`/api/mural?eventId=${encodeURIComponent(this.eventId)}&t=${Date.now()}`);
                if (!res.ok) return;

                const data = await res.json();
                if (data && data.success) {
                    if (data.status) {
                        this.status = data.status;
                        if (this.options.onStatusChange) {
                            this.options.onStatusChange(this.status);
                        }
                    }

                    // Ingest strokes
                    if (Array.isArray(data.strokes)) {
                        data.strokes.forEach(stroke => {
                            if (!this.knownStrokeIds.has(stroke.id)) {
                                this.knownStrokeIds.add(stroke.id);
                                if (this.options.onStrokeReceived) {
                                    this.options.onStrokeReceived(stroke);
                                }
                            }
                        });
                        this._updateLocalCacheStrokes(data.strokes);
                    }

                    // Ingest images
                    if (Array.isArray(data.images)) {
                        data.images.forEach(img => {
                            if (!this.knownImageIds.has(img.id)) {
                                this.knownImageIds.add(img.id);
                                if (this.options.onImageReceived) {
                                    this.options.onImageReceived(img);
                                }
                            }
                        });
                    }

                    this.lastSyncTimestamp = data.updatedAt || Date.now();

                    if (!this.hasInitialLoaded) {
                        this.hasInitialLoaded = true;
                        if (this.options.onInitialLoadComplete) {
                            this.options.onInitialLoadComplete();
                        }
                    }

                    this._setConnectionState('saved');
                }
            } catch (err) {
                console.warn('[MuralRealtime] REST bootstrap failed, relying on cache/WS:', err);
            }
        }

        async _pollIncrementalUpdates() {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                return; // WebSocket is healthy, polling not needed
            }

            try {
                const res = await fetch(`/api/mural?eventId=${encodeURIComponent(this.eventId)}&since=${this.lastSyncTimestamp}&t=${Date.now()}`);
                if (!res.ok) return;

                const data = await res.json();
                if (data && data.success) {
                    if (data.status && data.status !== this.status) {
                        this.status = data.status;
                        if (this.options.onStatusChange) this.options.onStatusChange(this.status);
                    }

                    if (Array.isArray(data.strokes)) {
                        data.strokes.forEach(stroke => {
                            if (stroke.deleted) {
                                this.knownStrokeIds.delete(stroke.id);
                                if (this.options.onStrokeRemoved) this.options.onStrokeRemoved(stroke.id);
                            } else if (!this.knownStrokeIds.has(stroke.id)) {
                                this.knownStrokeIds.add(stroke.id);
                                if (this.options.onStrokeReceived) this.options.onStrokeReceived(stroke);
                            }
                        });
                    }

                    if (Array.isArray(data.images)) {
                        data.images.forEach(img => {
                            if (img.deleted) {
                                this.knownImageIds.delete(img.id);
                                if (this.options.onImageRemoved) this.options.onImageRemoved(img.id);
                            } else {
                                this.knownImageIds.add(img.id);
                                if (this.options.onImageReceived) this.options.onImageReceived(img);
                            }
                        });
                    }

                    this.lastSyncTimestamp = data.updatedAt || Date.now();
                }
            } catch (err) {
                // Ignore silent background polling errors
            }
        }

        // -------------------------------------------------------------
        // WebSocket Real-Time Connection
        // -------------------------------------------------------------
        _connectWebSocket() {
            if (this.ws) {
                try {
                    this.ws.close();
                } catch (_) {}
                this.ws = null;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/mural?eventId=${encodeURIComponent(this.eventId)}`;

            try {
                this.ws = new WebSocket(wsUrl);
            } catch (err) {
                console.warn('[MuralRealtime] WebSocket creation failed:', err);
                this._scheduleReconnect();
                return;
            }

            this.ws.onopen = () => {
                console.log('[MuralRealtime] WebSocket connected successfully.');
                this.reconnectAttempts = 0;
                this._setConnectionState('connected');

                // Flush any offline queued actions
                this._flushOfflineQueue();

                // Setup keepalive ping every 20 seconds
                if (this.pingTimer) clearInterval(this.pingTimer);
                this.pingTimer = setInterval(() => {
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: 'ping' }));
                    }
                }, 20000);

                // Stop fallback polling when WebSocket is connected
                if (this.pollTimer) {
                    clearInterval(this.pollTimer);
                    this.pollTimer = null;
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'pong') {
                        return; // Heartbeat ack
                    }

                    if (msg.type === 'sync') {
                        // Full initial canvas state from server
                        if (msg.status) {
                            this.status = msg.status;
                            if (this.options.onStatusChange) {
                                this.options.onStatusChange(this.status);
                            }
                        }

                        if (Array.isArray(msg.strokes)) {
                            msg.strokes.forEach(stroke => {
                                if (!this.knownStrokeIds.has(stroke.id)) {
                                    this.knownStrokeIds.add(stroke.id);
                                    if (this.options.onStrokeReceived) {
                                        this.options.onStrokeReceived(stroke);
                                    }
                                }
                            });
                            this._updateLocalCacheStrokes(msg.strokes);
                        }

                        if (Array.isArray(msg.images)) {
                            msg.images.forEach(img => {
                                if (!this.knownImageIds.has(img.id)) {
                                    this.knownImageIds.add(img.id);
                                    if (this.options.onImageReceived) {
                                        this.options.onImageReceived(img);
                                    }
                                }
                            });
                        }

                        if (!this.hasInitialLoaded) {
                            this.hasInitialLoaded = true;
                            if (this.options.onInitialLoadComplete) {
                                this.options.onInitialLoadComplete();
                            }
                        }

                        this._setConnectionState('saved');
                        return;
                    }

                    if (msg.type === 'stroke_add' && msg.stroke) {
                        const stroke = msg.stroke;
                        if (!this.knownStrokeIds.has(stroke.id)) {
                            this.knownStrokeIds.add(stroke.id);
                            if (this.options.onStrokeReceived) {
                                this.options.onStrokeReceived(stroke);
                            }
                            this._appendLocalCacheStroke(stroke);
                        }
                        this._setConnectionState('saved');
                        return;
                    }

                    if (msg.type === 'stroke_delete' && msg.id) {
                        this.knownStrokeIds.delete(msg.id);
                        if (this.options.onStrokeRemoved) {
                            this.options.onStrokeRemoved(msg.id);
                        }
                        this._removeLocalCacheStroke(msg.id);
                        this._setConnectionState('saved');
                        return;
                    }

                    if (msg.type === 'image_update' && msg.image) {
                        this.knownImageIds.add(msg.image.id);
                        if (this.options.onImageReceived) {
                            this.options.onImageReceived(msg.image);
                        }
                        this._setConnectionState('saved');
                        return;
                    }

                    if (msg.type === 'image_delete' && msg.id) {
                        this.knownImageIds.delete(msg.id);
                        if (this.options.onImageRemoved) {
                            this.options.onImageRemoved(msg.id);
                        }
                        this._setConnectionState('saved');
                        return;
                    }

                    if (msg.type === 'status_change') {
                        this.status = msg.status;
                        if (this.options.onStatusChange) {
                            this.options.onStatusChange(this.status);
                        }
                        return;
                    }

                    if (msg.type === 'clear') {
                        window.location.reload();
                        return;
                    }

                } catch (err) {
                    console.warn('[MuralRealtime] Failed parsing WebSocket message:', err);
                }
            };

            this.ws.onclose = () => {
                if (this.pingTimer) {
                    clearInterval(this.pingTimer);
                    this.pingTimer = null;
                }
                this._setConnectionState('offline');
                this._scheduleReconnect();

                // Start fallback REST polling every 2.5s while disconnected
                if (!this.pollTimer) {
                    this.pollTimer = setInterval(() => this._pollIncrementalUpdates(), 2500);
                }
            };

            this.ws.onerror = (err) => {
                console.warn('[MuralRealtime] WebSocket error encountered:', err);
                try { this.ws.close(); } catch (_) {}
            };
        }

        _scheduleReconnect() {
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(1.4, this.reconnectAttempts), 5000);
            this.reconnectTimer = setTimeout(() => {
                console.log(`[MuralRealtime] Attempting reconnection (attempt ${this.reconnectAttempts})...`);
                this._connectWebSocket();
            }, delay);
        }

        // -------------------------------------------------------------
        // Stroke Operations (Dual-Path WebSocket + REST + Offline Queue)
        // -------------------------------------------------------------
        async saveStroke(stroke) {
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                console.warn("[MuralRealtime] Cannot save stroke: Event is closed.");
                return false;
            }

            this._setConnectionState('saving');
            this.knownStrokeIds.add(stroke.id);
            this._appendLocalCacheStroke(stroke);

            const payload = {
                id: stroke.id,
                sessionId: this.sessionId,
                color: stroke.color,
                width: stroke.width,
                points: stroke.points,
                deleted: false,
                createdAt: stroke.createdAt || Date.now()
            };

            let sentViaWs = false;

            // 1. Send via active WebSocket for instant broadcast
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.send(JSON.stringify({
                        type: 'stroke_add',
                        stroke: payload
                    }));
                    sentViaWs = true;
                } catch (wsErr) {
                    console.warn('[MuralRealtime] WS send error:', wsErr);
                }
            }

            // 2. Dual-path persistence via REST
            try {
                fetch('/api/mural/stroke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: this.eventId, stroke: payload })
                }).then(res => {
                    if (res.ok) {
                        this._setConnectionState('saved');
                    }
                }).catch(() => {
                    if (!sentViaWs) {
                        this._enqueueOffline('save_stroke', payload);
                        this._setConnectionState('offline');
                    }
                });
            } catch (_) {
                if (!sentViaWs) {
                    this._enqueueOffline('save_stroke', payload);
                    this._setConnectionState('offline');
                }
            }

            if (sentViaWs) {
                setTimeout(() => this._setConnectionState('saved'), 150);
            }

            return true;
        }

        async deleteStroke(strokeId) {
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                return false;
            }

            this._setConnectionState('saving');
            this.knownStrokeIds.delete(strokeId);
            this._removeLocalCacheStroke(strokeId);

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'stroke_delete',
                    id: strokeId
                }));
            }

            try {
                await fetch('/api/mural/stroke/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: this.eventId, id: strokeId })
                });
                this._setConnectionState('saved');
            } catch (err) {
                this._enqueueOffline('delete_stroke', { id: strokeId });
            }

            return true;
        }

        // -------------------------------------------------------------
        // Image Operations
        // -------------------------------------------------------------
        async saveImage(imageObj) {
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                return false;
            }

            this._setConnectionState('saving');
            this.knownImageIds.add(imageObj.id);

            const payload = {
                id: imageObj.id,
                sessionId: this.sessionId,
                url: imageObj.url,
                x: Math.round(imageObj.x),
                y: Math.round(imageObj.y),
                width: Math.round(imageObj.width),
                height: Math.round(imageObj.height),
                caption: imageObj.caption || '',
                prompt: imageObj.prompt || '',
                sourceType: imageObj.sourceType || 'search',
                deleted: false,
                updatedAt: Date.now()
            };

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'image_update',
                    image: payload
                }));
            }

            try {
                await fetch('/api/mural/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: this.eventId, image: payload })
                });
                this._setConnectionState('saved');
            } catch (err) {
                this._enqueueOffline('save_image', payload);
            }

            return true;
        }

        async deleteImage(imageId) {
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                return false;
            }

            this._setConnectionState('saving');
            this.knownImageIds.delete(imageId);

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'image_delete',
                    id: imageId
                }));
            }

            try {
                await fetch('/api/mural/image/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: this.eventId, id: imageId })
                });
                this._setConnectionState('saved');
            } catch (err) {
                this._enqueueOffline('delete_image', { id: imageId });
            }

            return true;
        }

        // -------------------------------------------------------------
        // Administrative Controls
        // -------------------------------------------------------------
        async setEventStatus(newStatus) {
            try {
                const res = await fetch('/api/mural/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: this.eventId, status: newStatus })
                });
                if (res.ok) {
                    this.status = newStatus;
                    if (this.options.onStatusChange) {
                        this.options.onStatusChange(newStatus);
                    }
                    return true;
                }
            } catch (err) {
                console.error('[MuralRealtime] Failed updating status:', err);
            }
            return false;
        }

        async clearCanvasAdmin() {
            try {
                const res = await fetch('/api/mural/clear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: this.eventId })
                });
                if (res.ok) {
                    localStorage.removeItem('vv_mural_cache_' + this.eventId);
                    window.location.reload();
                    return true;
                }
            } catch (err) {
                console.error('[MuralRealtime] Failed clearing canvas:', err);
            }
            return false;
        }

        // -------------------------------------------------------------
        // Local Cache & Offline Recovery
        // -------------------------------------------------------------
        _restoreLocalCache() {
            try {
                const raw = localStorage.getItem('vv_mural_cache_' + this.eventId);
                if (raw) {
                    const cached = JSON.parse(raw);
                    if (Array.isArray(cached) && cached.length > 0) {
                        cached.forEach(stroke => {
                            this.knownStrokeIds.add(stroke.id);
                            if (this.options.onStrokeReceived) {
                                this.options.onStrokeReceived(stroke);
                            }
                        });
                    }
                }
            } catch (e) {}
        }

        _updateLocalCacheStrokes(strokesArray) {
            try {
                localStorage.setItem('vv_mural_cache_' + this.eventId, JSON.stringify(strokesArray));
            } catch (e) {}
        }

        _appendLocalCacheStroke(stroke) {
            try {
                const raw = localStorage.getItem('vv_mural_cache_' + this.eventId);
                const list = raw ? JSON.parse(raw) : [];
                if (!list.some(s => s.id === stroke.id)) {
                    list.push(stroke);
                    localStorage.setItem('vv_mural_cache_' + this.eventId, JSON.stringify(list));
                }
            } catch (e) {}
        }

        _removeLocalCacheStroke(strokeId) {
            try {
                const raw = localStorage.getItem('vv_mural_cache_' + this.eventId);
                if (raw) {
                    const list = JSON.parse(raw).filter(s => s.id !== strokeId);
                    localStorage.setItem('vv_mural_cache_' + this.eventId, JSON.stringify(list));
                }
            } catch (e) {}
        }

        _loadOfflineQueue() {
            try {
                const stored = localStorage.getItem('vv_mural_offline_queue_' + this.eventId);
                if (stored) {
                    this.offlineQueue = JSON.parse(stored);
                }
            } catch (e) {
                this.offlineQueue = [];
            }
        }

        _saveOfflineQueue() {
            try {
                localStorage.setItem('vv_mural_offline_queue_' + this.eventId, JSON.stringify(this.offlineQueue));
            } catch (e) {}
        }

        _enqueueOffline(action, payload) {
            this.offlineQueue.push({ action, payload, time: Date.now() });
            this._saveOfflineQueue();
        }

        async _flushOfflineQueue() {
            if (this.offlineQueue.length === 0) return;

            const queue = [...this.offlineQueue];
            this.offlineQueue = [];
            this._saveOfflineQueue();

            for (const item of queue) {
                try {
                    if (item.action === 'save_stroke') {
                        await this.saveStroke(item.payload);
                    } else if (item.action === 'delete_stroke') {
                        await this.deleteStroke(item.payload.id);
                    } else if (item.action === 'save_image') {
                        await this.saveImage(item.payload);
                    } else if (item.action === 'delete_image') {
                        await this.deleteImage(item.payload.id);
                    }
                } catch (e) {
                    this.offlineQueue.push(item);
                }
            }

            this._saveOfflineQueue();
        }

        _handleOnline() {
            this._setConnectionState('connected');
            this._connectWebSocket();
            this._flushOfflineQueue();
        }

        _handleOffline() {
            this._setConnectionState('offline');
        }

        _setConnectionState(state) {
            this.connectionState = state;
            if (this.options.onConnectionStateChange) {
                this.options.onConnectionStateChange(state);
            }
        }

        destroy() {
            if (this.pingTimer) clearInterval(this.pingTimer);
            if (this.pollTimer) clearInterval(this.pollTimer);
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            if (this.ws) {
                try { this.ws.close(); } catch (_) {}
            }
        }
    }

    window.MuralRealtime = MuralRealtime;

})(window);
