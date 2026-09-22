/**
 * Verba Vitae - 3D Interactive Rotating Book Model
 * Self-contained Three.js 3D Book with custom procedural textures,
 * 360° continuous rotation, realistic studio lighting, and drag controls.
 */

(function () {
    'use strict';

    function startBook3D() {
        if (typeof THREE === 'undefined') {
            setTimeout(startBook3D, 50);
            return;
        }

        const container = document.getElementById('book-3d-container');
        if (!container) return;

        // Clear any previous children (prevents duplicate canvases on reload)
        container.innerHTML = '';

        // --- Dimensions & Canvas Setup ---
        let width = container.clientWidth || 340;
        let height = container.clientHeight || 290;

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        camera.position.set(0, 0, 7.4);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        if (renderer.toneMapping !== undefined) {
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.2;
        }
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.outline = 'none';
        container.appendChild(renderer.domElement);

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
        scene.add(ambientLight);

        // Main Warm Key Light
        const keyLight = new THREE.DirectionalLight(0xfffaee, 2.2);
        keyLight.position.set(5, 7, 6);
        scene.add(keyLight);

        // Cool Blue Fill Light
        const fillLight = new THREE.DirectionalLight(0x88b0ff, 1.2);
        fillLight.position.set(-6, -2, -4);
        scene.add(fillLight);

        // Top-Back Rim Light (accents spine and gold foil highlights)
        const rimLight = new THREE.DirectionalLight(0xfff0d0, 1.8);
        rimLight.position.set(0, 8, -5);
        scene.add(rimLight);

        // --- Canvas-Based Procedural Textures (100% Offline & CORS-Safe) ---

        // Helper: create gold gradient on 2D context
        function createGoldGradient(ctx, x1, y1, x2, y2) {
            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
            grad.addColorStop(0, '#c59b27');
            grad.addColorStop(0.25, '#f3e5ab');
            grad.addColorStop(0.5, '#d4af37');
            grad.addColorStop(0.75, '#fff6cc');
            grad.addColorStop(1, '#b8860b');
            return grad;
        }

        // Helper: draw leather noise grain
        function drawLeatherGrain(ctx, w, h, density) {
            const count = (w * h * density) / 1000;
            for (let i = 0; i < count; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const r = Math.random() * 1.5 + 0.5;
                const isLight = Math.random() > 0.45;
                ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.08)';
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Helper: draw ornate corner flourish
        function drawCornerOrnament(ctx, x, y, size, flipX, flipY) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size, 0);
            ctx.quadraticCurveTo(size * 0.4, size * 0.1, size * 0.3, size * 0.3);
            ctx.quadraticCurveTo(size * 0.1, size * 0.4, 0, size);
            ctx.closePath();
            ctx.fill();

            // Inner curly filigree loops
            ctx.beginPath();
            ctx.arc(size * 0.25, size * 0.25, size * 0.12, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        }

        // 1. FRONT COVER TEXTURE (Luxury Navy Leather + Gold Foil Verba Vitae)
        function generateFrontCoverCanvas() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1400;
            const ctx = canvas.getContext('2d');

            // Dark Royal Navy Leather Gradient
            const bgGrad = ctx.createRadialGradient(512, 700, 50, 512, 700, 800);
            bgGrad.addColorStop(0, '#162244');
            bgGrad.addColorStop(0.7, '#0d152b');
            bgGrad.addColorStop(1, '#080d1c');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1024, 1400);

            // Realistic leather texture grain
            drawLeatherGrain(ctx, 1024, 1400, 25);

            // Outer Gold Border
            const goldStroke = createGoldGradient(ctx, 60, 60, 964, 1340);
            ctx.strokeStyle = goldStroke;
            ctx.lineWidth = 6;
            ctx.strokeRect(60, 60, 904, 1280);

            // Inner Fine Gold Line
            ctx.lineWidth = 2.5;
            ctx.strokeRect(80, 80, 864, 1240);
            ctx.lineWidth = 1.5;
            ctx.strokeRect(95, 95, 834, 1210);

            // Ornate Corner Flourishes
            ctx.fillStyle = goldStroke;
            drawCornerOrnament(ctx, 95, 95, 120, false, false);
            drawCornerOrnament(ctx, 929, 95, 120, true, false);
            drawCornerOrnament(ctx, 95, 1305, 120, false, true);
            drawCornerOrnament(ctx, 929, 1305, 120, true, true);

            // Central Medallion (Gold Laurel & Sunburst)
            const cx = 512;
            const cy = 520;
            const radius = 180;

            ctx.save();
            // Sunburst rays
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
            ctx.lineWidth = 2;
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 18) {
                const x1 = cx + Math.cos(angle) * (radius - 40);
                const y1 = cy + Math.sin(angle) * (radius - 40);
                const x2 = cx + Math.cos(angle) * (radius + 20);
                const y2 = cy + Math.sin(angle) * (radius + 20);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // Ornate Center Ring
            ctx.strokeStyle = goldStroke;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 15, 0, Math.PI * 2);
            ctx.stroke();

            // Open Book & Feather Icon inside Medallion
            ctx.fillStyle = goldStroke;
            ctx.beginPath();
            // Left page
            ctx.moveTo(cx - 5, cy + 25);
            ctx.quadraticCurveTo(cx - 45, cy - 35, cx - 80, cy - 30);
            ctx.lineTo(cx - 80, cy + 35);
            ctx.quadraticCurveTo(cx - 45, cy + 30, cx - 5, cy + 60);
            ctx.closePath();
            ctx.fill();

            // Right page
            ctx.beginPath();
            ctx.moveTo(cx + 5, cy + 25);
            ctx.quadraticCurveTo(cx + 45, cy - 35, cx + 80, cy - 30);
            ctx.lineTo(cx + 80, cy + 35);
            ctx.quadraticCurveTo(cx + 45, cy + 30, cx + 5, cy + 60);
            ctx.closePath();
            ctx.fill();

            // Feather / Quill
            ctx.beginPath();
            ctx.moveTo(cx + 35, cy - 70);
            ctx.quadraticCurveTo(cx - 10, cy - 10, cx - 4, cy + 40);
            ctx.quadraticCurveTo(cx + 15, cy - 10, cx + 35, cy - 70);
            ctx.fill();

            // Laurel leaves around circle
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                const lx = cx + Math.cos(a) * (radius + 10);
                const ly = cy + Math.sin(a) * (radius + 10);
                ctx.beginPath();
                ctx.ellipse(lx, ly, 10, 5, a + Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();

            // Gold Embossed Typography: "VERBA VITAE"
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Title
            ctx.font = 'bold 74px "Montserrat", "Cinzel", "Times New Roman", serif';
            ctx.fillStyle = goldStroke;
            ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
            ctx.shadowBlur = 12;
            ctx.fillText('VERBA VITAE', cx, 860);

            // Subtitle
            ctx.font = '600 36px "Montserrat", sans-serif';
            ctx.letterSpacing = '8px';
            ctx.fillText('ORGANIZATION', cx, 935);

            // Decorative Divider Line
            ctx.strokeStyle = goldStroke;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 160, 985);
            ctx.lineTo(cx + 160, 985);
            ctx.stroke();

            // Diamond Accent in Divider
            ctx.beginPath();
            ctx.moveTo(cx, 977);
            ctx.lineTo(cx + 8, 985);
            ctx.lineTo(cx, 993);
            ctx.lineTo(cx - 8, 985);
            ctx.closePath();
            ctx.fill();

            // Latin Motto
            ctx.font = 'italic 24px "Montserrat", serif';
            ctx.fillStyle = 'rgba(243, 229, 171, 0.85)';
            ctx.shadowBlur = 0;
            ctx.fillText('AD ASTRA PER LINGUAM ET LITTERAS', cx, 1040);
            ctx.restore();

            const tex = new THREE.CanvasTexture(canvas);
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            return tex;
        }

        // 2. BACK COVER TEXTURE
        function generateBackCoverCanvas() {
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 1400;
            const ctx = canvas.getContext('2d');

            // Dark Navy Gradient
            const bgGrad = ctx.createRadialGradient(512, 700, 50, 512, 700, 800);
            bgGrad.addColorStop(0, '#141e3d');
            bgGrad.addColorStop(0.7, '#0d152b');
            bgGrad.addColorStop(1, '#080d1c');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1024, 1400);

            drawLeatherGrain(ctx, 1024, 1400, 20);

            // Gold framing
            const goldStroke = createGoldGradient(ctx, 60, 60, 964, 1340);
            ctx.strokeStyle = goldStroke;
            ctx.lineWidth = 6;
            ctx.strokeRect(60, 60, 904, 1280);
            ctx.lineWidth = 2.5;
            ctx.strokeRect(80, 80, 864, 1240);

            // Corner flourishes
            ctx.fillStyle = goldStroke;
            drawCornerOrnament(ctx, 80, 80, 100, false, false);
            drawCornerOrnament(ctx, 944, 80, 100, true, false);
            drawCornerOrnament(ctx, 80, 1320, 100, false, true);
            drawCornerOrnament(ctx, 944, 1320, 100, true, true);

            // Central VV Crest
            const cx = 512;
            const cy = 700;
            ctx.strokeStyle = goldStroke;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(cx, cy, 90, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, 75, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = goldStroke;
            ctx.font = 'bold 50px "Montserrat", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('VV', cx, cy);

            const tex = new THREE.CanvasTexture(canvas);
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            return tex;
        }

        // 3. SPINE TEXTURE
        function generateSpineCanvas() {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 1400;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#0c1428';
            ctx.fillRect(0, 0, 300, 1400);
            drawLeatherGrain(ctx, 300, 1400, 20);

            const gold = createGoldGradient(ctx, 20, 0, 280, 1400);

            // 5 Raised Gold Spine Ribs
            const ribs = [140, 380, 1020, 1260];
            ribs.forEach(y => {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(20, y + 10, 260, 4);
                ctx.fillStyle = gold;
                ctx.fillRect(20, y, 260, 10);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(20, y - 2, 260, 2);
            });

            // Spine Gold Framing
            ctx.strokeStyle = gold;
            ctx.lineWidth = 3;
            ctx.strokeRect(35, 180, 230, 800);

            // Vertical Text: VERBA VITAE
            ctx.save();
            ctx.translate(150, 580);
            ctx.rotate(Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 44px "Montserrat", serif';
            ctx.fillStyle = gold;
            ctx.shadowColor = 'rgba(212, 175, 55, 0.8)';
            ctx.shadowBlur = 10;
            ctx.fillText('VERBA  VITAE', 0, 0);
            ctx.restore();

            const tex = new THREE.CanvasTexture(canvas);
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            return tex;
        }

        // 4. PAGES EDGES TEXTURE (Realistic Paper Ridges)
        function generatePagesCanvas() {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');

            // Ivory/Cream Paper Block Base
            ctx.fillStyle = '#f8f4ec';
            ctx.fillRect(0, 0, 512, 512);

            // Subtle paper sheet line ridges
            for (let y = 0; y < 512; y += 2) {
                const alpha = 0.08 + Math.random() * 0.12;
                const shade = Math.floor(190 + Math.random() * 35);
                ctx.fillStyle = `rgba(${shade}, ${shade - 15}, ${shade - 30}, ${alpha})`;
                ctx.fillRect(0, y, 512, 1);
            }

            // Gilded edge shimmer on outer edge
            const goldEdge = ctx.createLinearGradient(0, 0, 80, 0);
            goldEdge.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
            goldEdge.addColorStop(1, 'rgba(212, 175, 55, 0)');
            ctx.fillStyle = goldEdge;
            ctx.fillRect(0, 0, 512, 512);

            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            return tex;
        }

        // 5. SHADOW TEXTURE
        function generateShadowCanvas() {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const ctx = canvas.getContext('2d');

            const radGrad = ctx.createRadialGradient(128, 128, 15, 128, 128, 115);
            radGrad.addColorStop(0, 'rgba(10, 18, 40, 0.45)');
            radGrad.addColorStop(0.5, 'rgba(10, 18, 40, 0.15)');
            radGrad.addColorStop(1, 'rgba(10, 18, 40, 0)');
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, 256, 256);

            return new THREE.CanvasTexture(canvas);
        }

        // --- Build 3D Mesh Hierarchy ---
        const bookGroup = new THREE.Group();
        scene.add(bookGroup);

        // Dimensions
        const bW = 2.45;     // Width
        const bH = 3.35;     // Height
        const bD = 0.58;     // Total Thickness
        const cThick = 0.06; // Hardcover thickness
        const margin = 0.08; // Cover overhang

        // Textures
        const frontTex = generateFrontCoverCanvas();
        const backTex = generateBackCoverCanvas();
        const spineTex = generateSpineCanvas();
        const pagesTex = generatePagesCanvas();
        const shadowTex = generateShadowCanvas();

        // Optional: If local cover image is available, load it smoothly
        try {
            const imgLoader = new THREE.TextureLoader();
            imgLoader.load('images/book_cover.jpg', function (loadedTex) {
                loadedTex.generateMipmaps = true;
                loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
                frontCoverMat.map = loadedTex;
                frontCoverMat.needsUpdate = true;
            }, undefined, function () {
                // Keep procedural canvas texture on error
            });
        } catch (e) {
            // Safe fallback
        }

        // Materials
        const darkNavyLeatherMat = new THREE.MeshStandardMaterial({
            color: 0x091024,
            roughness: 0.5,
            metalness: 0.15
        });

        const frontCoverMat = new THREE.MeshStandardMaterial({
            map: frontTex,
            roughness: 0.32,
            metalness: 0.28
        });

        const backCoverMat = new THREE.MeshStandardMaterial({
            map: backTex,
            roughness: 0.38,
            metalness: 0.22
        });

        const spineMat = new THREE.MeshStandardMaterial({
            map: spineTex,
            roughness: 0.35,
            metalness: 0.25
        });

        const pagesMat = new THREE.MeshStandardMaterial({
            map: pagesTex,
            roughness: 0.85,
            metalness: 0.05,
            color: 0xfffaef
        });

        // 1. Pages Block
        const pW = bW - margin;
        const pH = bH - margin * 2;
        const pD = bD - cThick * 2;
        const pagesGeo = new THREE.BoxGeometry(pW, pH, pD);
        const pagesMaterials = [
            pagesMat,            // Right (+X)
            darkNavyLeatherMat,  // Left Spine (-X)
            pagesMat,            // Top (+Y)
            pagesMat,            // Bottom (-Y)
            new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.9 }), // Front
            new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.9 })  // Back
        ];
        const pagesMesh = new THREE.Mesh(pagesGeo, pagesMaterials);
        pagesMesh.position.set(margin / 2, 0, 0);
        bookGroup.add(pagesMesh);

        // 2. Front Hardcover
        const frontCoverGeo = new THREE.BoxGeometry(bW, bH, cThick);
        const frontCoverMaterials = [
            darkNavyLeatherMat,
            darkNavyLeatherMat,
            darkNavyLeatherMat,
            darkNavyLeatherMat,
            frontCoverMat, // Front
            new THREE.MeshStandardMaterial({ color: 0x070c1b, roughness: 0.8 }) // Inside
        ];
        const frontCoverMesh = new THREE.Mesh(frontCoverGeo, frontCoverMaterials);
        frontCoverMesh.position.set(0, 0, (pD / 2) + (cThick / 2));
        bookGroup.add(frontCoverMesh);

        // 3. Back Hardcover
        const backCoverGeo = new THREE.BoxGeometry(bW, bH, cThick);
        const backCoverMaterials = [
            darkNavyLeatherMat,
            darkNavyLeatherMat,
            darkNavyLeatherMat,
            darkNavyLeatherMat,
            new THREE.MeshStandardMaterial({ color: 0x070c1b, roughness: 0.8 }), // Inside
            backCoverMat // Back
        ];
        const backCoverMesh = new THREE.Mesh(backCoverGeo, backCoverMaterials);
        backCoverMesh.position.set(0, 0, -(pD / 2) - (cThick / 2));
        bookGroup.add(backCoverMesh);

        // 4. Curved Spine
        const spineRadius = bD / 2;
        const spineGeo = new THREE.CylinderGeometry(
            spineRadius,
            spineRadius,
            bH,
            28,
            1,
            false,
            Math.PI * 0.5,
            Math.PI
        );
        const spineMesh = new THREE.Mesh(spineGeo, spineMat);
        spineMesh.position.set(-bW / 2, 0, 0);
        bookGroup.add(spineMesh);

        // 5. Silk Crimson Ribbon Bookmark with Gold Tip
        const ribbonCurve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0.2, -pH / 2, 0),
            new THREE.Vector3(0.3, -pH / 2 - 0.4, 0.15),
            new THREE.Vector3(0.15, -pH / 2 - 0.85, -0.1),
            new THREE.Vector3(0.35, -pH / 2 - 1.2, 0.08)
        );
        const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 32, 0.038, 8, false);
        const ribbonMat = new THREE.MeshStandardMaterial({
            color: 0xa81525,
            roughness: 0.3,
            metalness: 0.15
        });
        const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
        bookGroup.add(ribbonMesh);

        const tasselGeo = new THREE.ConeGeometry(0.065, 0.16, 12);
        const tasselMat = new THREE.MeshStandardMaterial({
            color: 0xd4af37,
            roughness: 0.25,
            metalness: 0.85
        });
        const tasselMesh = new THREE.Mesh(tasselGeo, tasselMat);
        tasselMesh.position.set(0.35, -pH / 2 - 1.25, 0.08);
        tasselMesh.rotation.x = Math.PI;
        bookGroup.add(tasselMesh);

        // Initial Aesthetic Tilt
        bookGroup.rotation.x = 0.2;
        bookGroup.rotation.z = -0.05;

        // --- Drag Controls (Mouse / Touch) ---
        let isDragging = false;
        let prevX = 0;
        let prevY = 0;
        let velX = 0;
        let velY = 0;
        const autoSpinSpeed = 0.012; // Continuous 360 degree rotation speed

        function onPointerDown(e) {
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            prevX = clientX;
            prevY = clientY;
            renderer.domElement.style.cursor = 'grabbing';
        }

        function onPointerMove(e) {
            if (!isDragging) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const dx = clientX - prevX;
            const dy = clientY - prevY;

            velX = dx * 0.009;
            velY = dy * 0.006;

            bookGroup.rotation.y += velX;
            bookGroup.rotation.x = Math.max(-0.5, Math.min(0.7, bookGroup.rotation.x + velY));

            prevX = clientX;
            prevY = clientY;
        }

        function onPointerUp() {
            isDragging = false;
            renderer.domElement.style.cursor = 'grab';
        }

        renderer.domElement.style.cursor = 'grab';
        renderer.domElement.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        renderer.domElement.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('touchend', onPointerUp);

        // --- Animation Loop ---
        let startTime = performance.now();

        function animate() {
            requestAnimationFrame(animate);

            const elapsed = (performance.now() - startTime) * 0.001;

            // 360° Continuous Auto-Spin with smooth inertia dampening
            if (!isDragging) {
                velX *= 0.94;
                velY *= 0.94;
                bookGroup.rotation.y += autoSpinSpeed + velX;
                // Gently restore default pitch
                bookGroup.rotation.x += (0.2 - bookGroup.rotation.x) * 0.02 + velY;
            }

            // Floating Bobbing Wave
            bookGroup.position.y = Math.sin(elapsed * 1.8) * 0.12;

            renderer.render(scene, camera);
        }

        // Start render loop immediately
        animate();

        // --- Resize Handler ---
        function handleResize() {
            if (!container || !renderer || !camera) return;
            const newW = container.clientWidth || 340;
            const newH = container.clientHeight || 290;

            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();

            renderer.setSize(newW, newH);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }

        window.addEventListener('resize', handleResize);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startBook3D);
    } else {
        startBook3D();
    }
})();
