/**
 * Verba Vitae — Hispanic in 17 Syllables
 * Canonical 3:1 Collaborative Mural Canvas Engine
 * 
 * Features:
 * - Canonical logical coordinate system (7200 x 2400 units = 72" x 24" at 100 units/inch)
 * - Promethean hardware optimization:
 *   - Stylus (pointerType === 'pen'): Natural digital ink handwriting
 *   - Touch 1-finger (pointerType === 'touch'): Smooth canvas panning
 *   - Touch 2-finger (pointerType === 'touch'): Smooth pinch-to-zoom & two-finger pan
 *   - Mouse: Left click draw (Pen) or pan (Hand tool), wheel zoom
 * - Vector Catmull-Rom & Quadratic Bézier curve smoothing for natural handwriting
 * - Pressure sensitivity support with graceful fallback
 * - Protected non-writable regions (decorative frame & title header)
 * - Multi-layer architecture:
 *   Layer 1: Locked decorative frame & title
 *   Layer 2: Community images (moveable, resizable)
 *   Layer 3: Handwriting / digital ink strokes
 * - Device-local viewports (Promethean A and B independent viewports)
 */

(function (window) {
    'use strict';

    // Canonical mural dimensions (72" x 24" at 100 units/inch)
    const CANONICAL_WIDTH = 7200;
    const CANONICAL_HEIGHT = 2400;
    const ASPECT_RATIO = 3.0; // 3:1 horizontal landscape

    // Protected / Non-writable boundaries in canonical coordinates
    const DEFAULT_PROTECTED_REGIONS = [
        // Outer decorative frame border margins (120 units on all 4 sides)
        { id: 'frame-top', type: 'rect', x: 0, y: 0, width: 7200, height: 120, label: 'Top Frame Border' },
        { id: 'frame-bottom', type: 'rect', x: 0, y: 2280, width: 7200, height: 120, label: 'Bottom Frame Border' },
        { id: 'frame-left', type: 'rect', x: 0, y: 0, width: 140, height: 2400, label: 'Left Frame Border' },
        { id: 'frame-right', type: 'rect', x: 7060, y: 0, width: 140, height: 2400, label: 'Right Frame Border' },
        // Central locked Title Header region: "HISPANIC IN 17 SYLLABLES"
        { id: 'title-banner', type: 'rect', x: 2200, y: 50, width: 2800, height: 320, label: 'Title Banner' }
    ];

    class MuralEngine {
        constructor(canvasElement, options = {}) {
            this.canvas = canvasElement;
            this.ctx = canvasElement.getContext('2d');
            this.options = Object.assign({
                readOnly: false,
                adminMode: false,
                onStrokeComplete: null,
                onStrokeErased: null,
                onImageSelected: null,
                onImageModified: null,
                onViewportChange: null,
                protectedRegions: DEFAULT_PROTECTED_REGIONS
            }, options);

            // Canonical dimensions
            this.canonicalWidth = CANONICAL_WIDTH;
            this.canonicalHeight = CANONICAL_HEIGHT;

            // Device-local Viewport state (pan & zoom)
            this.viewport = {
                x: 0,       // canonical X coordinate at top-left of screen
                y: 0,       // canonical Y coordinate at top-left of screen
                zoom: 1.0,  // scale factor (screen pixels per canonical unit)
                minZoom: 0.15,
                maxZoom: 3.5
            };

            // Artwork state
            this.strokes = []; // Array of stroke objects
            this.images = [];  // Array of image objects
            this.frameAsset = null; // Pre-rendered or loaded frame image/svg

            // Tools & Settings
            this.activeTool = 'pen'; // 'pen' | 'eraser' | 'hand'
            this.brushColor = '#1d0c8d'; // Verba Vitae classic navy
            this.brushWidth = 7; // canonical units
            this.eraserRadius = 35; // canonical units

            // Active Input Tracking
            this.activePointers = new Map(); // pointerId -> { x, y, type, time }
            this.currentStroke = null; // currently drawing stroke
            this.isPanning = false;
            this.panStart = { x: 0, y: 0, viewportX: 0, viewportY: 0 };
            this.pinchInitialDistance = 0;
            this.pinchInitialZoom = 1.0;
            this.pinchCenterCanonical = { x: 0, y: 0 };

            // Active Image Interaction (drag/resize)
            this.selectedImage = null;
            this.imageDragState = null; // { mode: 'move'|'resize', handle: 'nw'|'ne'|'se'|'sw', startPos, imgStart }

            // Undo / Redo stacks (session specific)
            this.undoStack = [];
            this.redoStack = [];

            // Animation frame request ID
            this.renderPending = false;

            // Initialize
            this._initCanvasSize();
            this._setupPointerEvents();
            this._setupWindowEvents();
            this.fitToBoard();
        }

        // --- Viewport & Coordinate Mapping ---

        /**
         * Converts Screen Pixel coordinates (e.g. from PointerEvent.clientX/Y)
         * to Canonical Mural Coordinates (0 to 7200, 0 to 2400).
         */
        screenToCanonical(screenX, screenY) {
            const rect = this.canvas.getBoundingClientRect();
            const relX = screenX - rect.left;
            const relY = screenY - rect.top;
            return {
                x: relX / this.viewport.zoom + this.viewport.x,
                y: relY / this.viewport.zoom + this.viewport.y
            };
        }

        /**
         * Converts Canonical Mural Coordinates to Screen Pixel coordinates.
         */
        canonicalToScreen(canonicalX, canonicalY) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (canonicalX - this.viewport.x) * this.viewport.zoom + rect.left,
                y: (canonicalY - this.viewport.y) * this.viewport.zoom + rect.top
            };
        }

        /**
         * Fits the entire 72" x 24" (3:1) mural comfortably within the current screen/viewport.
         */
        fitToBoard() {
            const rect = this.canvas.getBoundingClientRect();
            const canvasW = rect.width || window.innerWidth;
            const canvasH = rect.height || window.innerHeight;

            const scaleX = canvasW / this.canonicalWidth;
            const scaleY = canvasH / this.canonicalHeight;
            const zoom = Math.min(scaleX, scaleY) * 0.96; // 4% padding margin

            this.viewport.zoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, zoom));
            this.viewport.x = (this.canonicalWidth - canvasW / this.viewport.zoom) / 2;
            this.viewport.y = (this.canonicalHeight - canvasH / this.viewport.zoom) / 2;

            this.requestRender();
            if (this.options.onViewportChange) {
                this.options.onViewportChange(this.viewport);
            }
        }

        /**
         * Centers viewport around a specific region (e.g. left side for Promethean A, right side for Promethean B)
         */
        focusSection(sectionName) {
            const rect = this.canvas.getBoundingClientRect();
            const canvasW = rect.width || window.innerWidth;
            const canvasH = rect.height || window.innerHeight;

            // Zoom in comfortably to approximately 1/3 of the mural
            const targetZoom = (canvasW / (this.canonicalWidth / 2.6));
            this.viewport.zoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, targetZoom));

            if (sectionName === 'left' || sectionName === 'A') {
                this.viewport.x = 150;
                this.viewport.y = (this.canonicalHeight - canvasH / this.viewport.zoom) / 2;
            } else if (sectionName === 'right' || sectionName === 'B') {
                this.viewport.x = this.canonicalWidth - (canvasW / this.viewport.zoom) - 150;
                this.viewport.y = (this.canonicalHeight - canvasH / this.viewport.zoom) / 2;
            } else {
                // center
                this.viewport.x = (this.canonicalWidth - canvasW / this.viewport.zoom) / 2;
                this.viewport.y = (this.canonicalHeight - canvasH / this.viewport.zoom) / 2;
            }

            this.requestRender();
            if (this.options.onViewportChange) {
                this.options.onViewportChange(this.viewport);
            }
        }

        zoomAtPoint(deltaZoom, screenCenterX, screenCenterY) {
            const oldZoom = this.viewport.zoom;
            let newZoom = oldZoom * deltaZoom;
            newZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, newZoom));

            if (newZoom === oldZoom) return;

            const rect = this.canvas.getBoundingClientRect();
            const relX = (screenCenterX !== undefined) ? (screenCenterX - rect.left) : (rect.width / 2);
            const relY = (screenCenterY !== undefined) ? (screenCenterY - rect.top) : (rect.height / 2);

            // Canonical point before zoom
            const canonicalX = relX / oldZoom + this.viewport.x;
            const canonicalY = relY / oldZoom + this.viewport.y;

            this.viewport.zoom = newZoom;
            this.viewport.x = canonicalX - relX / newZoom;
            this.viewport.y = canonicalY - relY / newZoom;

            this.requestRender();
            if (this.options.onViewportChange) {
                this.options.onViewportChange(this.viewport);
            }
        }

        // --- Protected Region Boundaries ---

        /**
         * Checks if a canonical coordinate point falls inside any protected / non-writable area.
         */
        isPointInProtectedRegion(x, y) {
            const regions = this.options.protectedRegions || DEFAULT_PROTECTED_REGIONS;
            for (const r of regions) {
                if (r.type === 'rect') {
                    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
                        return true;
                    }
                }
            }
            return false;
        }

        // --- Pointer Event Handling (Promethean Touch vs Stylus) ---

        _setupPointerEvents() {
            this.canvas.addEventListener('pointerdown', this._onPointerDown.bind(this), { passive: false });
            this.canvas.addEventListener('pointermove', this._onPointerMove.bind(this), { passive: false });
            this.canvas.addEventListener('pointerup', this._onPointerUp.bind(this), { passive: false });
            this.canvas.addEventListener('pointercancel', this._onPointerCancel.bind(this), { passive: false });
            this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

            // Prevent default touch gestures from triggering browser back/forward or zoom
            this.canvas.style.touchAction = 'none';
        }

        _onPointerDown(e) {
            e.preventDefault();
            this.canvas.setPointerCapture(e.pointerId);

            const pt = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                type: e.pointerType, // 'pen' | 'touch' | 'mouse'
                pressure: e.pressure || 0.5,
                time: Date.now()
            };
            this.activePointers.set(e.pointerId, pt);

            // Touch interaction: Hand tool or multi-touch gestures
            if (pt.type === 'touch' || this.activeTool === 'hand') {
                if (this.activePointers.size === 1) {
                    // Single finger touch = PAN canvas
                    this.isPanning = true;
                    this.panStart = {
                        x: e.clientX,
                        y: e.clientY,
                        viewportX: this.viewport.x,
                        viewportY: this.viewport.y
                    };
                } else if (this.activePointers.size === 2) {
                    // Two finger touch = PINCH TO ZOOM & PAN
                    this.isPanning = false;
                    const pts = Array.from(this.activePointers.values());
                    const dx = pts[0].x - pts[1].x;
                    const dy = pts[0].y - pts[1].y;
                    this.pinchInitialDistance = Math.hypot(dx, dy);
                    this.pinchInitialZoom = this.viewport.zoom;

                    const screenMidX = (pts[0].x + pts[1].x) / 2;
                    const screenMidY = (pts[0].y + pts[1].y) / 2;
                    this.pinchCenterCanonical = this.screenToCanonical(screenMidX, screenMidY);
                }
                return;
            }

            // If read-only mode and not admin, reject drawings/modifications
            if (this.options.readOnly && !this.options.adminMode) {
                // In read-only mode, any touch or pen can pan
                this.isPanning = true;
                this.panStart = {
                    x: e.clientX,
                    y: e.clientY,
                    viewportX: this.viewport.x,
                    viewportY: this.viewport.y
                };
                return;
            }

            const canonical = this.screenToCanonical(e.clientX, e.clientY);

            // Check if user clicked an image handle or image body
            const imageHit = this._hitTestImage(canonical.x, canonical.y);
            if (imageHit) {
                this.selectedImage = imageHit.image;
                this.imageDragState = {
                    mode: imageHit.handle ? 'resize' : 'move',
                    handle: imageHit.handle,
                    startPos: canonical,
                    imgStart: {
                        x: imageHit.image.x,
                        y: imageHit.image.y,
                        width: imageHit.image.width,
                        height: imageHit.image.height
                    }
                };
                if (this.options.onImageSelected) {
                    this.options.onImageSelected(this.selectedImage);
                }
                this.requestRender();
                return;
            } else {
                if (this.selectedImage) {
                    this.selectedImage = null;
                    if (this.options.onImageSelected) {
                        this.options.onImageSelected(null);
                    }
                    this.requestRender();
                }
            }

            // Eraser Tool
            if (this.activeTool === 'eraser') {
                this._eraseAt(canonical.x, canonical.y);
                return;
            }

            // Stylus (Pen) or Left Mouse drawing
            if (pt.type === 'pen' || (pt.type === 'mouse' && e.button === 0)) {
                // If point starts in protected region, reject stroke start
                if (this.isPointInProtectedRegion(canonical.x, canonical.y)) {
                    return;
                }

                this.currentStroke = {
                    id: this._generateUUID(),
                    tool: 'pen',
                    color: this.brushColor,
                    width: this.brushWidth,
                    points: [{
                        x: Math.round(canonical.x * 10) / 10,
                        y: Math.round(canonical.y * 10) / 10,
                        p: Math.round(pt.pressure * 100) / 100
                    }],
                    createdAt: Date.now()
                };
                this.requestRender();
            }
        }

        _onPointerMove(e) {
            e.preventDefault();
            if (!this.activePointers.has(e.pointerId)) return;

            const pt = this.activePointers.get(e.pointerId);
            pt.x = e.clientX;
            pt.y = e.clientY;
            pt.pressure = e.pressure || pt.pressure;

            // Touch Panning
            if (this.isPanning) {
                const dx = (e.clientX - this.panStart.x) / this.viewport.zoom;
                const dy = (e.clientY - this.panStart.y) / this.viewport.zoom;
                this.viewport.x = this.panStart.viewportX - dx;
                this.viewport.y = this.panStart.viewportY - dy;
                this.requestRender();
                if (this.options.onViewportChange) this.options.onViewportChange(this.viewport);
                return;
            }

            // Touch 2-finger Pinch-Zoom
            if (this.activePointers.size === 2 && this.pinchInitialDistance > 0) {
                const pts = Array.from(this.activePointers.values());
                const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                const zoomFactor = currentDist / this.pinchInitialDistance;
                let newZoom = this.pinchInitialZoom * zoomFactor;
                newZoom = Math.max(this.viewport.minZoom, Math.min(this.viewport.maxZoom, newZoom));

                const screenMidX = (pts[0].x + pts[1].x) / 2;
                const screenMidY = (pts[0].y + pts[1].y) / 2;
                const rect = this.canvas.getBoundingClientRect();
                const relX = screenMidX - rect.left;
                const relY = screenMidY - rect.top;

                this.viewport.zoom = newZoom;
                this.viewport.x = this.pinchCenterCanonical.x - relX / newZoom;
                this.viewport.y = this.pinchCenterCanonical.y - relY / newZoom;

                this.requestRender();
                if (this.options.onViewportChange) this.options.onViewportChange(this.viewport);
                return;
            }

            const canonical = this.screenToCanonical(e.clientX, e.clientY);

            // Active Image Drag/Resize
            if (this.imageDragState && this.selectedImage) {
                const dx = canonical.x - this.imageDragState.startPos.x;
                const dy = canonical.y - this.imageDragState.startPos.y;
                const s = this.imageDragState.imgStart;

                if (this.imageDragState.mode === 'move') {
                    // Ensure image does not move entirely into protected title/frame
                    const newX = s.x + dx;
                    const newY = s.y + dy;
                    this.selectedImage.x = Math.max(140, Math.min(this.canonicalWidth - this.selectedImage.width - 140, newX));
                    this.selectedImage.y = Math.max(120, Math.min(this.canonicalHeight - this.selectedImage.height - 120, newY));
                } else if (this.imageDragState.mode === 'resize') {
                    const handle = this.imageDragState.handle;
                    const minSize = 100;
                    if (handle === 'se') {
                        this.selectedImage.width = Math.max(minSize, s.width + dx);
                        this.selectedImage.height = Math.max(minSize, s.height + dy);
                    } else if (handle === 'sw') {
                        const newW = Math.max(minSize, s.width - dx);
                        this.selectedImage.x = s.x + (s.width - newW);
                        this.selectedImage.width = newW;
                        this.selectedImage.height = Math.max(minSize, s.height + dy);
                    } else if (handle === 'ne') {
                        const newH = Math.max(minSize, s.height - dy);
                        this.selectedImage.y = s.y + (s.height - newH);
                        this.selectedImage.width = Math.max(minSize, s.width + dx);
                        this.selectedImage.height = newH;
                    } else if (handle === 'nw') {
                        const newW = Math.max(minSize, s.width - dx);
                        const newH = Math.max(minSize, s.height - dy);
                        this.selectedImage.x = s.x + (s.width - newW);
                        this.selectedImage.y = s.y + (s.height - newH);
                        this.selectedImage.width = newW;
                        this.selectedImage.height = newH;
                    }
                }
                this.requestRender();
                return;
            }

            // Eraser dragging
            if (this.activeTool === 'eraser' && (pt.type === 'pen' || pt.type === 'mouse')) {
                this._eraseAt(canonical.x, canonical.y);
                return;
            }

            // Pen Stroke Inking
            if (this.currentStroke) {
                // If pointer entered protected region, clamp or skip point to protect title/frame
                if (this.isPointInProtectedRegion(canonical.x, canonical.y)) {
                    return;
                }

                const lastPoint = this.currentStroke.points[this.currentStroke.points.length - 1];
                const dist = Math.hypot(canonical.x - lastPoint.x, canonical.y - lastPoint.y);

                // Point threshold to prevent micro-jitter and compress stroke points
                if (dist > 2.0) {
                    this.currentStroke.points.push({
                        x: Math.round(canonical.x * 10) / 10,
                        y: Math.round(canonical.y * 10) / 10,
                        p: Math.round(pt.pressure * 100) / 100
                    });
                    this.requestRender();
                }
            }
        }

        _onPointerUp(e) {
            e.preventDefault();
            try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
            this.activePointers.delete(e.pointerId);

            if (this.activePointers.size === 0) {
                this.isPanning = false;
                this.pinchInitialDistance = 0;
            }

            // Finished image drag/resize
            if (this.imageDragState) {
                this.imageDragState = null;
                if (this.options.onImageModified && this.selectedImage) {
                    this.options.onImageModified(this.selectedImage);
                }
            }

            // Finished pen stroke
            if (this.currentStroke) {
                if (this.currentStroke.points.length > 1) {
                    const completed = this.currentStroke;
                    this.strokes.push(completed);
                    this.undoStack.push({ type: 'add_stroke', stroke: completed });
                    this.redoStack = []; // clear redo on new action

                    if (this.options.onStrokeComplete) {
                        this.options.onStrokeComplete(completed);
                    }
                }
                this.currentStroke = null;
                this.requestRender();
            }
        }

        _onPointerCancel(e) {
            this._onPointerUp(e);
        }

        _onWheel(e) {
            e.preventDefault();
            // Mouse wheel zoom centered on cursor
            const zoomDelta = e.deltaY < 0 ? 1.12 : 0.89;
            this.zoomAtPoint(zoomDelta, e.clientX, e.clientY);
        }

        // --- Eraser & Hit Testing ---

        _eraseAt(canonicalX, canonicalY) {
            const radius = this.eraserRadius;
            let erasedAny = false;

            // Search strokes backwards so top strokes are checked first
            for (let i = this.strokes.length - 1; i >= 0; i--) {
                const stroke = this.strokes[i];
                let hit = false;
                for (let j = 0; j < stroke.points.length; j++) {
                    const p = stroke.points[j];
                    if (Math.hypot(p.x - canonicalX, p.y - canonicalY) <= radius) {
                        hit = true;
                        break;
                    }
                }
                if (hit) {
                    const removed = this.strokes.splice(i, 1)[0];
                    this.undoStack.push({ type: 'delete_stroke', stroke: removed });
                    erasedAny = true;
                    if (this.options.onStrokeErased) {
                        this.options.onStrokeErased(removed.id);
                    }
                }
            }

            if (erasedAny) {
                this.requestRender();
            }
        }

        _hitTestImage(canonicalX, canonicalY) {
            const handleRadius = 24; // canonical units for touch handles
            for (let i = this.images.length - 1; i >= 0; i--) {
                const img = this.images[i];
                // Check resize handles if selected
                if (this.selectedImage === img) {
                    const corners = {
                        nw: { x: img.x, y: img.y },
                        ne: { x: img.x + img.width, y: img.y },
                        se: { x: img.x + img.width, y: img.y + img.height },
                        sw: { x: img.x, y: img.y + img.height }
                    };
                    for (const [key, c] of Object.entries(corners)) {
                        if (Math.hypot(canonicalX - c.x, canonicalY - c.y) <= handleRadius) {
                            return { image: img, handle: key };
                        }
                    }
                }
                // Check body
                if (canonicalX >= img.x && canonicalX <= img.x + img.width &&
                    canonicalY >= img.y && canonicalY <= img.y + img.height) {
                    return { image: img, handle: null };
                }
            }
            return null;
        }

        // --- Undo / Redo (Session-Specific) ---

        undo() {
            if (this.undoStack.length === 0) return null;
            const action = this.undoStack.pop();

            if (action.type === 'add_stroke') {
                const idx = this.strokes.findIndex(s => s.id === action.stroke.id);
                if (idx !== -1) {
                    this.strokes.splice(idx, 1);
                    this.redoStack.push(action);
                    if (this.options.onStrokeErased) {
                        this.options.onStrokeErased(action.stroke.id);
                    }
                    this.requestRender();
                    return action.stroke.id;
                }
            } else if (action.type === 'delete_stroke') {
                this.strokes.push(action.stroke);
                this.redoStack.push(action);
                if (this.options.onStrokeComplete) {
                    this.options.onStrokeComplete(action.stroke);
                }
                this.requestRender();
                return action.stroke.id;
            }
            return null;
        }

        redo() {
            if (this.redoStack.length === 0) return null;
            const action = this.redoStack.pop();

            if (action.type === 'add_stroke') {
                this.strokes.push(action.stroke);
                this.undoStack.push(action);
                if (this.options.onStrokeComplete) {
                    this.options.onStrokeComplete(action.stroke);
                }
                this.requestRender();
                return action.stroke.id;
            } else if (action.type === 'delete_stroke') {
                const idx = this.strokes.findIndex(s => s.id === action.stroke.id);
                if (idx !== -1) {
                    this.strokes.splice(idx, 1);
                    this.undoStack.push(action);
                    if (this.options.onStrokeErased) {
                        this.options.onStrokeErased(action.stroke.id);
                    }
                    this.requestRender();
                    return action.stroke.id;
                }
            }
            return null;
        }

        // --- Rendering Pipeline ---

        requestRender() {
            if (!this.renderPending) {
                this.renderPending = true;
                requestAnimationFrame(this.render.bind(this));
            }
        }

        render() {
            this.renderPending = false;
            const ctx = this.ctx;
            const rect = this.canvas.getBoundingClientRect();
            const w = this.canvas.width;
            const h = this.canvas.height;

            // Clear screen
            ctx.clearRect(0, 0, w, h);

            // Save transform state
            ctx.save();

            // Apply device-local Viewport Transformation:
            // ScreenX = (CanonicalX - viewport.x) * zoom
            ctx.scale(this.viewport.zoom, this.viewport.zoom);
            ctx.translate(-this.viewport.x, -this.viewport.y);

            // --- LAYER 1: Background & Locked Frame Asset / Title ---
            this._renderBackgroundAndFrame(ctx);

            // --- LAYER 2: Community Images ---
            this._renderImages(ctx);

            // --- LAYER 3: Digital Ink / Handwriting Strokes ---
            this._renderStrokes(ctx);

            // Active in-progress stroke
            if (this.currentStroke && this.currentStroke.points.length > 0) {
                this._renderSingleStroke(ctx, this.currentStroke);
            }

            // Selected image handles
            if (this.selectedImage) {
                this._renderImageSelection(ctx, this.selectedImage);
            }

            // Restore transform
            ctx.restore();
        }

        _renderBackgroundAndFrame(ctx) {
            // Crisp paper background with subtle archival warmth
            ctx.fillStyle = '#fdfbf7';
            ctx.fillRect(0, 0, this.canonicalWidth, this.canonicalHeight);

            // Subtle parchment grid / dots texture
            ctx.fillStyle = 'rgba(29, 12, 141, 0.025)';
            const dotSpacing = 80;
            for (let x = 160; x < this.canonicalWidth - 160; x += dotSpacing) {
                for (let y = 140; y < this.canonicalHeight - 140; y += dotSpacing) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Decorative Spanish/Hispano-Colonial Border (Layer 1)
            // Outer navy and gold double frame
            ctx.strokeStyle = '#1d0c8d'; // Verba navy
            ctx.lineWidth = 14;
            ctx.strokeRect(30, 30, this.canonicalWidth - 60, this.canonicalHeight - 60);

            ctx.strokeStyle = '#d4af37'; // Royal gold
            ctx.lineWidth = 6;
            ctx.strokeRect(55, 55, this.canonicalWidth - 110, this.canonicalHeight - 110);

            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(80, 80, this.canonicalWidth - 160, this.canonicalHeight - 160);

            // Ornamental Corner Medallions
            this._drawCornerOrnament(ctx, 80, 80, 0);
            this._drawCornerOrnament(ctx, this.canonicalWidth - 80, 80, Math.PI / 2);
            this._drawCornerOrnament(ctx, this.canonicalWidth - 80, this.canonicalHeight - 80, Math.PI);
            this._drawCornerOrnament(ctx, 80, this.canonicalHeight - 80, -Math.PI / 2);

            // --- LOCKED TITLE HEADER: "HISPANIC IN 17 SYLLABLES" ---
            this._renderLockedTitleBanner(ctx);

            // Verba Vitae Subtle Watermark Crest on bottom-right frame
            ctx.save();
            ctx.font = '700 28px "Montserrat", sans-serif';
            ctx.fillStyle = 'rgba(29, 12, 141, 0.45)';
            ctx.textAlign = 'right';
            ctx.fillText('THEVERBAVITAE.ORG/HISPANICIN17  •  VERBA VITAE', this.canonicalWidth - 120, this.canonicalHeight - 65);
            ctx.restore();

            // Haiku syllable meter guide on bottom-left frame
            ctx.save();
            ctx.font = '600 24px "Montserrat", sans-serif';
            ctx.fillStyle = 'rgba(214, 139, 45, 0.7)'; // gold-orange
            ctx.textAlign = 'left';
            ctx.fillText('HAIKU STRUCTURE: 5 SYLLABLES  •  7 SYLLABLES  •  5 SYLLABLES', 120, this.canonicalHeight - 65);
            ctx.restore();
        }

        _drawCornerOrnament(ctx, cx, cy, rotation) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);

            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 4;
            ctx.fillStyle = '#1d0c8d';

            // Corner decorative fan / rosette
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(60, 0);
            ctx.quadraticCurveTo(60, 60, 0, 60);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Inner floral accent
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(18, 18, 10, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        _renderLockedTitleBanner(ctx) {
            const bx = 2200;
            const by = 48;
            const bw = 2800;
            const bh = 240;

            ctx.save();

            // Decorative Banner Plaque
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(29, 12, 141, 0.15)';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetY = 8;

            // Plaque shape with bracketed corners
            ctx.beginPath();
            ctx.moveTo(bx + 40, by);
            ctx.lineTo(bx + bw - 40, by);
            ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + 40);
            ctx.lineTo(bx + bw, by + bh - 40);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - 40, by + bh);
            ctx.lineTo(bx + 40, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - 40);
            ctx.lineTo(bx, by + 40);
            ctx.quadraticCurveTo(bx, by, bx + 40, by);
            ctx.closePath();
            ctx.fill();

            // Reset shadow
            ctx.shadowColor = 'transparent';

            // Plaque Double Border (Gold and Navy)
            ctx.strokeStyle = '#1d0c8d';
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(bx + 12, by + 12, bw - 24, bh - 24);

            // Top ribbon accent text
            ctx.font = '800 22px "Montserrat", sans-serif';
            ctx.fillStyle = '#d68b2d'; // Verba gold/orange
            ctx.textAlign = 'center';
            ctx.letterSpacing = '5px';
            ctx.fillText('VERBA VITAE • LIVE POETIC COMMUNITY MURAL', bx + bw / 2, by + 50);

            // PRIMARY TITLE: "HISPANIC IN 17 SYLLABLES"
            ctx.font = '900 68px "Montserrat", serif';
            ctx.fillStyle = '#1d0c8d'; // Deep royal navy
            ctx.letterSpacing = '2px';
            ctx.fillText('HISPANIC IN 17 SYLLABLES', bx + bw / 2, by + 130);

            // Subtitle / Cultural Motto
            ctx.font = '500 24px "Montserrat", sans-serif';
            ctx.fillStyle = '#4a5568';
            ctx.letterSpacing = '1px';
            ctx.fillText('Hispano en 17 Sílabas  —  Handwrite your haiku with the Promethean stylus anywhere on the mural', bx + bw / 2, by + 185);

            // Ornamental dividers
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bx + 350, by + 155);
            ctx.lineTo(bx + bw - 350, by + 155);
            ctx.stroke();

            ctx.restore();
        }

        _renderImages(ctx) {
            for (const img of this.images) {
                if (!img.imageElement) {
                    // Lazy create HTMLImageElement for URL
                    const domImg = new Image();
                    domImg.crossOrigin = 'anonymous';
                    domImg.src = img.url;
                    domImg.onload = () => this.requestRender();
                    img.imageElement = domImg;
                }

                ctx.save();
                if (img.imageElement.complete && img.imageElement.naturalWidth > 0) {
                    ctx.drawImage(img.imageElement, img.x, img.y, img.width, img.height);
                } else {
                    // Placeholder card while image is loading
                    ctx.fillStyle = '#edf2f7';
                    ctx.strokeStyle = '#cbd5e1';
                    ctx.lineWidth = 2;
                    ctx.fillRect(img.x, img.y, img.width, img.height);
                    ctx.strokeRect(img.x, img.y, img.width, img.height);

                    ctx.font = '600 20px "Montserrat", sans-serif';
                    ctx.fillStyle = '#64748b';
                    ctx.textAlign = 'center';
                    ctx.fillText('Loading Image...', img.x + img.width / 2, img.y + img.height / 2);
                }

                // Delicate polaroid-style white border around images
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 8;
                ctx.strokeRect(img.x, img.y, img.width, img.height);

                ctx.restore();
            }
        }

        _renderImageSelection(ctx, img) {
            ctx.save();
            ctx.strokeStyle = '#3182ce';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 6]);
            ctx.strokeRect(img.x - 4, img.y - 4, img.width + 8, img.height + 8);
            ctx.setLineDash([]);

            // 4 corner handles
            const corners = [
                { x: img.x - 4, y: img.y - 4 },
                { x: img.x + img.width + 4, y: img.y - 4 },
                { x: img.x + img.width + 4, y: img.y + img.height + 4 },
                { x: img.x - 4, y: img.y + img.height + 4 }
            ];

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#3182ce';
            ctx.lineWidth = 3;
            for (const c of corners) {
                ctx.beginPath();
                ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
        }

        _renderStrokes(ctx) {
            for (const stroke of this.strokes) {
                this._renderSingleStroke(ctx, stroke);
            }
        }

        /**
         * Renders a vector stroke with smooth quadratic Bézier midpoint interpolation.
         * Creates natural fountain-pen ink curves rather than jagged line segments.
         */
        _renderSingleStroke(ctx, stroke) {
            const pts = stroke.points;
            if (!pts || pts.length === 0) return;

            ctx.save();
            ctx.strokeStyle = stroke.color || '#1d0c8d';
            ctx.lineWidth = stroke.width || 7;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (pts.length === 1) {
                // Single point (dot / period / accent)
                ctx.beginPath();
                ctx.arc(pts[0].x, pts[0].y, (stroke.width || 7) / 2, 0, Math.PI * 2);
                ctx.fillStyle = stroke.color || '#1d0c8d';
                ctx.fill();
                ctx.restore();
                return;
            }

            if (pts.length === 2) {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[1].x, pts[1].y);
                ctx.stroke();
                ctx.restore();
                return;
            }

            // Smooth Quadratic Bézier interpolation across points
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);

            for (let i = 1; i < pts.length - 1; i++) {
                const midX = (pts[i].x + pts[i + 1].x) / 2;
                const midY = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
            }

            // Connect to last point
            const last = pts[pts.length - 1];
            ctx.lineTo(last.x, last.y);
            ctx.stroke();

            ctx.restore();
        }

        // --- Window Resize & Internal Canvas Sizing ---

        _initCanvasSize() {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            this.canvas.width = (rect.width || window.innerWidth) * dpr;
            this.canvas.height = (rect.height || window.innerHeight) * dpr;
            this.ctx.scale(dpr, dpr);
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
        }

        _setupWindowEvents() {
            window.addEventListener('resize', () => {
                const rect = this.canvas.parentElement.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                this.canvas.width = (rect.width || window.innerWidth) * dpr;
                this.canvas.height = (rect.height || window.innerHeight) * dpr;
                this.ctx.scale(dpr, dpr);
                this.requestRender();
            });
        }

        // --- Data Management & Sync Hooks ---

        loadStrokes(strokesArray) {
            this.strokes = strokesArray || [];
            this.requestRender();
        }

        addRemoteStroke(stroke) {
            // Avoid duplicate strokes
            if (!this.strokes.some(s => s.id === stroke.id)) {
                this.strokes.push(stroke);
                this.requestRender();
            }
        }

        removeRemoteStroke(strokeId) {
            const idx = this.strokes.findIndex(s => s.id === strokeId);
            if (idx !== -1) {
                this.strokes.splice(idx, 1);
                this.requestRender();
            }
        }

        loadImages(imagesArray) {
            this.images = imagesArray || [];
            this.requestRender();
        }

        addRemoteImage(imageObj) {
            const idx = this.images.findIndex(img => img.id === imageObj.id);
            if (idx !== -1) {
                // Update position/size
                Object.assign(this.images[idx], imageObj);
            } else {
                this.images.push(imageObj);
            }
            this.requestRender();
        }

        removeRemoteImage(imageId) {
            const idx = this.images.findIndex(img => img.id === imageId);
            if (idx !== -1) {
                this.images.splice(idx, 1);
                if (this.selectedImage && this.selectedImage.id === imageId) {
                    this.selectedImage = null;
                }
                this.requestRender();
            }
        }

        setReadOnly(isReadOnly) {
            this.options.readOnly = isReadOnly;
            if (isReadOnly && !this.options.adminMode) {
                this.activeTool = 'hand';
            }
            this.requestRender();
        }

        setAdminMode(isAdmin) {
            this.options.adminMode = isAdmin;
            this.requestRender();
        }

        _generateUUID() {
            return 'stroke_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        }
    }

    window.MuralEngine = MuralEngine;
    window.MURAL_CANONICAL_WIDTH = CANONICAL_WIDTH;
    window.MURAL_CANONICAL_HEIGHT = CANONICAL_HEIGHT;

})(window);
