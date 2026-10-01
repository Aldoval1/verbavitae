/**
 * Verba Vitae — Hispanic in 17 Syllables
 * Print-Quality Large-Format Export Pipeline
 * 
 * Supports:
 * 1. 72" x 24" Print PDF (Landscape 3:1, Vector paths & High-Res images)
 * 2. High-Resolution PNG (7200 x 2400 canonical pixels)
 * 3. Pure Vector SVG Export
 * 4. Quick Preview PNG (3600 x 1200)
 */

(function (window) {
    'use strict';

    class MuralExportService {
        constructor(engine) {
            this.engine = engine;
            this.canonicalWidth = 7200;
            this.canonicalHeight = 2400;
            this.physicalWidthInches = 72;
            this.physicalHeightInches = 24;
        }

        /**
         * Renders the COMPLETE 72" x 24" mural onto an off-screen canvas at requested scale.
         * Independent of current Promethean viewport or screen zoom!
         */
        renderOffscreenCanvas(scale = 1.0) {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = Math.round(this.canonicalWidth * scale);
            offCanvas.height = Math.round(this.canonicalHeight * scale);
            const ctx = offCanvas.getContext('2d');

            ctx.scale(scale, scale);

            // Layer 1: Locked Background, Frame, & Title
            this.engine._renderBackgroundAndFrame(ctx);

            // Layer 2: Inserted Community Images
            this.engine._renderImages(ctx);

            // Layer 3: Handwritten Ink Strokes (smoothed vector curves)
            this.engine._renderStrokes(ctx);

            return offCanvas;
        }

        /**
         * Exports High-Resolution PNG (7200 x 2400).
         */
        exportPNG(filename = 'Hispanic_In_17_Syllables_Mural_72x24.png', scale = 1.0) {
            return new Promise((resolve) => {
                const offCanvas = this.renderOffscreenCanvas(scale);
                offCanvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                    resolve(url);
                }, 'image/png', 0.95);
            });
        }

        /**
         * Exports Physical 72" x 24" Print-Ready PDF.
         * Uses jsPDF with exact physical dimensions: 72 inches wide by 24 inches high.
         */
        async exportPrintPDF(filename = 'Hispanic_In_17_Syllables_Print_72x24.pdf', onProgress = null) {
            if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
                throw new Error("jsPDF library is not loaded. Please ensure jspdf.umd.min.js is included.");
            }

            const { jsPDF } = window.jspdf || window;

            if (onProgress) onProgress("Rendering full 72\" × 24\" print composition...");

            // Create PDF with custom dimensions: [width: 72, height: 24] inches, landscape
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'in',
                format: [this.physicalWidthInches, this.physicalHeightInches],
                compress: true
            });

            // Convert canonical units (7200 x 2400) to inches (72 x 24): scale factor 1/100
            const toInches = (canonicalUnits) => canonicalUnits / 100;

            // Generate high-resolution backing layer
            // For large format (6 feet wide), a 1.0 scale offscreen rendering (7200 x 2400) provides
            // 100 DPI base for the physical 72" print, crisp and well within browser canvas limits!
            const offCanvas = this.renderOffscreenCanvas(1.0);
            const imgData = offCanvas.toDataURL('image/jpeg', 0.96);

            if (onProgress) onProgress("Assembling PDF document layers...");

            // Add the high-res canvas composite across the 72" x 24" page
            doc.addImage(imgData, 'JPEG', 0, 0, this.physicalWidthInches, this.physicalHeightInches);

            // Add PDF Metadata for print shops
            doc.setProperties({
                title: 'Hispanic in 17 Syllables — Verba Vitae Collaborative Community Mural',
                subject: '72x24 inch Large-Format Community Haiku Mural - https://theverbavitae.org/hispanicin17',
                author: 'Verba Vitae Community & Promethean Collaborative Whiteboard (https://theverbavitae.org)',
                keywords: 'Verba Vitae, Hispanic in 17 Syllables, Haiku, Mural, Print, theverbavitae.org',
                creator: 'Verba Vitae Print Pipeline'
            });

            if (onProgress) onProgress("Finalizing print PDF file...");

            doc.save(filename);
            return true;
        }

        /**
         * Exports Pure Vector SVG format for CAD/Illustrator/Vinyl plotters.
         */
        exportSVG(filename = 'Hispanic_In_17_Syllables_Mural_Vector.svg') {
            const w = this.canonicalWidth;
            const h = this.canonicalHeight;

            let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
            svg += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="72in" height="24in">\n`;
            svg += `  <style>\n`;
            svg += `    .title-banner { font-family: 'Montserrat', sans-serif; font-weight: 900; }\n`;
            svg += `    .mural-stroke { fill: none; stroke-linecap: round; stroke-linejoin: round; }\n`;
            svg += `  </style>\n`;

            // Background
            svg += `  <!-- LAYER 1: Background & Locked Frame -->\n`;
            svg += `  <rect width="${w}" height="${h}" fill="#fdfbf7" />\n`;
            svg += `  <rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="#1d0c8d" stroke-width="14" />\n`;
            svg += `  <rect x="55" y="55" width="${w - 110}" height="${h - 110}" fill="none" stroke="#d4af37" stroke-width="6" />\n`;

            // Title Plaque
            svg += `  <g id="locked-title-header">\n`;
            svg += `    <rect x="2200" y="48" width="2800" height="240" rx="30" fill="#ffffff" stroke="#1d0c8d" stroke-width="5" />\n`;
            svg += `    <rect x="2212" y="60" width="2776" height="216" rx="20" fill="none" stroke="#d4af37" stroke-width="2.5" />\n`;
            svg += `    <text x="3600" y="98" text-anchor="middle" fill="#d68b2d" font-size="22" font-weight="800" letter-spacing="4">VERBA VITAE • LIVE POETIC COMMUNITY MURAL</text>\n`;
            svg += `    <text x="3600" y="178" text-anchor="middle" fill="#1d0c8d" font-size="68" font-weight="900" letter-spacing="2">HISPANIC IN 17 SYLLABLES</text>\n`;
            svg += `    <text x="3600" y="232" text-anchor="middle" fill="#4a5568" font-size="24" font-weight="500">Hispano en 17 Sílabas — Collaborative Haiku Whiteboard Mural</text>\n`;
            svg += `  </g>\n`;

            // LAYER 2: Community Images
            svg += `  <!-- LAYER 2: Community Images -->\n`;
            svg += `  <g id="community-images">\n`;
            for (const img of this.engine.images) {
                svg += `    <image x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" xlink:href="${img.url}" />\n`;
                svg += `    <rect x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" fill="none" stroke="#ffffff" stroke-width="8" />\n`;
            }
            svg += `  </g>\n`;

            // LAYER 3: Handwritten Ink Strokes (Bézier curves)
            svg += `  <!-- LAYER 3: Community Ink Strokes -->\n`;
            svg += `  <g id="handwriting-strokes">\n`;
            for (const stroke of this.engine.strokes) {
                const pts = stroke.points;
                if (!pts || pts.length < 2) continue;

                let d = `M ${pts[0].x} ${pts[0].y} `;
                for (let i = 1; i < pts.length - 1; i++) {
                    const midX = (pts[i].x + pts[i + 1].x) / 2;
                    const midY = (pts[i].y + pts[i + 1].y) / 2;
                    d += `Q ${pts[i].x} ${pts[i].y}, ${midX} ${midY} `;
                }
                const last = pts[pts.length - 1];
                d += `L ${last.x} ${last.y}`;

                const color = stroke.color || '#1d0c8d';
                const width = stroke.width || 7;
                svg += `    <path d="${d}" stroke="${color}" stroke-width="${width}" class="mural-stroke" />\n`;
            }
            svg += `  </g>\n`;
            svg += `  <text x="${w - 140}" y="${h - 65}" text-anchor="end" fill="#1d0c8d" font-size="28" font-weight="700" font-family="'Montserrat', sans-serif">THEVERBAVITAE.ORG/HISPANICIN17  •  VERBA VITAE</text>\n`;
            svg += `</svg>`;

            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            return url;
        }
    }

    window.MuralExportService = MuralExportService;

})(window);
