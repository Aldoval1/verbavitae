/**
 * Verba Vitae — Hispanic in 17 Syllables
 * Real-Time Synchronization Layer (Firebase Firestore + Offline Queue)
 * 
 * Supports:
 * - Real-time stroke broadcasting via Firestore subcollection
 * - Real-time image insertions/transforms/deletions
 * - Event status synchronization (DRAFT, LIVE, CLOSED)
 * - Temporary client session ID generation
 * - Resilient offline queue with automatic reconnection retry
 * - Connection status updates for UI indicators
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

            // Persistent Session ID for this browser tab / Promethean
            this.sessionId = this._getOrCreateSessionId();
            this.status = 'LIVE'; // Default fallback
            this.connectionState = 'connecting';
            this.offlineQueue = [];
            this.unsubscribers = [];
            this.isFlushing = false;
            this.hasInitialLoaded = false;

            // Load offline queue from localStorage
            this._loadOfflineQueue();

            // Initialize Network listeners
            window.addEventListener('online', () => this._handleOnline());
            window.addEventListener('offline', () => this._handleOffline());

            // Connect
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

            // Check if Firebase db is available
            if (typeof db === 'undefined' || !db) {
                console.warn("[MuralRealtime] Firestore 'db' not found. Falling back to local offline mode.");
                this._initLocalFallback();
                return;
            }

            try {
                // Ensure event doc exists in Firestore
                await this._ensureEventDocument();

                // 1. Listen for Event status changes (LIVE, CLOSED, DRAFT)
                const eventRef = db.collection('mural_events').doc(this.eventId);
                const unsubEvent = eventRef.onSnapshot(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        this.status = data.status || 'LIVE';
                        if (this.options.onStatusChange) {
                            this.options.onStatusChange(this.status, data);
                        }
                    }
                }, err => {
                    console.warn("[MuralRealtime] Event snapshot warning:", err);
                    this._setConnectionState('offline');
                });
                this.unsubscribers.push(unsubEvent);

                // 2. Listen for Real-Time Strokes
                const strokesRef = db.collection('mural_events').doc(this.eventId).collection('strokes');
                const unsubStrokes = strokesRef.onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        const data = change.doc.data();
                        data.id = change.doc.id;

                        if (change.type === 'added' || change.type === 'modified') {
                            if (data.deleted) {
                                if (this.options.onStrokeRemoved) this.options.onStrokeRemoved(data.id);
                            } else {
                                if (this.options.onStrokeReceived) this.options.onStrokeReceived(data);
                            }
                        } else if (change.type === 'removed') {
                            if (this.options.onStrokeRemoved) this.options.onStrokeRemoved(data.id);
                        }
                    });

                    if (!this.hasInitialLoaded) {
                        this.hasInitialLoaded = true;
                        if (this.options.onInitialLoadComplete) {
                            this.options.onInitialLoadComplete();
                        }
                    }
                    this._setConnectionState('saved');
                }, err => {
                    console.warn("[MuralRealtime] Strokes snapshot error:", err);
                    this._setConnectionState('offline');
                });
                this.unsubscribers.push(unsubStrokes);

                // 3. Listen for Real-Time Images
                const imagesRef = db.collection('mural_events').doc(this.eventId).collection('images');
                const unsubImages = imagesRef.onSnapshot(snapshot => {
                    snapshot.docChanges().forEach(change => {
                        const data = change.doc.data();
                        data.id = change.doc.id;

                        if (change.type === 'added' || change.type === 'modified') {
                            if (data.deleted) {
                                if (this.options.onImageRemoved) this.options.onImageRemoved(data.id);
                            } else {
                                if (this.options.onImageReceived) this.options.onImageReceived(data);
                            }
                        } else if (change.type === 'removed') {
                            if (this.options.onImageRemoved) this.options.onImageRemoved(data.id);
                        }
                    });
                    this._setConnectionState('saved');
                }, err => {
                    console.warn("[MuralRealtime] Images snapshot error:", err);
                    this._setConnectionState('offline');
                });
                this.unsubscribers.push(unsubImages);

                this._setConnectionState('connected');
                // Flush any offline queued actions
                this._flushOfflineQueue();

            } catch (error) {
                console.warn("[MuralRealtime] Error initializing Firestore connection:", error);
                this._initLocalFallback();
            }
        }

        async _ensureEventDocument() {
            try {
                const eventRef = db.collection('mural_events').doc(this.eventId);
                const doc = await eventRef.get();
                if (!doc.exists) {
                    await eventRef.set({
                        title: 'Hispanic in 17 Syllables',
                        subtitle: 'A Collaborative Haiku Mural',
                        status: 'LIVE',
                        aspectRatio: '3:1',
                        physicalWidthInches: 72,
                        physicalHeightInches: 24,
                        canonicalWidth: 7200,
                        canonicalHeight: 2400,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    const data = doc.data();
                    this.status = data.status || 'LIVE';
                    if (this.options.onStatusChange) {
                        this.options.onStatusChange(this.status, data);
                    }
                }
            } catch (err) {
                console.warn("[MuralRealtime] ensureEventDoc warning:", err);
            }
        }

        // --- Stroke Operations ---

        async saveStroke(stroke) {
            // Check if closed
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                console.warn("[MuralRealtime] Cannot save stroke: Event is closed.");
                return false;
            }

            this._setConnectionState('saving');

            const payload = {
                id: stroke.id,
                sessionId: this.sessionId,
                color: stroke.color,
                width: stroke.width,
                points: stroke.points,
                deleted: false,
                createdAt: Date.now()
            };

            // If offline or db not ready, push to offline queue
            if (!navigator.onLine || typeof db === 'undefined' || !db) {
                this._enqueueOffline('save_stroke', payload);
                this._setConnectionState('offline');
                return true;
            }

            try {
                await db.collection('mural_events')
                    .doc(this.eventId)
                    .collection('strokes')
                    .doc(stroke.id)
                    .set(payload);

                this._setConnectionState('saved');
                return true;
            } catch (err) {
                console.warn("[MuralRealtime] Failed to save stroke to Firestore:", err);
                this._enqueueOffline('save_stroke', payload);
                this._setConnectionState('offline');
                return false;
            }
        }

        async deleteStroke(strokeId) {
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                console.warn("[MuralRealtime] Cannot erase stroke: Event is closed.");
                return false;
            }

            this._setConnectionState('saving');

            if (!navigator.onLine || typeof db === 'undefined' || !db) {
                this._enqueueOffline('delete_stroke', { id: strokeId });
                this._setConnectionState('offline');
                return true;
            }

            try {
                await db.collection('mural_events')
                    .doc(this.eventId)
                    .collection('strokes')
                    .doc(strokeId)
                    .update({ deleted: true });

                this._setConnectionState('saved');
                return true;
            } catch (err) {
                console.warn("[MuralRealtime] Failed to soft-delete stroke:", err);
                this._enqueueOffline('delete_stroke', { id: strokeId });
                this._setConnectionState('offline');
                return false;
            }
        }

        // --- Image Operations ---

        async saveImage(imageObj) {
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                console.warn("[MuralRealtime] Cannot save image: Event is closed.");
                return false;
            }

            this._setConnectionState('saving');

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

            if (!navigator.onLine || typeof db === 'undefined' || !db) {
                this._enqueueOffline('save_image', payload);
                this._setConnectionState('offline');
                return true;
            }

            try {
                await db.collection('mural_events')
                    .doc(this.eventId)
                    .collection('images')
                    .doc(imageObj.id)
                    .set(payload, { merge: true });

                this._setConnectionState('saved');
                return true;
            } catch (err) {
                console.warn("[MuralRealtime] Failed to save image:", err);
                this._enqueueOffline('save_image', payload);
                this._setConnectionState('offline');
                return false;
            }
        }

        async deleteImage(imageId) {
            if (this.status === 'CLOSED' && !this.options.isAdmin) {
                console.warn("[MuralRealtime] Cannot delete image: Event is closed.");
                return false;
            }

            this._setConnectionState('saving');

            if (!navigator.onLine || typeof db === 'undefined' || !db) {
                this._enqueueOffline('delete_image', { id: imageId });
                this._setConnectionState('offline');
                return true;
            }

            try {
                await db.collection('mural_events')
                    .doc(this.eventId)
                    .collection('images')
                    .doc(imageId)
                    .update({ deleted: true });

                this._setConnectionState('saved');
                return true;
            } catch (err) {
                console.warn("[MuralRealtime] Failed to delete image:", err);
                this._enqueueOffline('delete_image', { id: imageId });
                this._setConnectionState('offline');
                return false;
            }
        }

        // --- Administrative Controls ---

        async setEventStatus(newStatus) {
            if (!this.options.isAdmin) {
                console.error("[MuralRealtime] Only administrators can alter event status.");
                return false;
            }

            try {
                await db.collection('mural_events').doc(this.eventId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    closedAt: newStatus === 'CLOSED' ? firebase.firestore.FieldValue.serverTimestamp() : null
                });
                this.status = newStatus;
                return true;
            } catch (err) {
                console.error("[MuralRealtime] Failed to update event status:", err);
                return false;
            }
        }

        async clearCanvasAdmin() {
            if (!this.options.isAdmin) return false;
            try {
                // Soft delete or batch delete strokes
                const snapshot = await db.collection('mural_events').doc(this.eventId).collection('strokes').get();
                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                // Clear images
                const imgSnapshot = await db.collection('mural_events').doc(this.eventId).collection('images').get();
                const imgBatch = db.batch();
                imgSnapshot.forEach(doc => {
                    imgBatch.delete(doc.ref);
                });
                await imgBatch.commit();

                return true;
            } catch (err) {
                console.error("[MuralRealtime] Failed to clear canvas:", err);
                return false;
            }
        }

        // --- Offline Queue & Network Handling ---

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
            if (this.isFlushing || this.offlineQueue.length === 0) return;
            if (!navigator.onLine || typeof db === 'undefined' || !db) return;

            this.isFlushing = true;
            this._setConnectionState('saving');

            const queue = [...this.offlineQueue];
            this.offlineQueue = [];
            this._saveOfflineQueue();

            for (const item of queue) {
                try {
                    if (item.action === 'save_stroke') {
                        await db.collection('mural_events').doc(this.eventId).collection('strokes').doc(item.payload.id).set(item.payload);
                    } else if (item.action === 'delete_stroke') {
                        await db.collection('mural_events').doc(this.eventId).collection('strokes').doc(item.payload.id).update({ deleted: true });
                    } else if (item.action === 'save_image') {
                        await db.collection('mural_events').doc(this.eventId).collection('images').doc(item.payload.id).set(item.payload, { merge: true });
                    } else if (item.action === 'delete_image') {
                        await db.collection('mural_events').doc(this.eventId).collection('images').doc(item.payload.id).update({ deleted: true });
                    }
                } catch (e) {
                    console.warn("[MuralRealtime] Failed flushing item, re-queuing:", e);
                    this.offlineQueue.push(item);
                }
            }

            this._saveOfflineQueue();
            this.isFlushing = false;
            this._setConnectionState('saved');
        }

        _handleOnline() {
            this._setConnectionState('connected');
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

        _initLocalFallback() {
            // Local storage fallback if Firestore is unreachable
            const localStrokesKey = 'vv_mural_strokes_' + this.eventId;
            const stored = JSON.parse(localStorage.getItem(localStrokesKey) || '[]');
            stored.forEach(stroke => {
                if (this.options.onStrokeReceived) this.options.onStrokeReceived(stroke);
            });

            if (this.options.onInitialLoadComplete) {
                this.options.onInitialLoadComplete();
            }
            this._setConnectionState('offline');
        }

        destroy() {
            this.unsubscribers.forEach(u => typeof u === 'function' && u());
            this.unsubscribers = [];
        }
    }

    window.MuralRealtime = MuralRealtime;

})(window);
