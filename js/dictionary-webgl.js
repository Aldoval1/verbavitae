import * as THREE from './vendor/three.module.js';

// Actual WebGL geometry: solid covers, a rounded spine, paper blocks and
// segmented, deformable leaves. The DOM dictionary remains the accessible fallback.
const host = document.getElementById('hero-dict-scene');
const track = document.getElementById('hero-scroll-track');
const stage = document.getElementById('hero-sticky-stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const W = 2.65, H = 3.72, SEGMENTS = 56;
const clamp = x => Math.max(0, Math.min(1, x));
const phase = (p, a, b) => clamp((p - a) / (b - a));
const smooth = t => t * t * (3 - 2 * t);
const mix = (a, b, t) => a + (b - a) * t;
let renderer;
try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
} catch (error) {
    console.warn('WebGL dictionary unavailable; using the accessible book fallback.', error);
}
if (renderer) init().catch(error => {
    renderer.dispose();
    renderer.domElement.remove();
    host.classList.remove('has-webgl');
    console.warn('3D dictionary could not load; retaining the accessible fallback.', error);
});

async function init() {
    await document.fonts.ready;
    const loadImage = src => new Promise((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
    });
    const [paperImage, leatherImage] = await Promise.all([
        loadImage('images/dictionary/paper.jpg'), loadImage('images/dictionary/brown-leather.jpg')
    ]);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'dictionary-webgl';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 60);
    camera.position.set(0, 0, 10);
    const root = new THREE.Group(); scene.add(root);
    const body = new THREE.Group(); root.add(body);
    scene.add(new THREE.HemisphereLight(0xe7efff, 0x493425, 1.25));
    const key = new THREE.DirectionalLight(0xffedcf, 2.5);
    key.position.set(-3, 6, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -7;
    key.shadow.camera.right = key.shadow.camera.top = 7;
    key.shadow.normalBias = .018;
    key.shadow.bias = -.00015;
    key.shadow.radius = 3;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x5a9eff, 1.5);
    rim.position.set(5, -1, 3); scene.add(rim);
    const texture = canvas => {
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return t;
    };
    function canvasContext(width = 1024, height = 1440) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        return [canvas, canvas.getContext('2d')];
    }
    function wrap(ctx, text, x, y, maxWidth, lineHeight) {
        let line = '';
        for (const word of text.trim().split(/\s+/)) {
            const next = line ? `${line} ${word}` : word;
            if (ctx.measureText(next).width > maxWidth && line) {
                ctx.fillText(line, x, y); y += lineHeight; line = word;
            } else line = next;
        }
        ctx.fillText(line, x, y);
        return y + lineHeight;
    }
    function pageTexture(title, entries, number, definition = false) {
        const [canvas, ctx] = canvasContext();
        ctx.drawImage(paperImage, 0, 0, 1024, 1440);
        ctx.fillStyle = '#f4e8ce'; ctx.globalAlpha = .46; ctx.fillRect(0, 0, 1024, 1440); ctx.globalAlpha = 1;
        const gradient = ctx.createLinearGradient(0, 0, 1024, 0);
        gradient.addColorStop(0, '#30201266'); gradient.addColorStop(.09, '#d9cdb322'); gradient.addColorStop(.85, '#fff8e300'); gradient.addColorStop(1, '#87704c22');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1024, 1440);
        ctx.fillStyle = '#514839'; ctx.font = '600 24px Cinzel, Georgia';
        ctx.fillText(title, 82, 94); ctx.fillText(number, 906, 94);
        ctx.strokeStyle = '#77684d66'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(82, 119); ctx.lineTo(943, 119); ctx.stroke();
        ctx.fillStyle = '#292117';
        if (definition) {
            ctx.font = '600 36px "EB Garamond", Georgia';
            ctx.fillText('cre·a·tive', 85, 198);
            ctx.font = '32px "EB Garamond", Georgia';
            wrap(ctx, 'adj. Having the power to create; characterized by imagination and original thought.', 85, 247, 840, 43);
            ctx.font = 'italic 31px "EB Garamond", Georgia';
            ctx.fillText('/kriˈeɪ.tɪv ˈlæb/    n. phr.', 85, 555);
            ctx.fillStyle = '#74654c'; ctx.font = '25px "EB Garamond", Georgia';
            ctx.fillText('Verba Vitae · Dictionary of Living Arts', 85, 596);
            ctx.fillStyle = '#292117'; ctx.font = '39px "EB Garamond", Georgia';
            let y = 688;
            entries.forEach((entry, i) => { y = wrap(ctx, `${i + 1}.  ${entry}`, 85, y, 835, 51) + 42; });
            ctx.fillStyle = '#63533d'; ctx.font = 'italic 32px "EB Garamond", Georgia';
            wrap(ctx, '“Words become worlds. Make something move.”', 98, y + 8, 810, 43);
            ctx.strokeStyle = '#77684d55'; ctx.beginPath(); ctx.moveTo(85, 1254); ctx.lineTo(943, 1254); ctx.stroke();
            ctx.fillStyle = '#544632'; ctx.font = '29px "EB Garamond", Georgia';
            wrap(ctx, 'cre·scen·do  n. A gradual increase in intensity, resonance, or visual drama.', 85, 1308, 835, 38);
        } else {
            let y = 199;
            entries.forEach(entry => {
                const split = entry.indexOf(' ');
                ctx.font = '700 39px "EB Garamond", Georgia';
                ctx.fillText(entry.slice(0, split), 85, y); y += 52;
                ctx.font = '35px "EB Garamond", Georgia';
                y = wrap(ctx, entry.slice(split + 1), 85, y, 830, 47) + 67;
            });
        }
        return texture(canvas);
    }
    const definitionEntries = [...document.querySelectorAll('.dict-def-list li')].map(el => el.textContent);
    const targetTexture = pageTexture('CREATIVE — CRESCENDO', definitionEntries, '412', true);
    function standard(map, extras = {}) {
        return new THREE.MeshStandardMaterial({map, roughness: .9, metalness: 0, ...extras});
    }
    const leatherMap = texture(leatherImage);
    const leather = standard(leatherMap, {color: 0x15243d, roughness: .72, metalness: .12, bumpMap: leatherMap, bumpScale: .025});
    const gold = standard(null, {color: 0xd6ad55, roughness: .28, metalness: .8});
    const [edgeCanvas, edgeCtx] = canvasContext(64, 512);
    edgeCtx.fillStyle = '#ddd0b1'; edgeCtx.fillRect(0, 0, 64, 512);
    for (let y = 0; y < 512; y += 5) {
        edgeCtx.fillStyle = y % 3 === 0 ? '#a89978' : '#f7efd9'; edgeCtx.fillRect(0, y, 64, 1);
    }
    const edge = standard(texture(edgeCanvas), {roughness: 1});
    function solid(w, h, d, material, x, z, parent = body) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(x, 0, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    }
    solid(W + .16, H + .18, .11, leather, W / 2, -.08);
    const rightBlock = solid(W - .035, H - .035, .26, edge, W / 2, .105);
    const leftBlock = solid(W - .035, H - .035, .26, edge, -W / 2, .105);
    const leftBack = solid(W + .16, H + .18, .11, leather, -W / 2, -.08);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(.21, .21, H + .18, 24), leather);
    spine.position.set(-.025, 0, .06); spine.castShadow = true; body.add(spine);
    // Raised bands on a rounded, solid spine.
    const spineBands = [];
    for (const y of [-1.35, -1.18, 1.18, 1.35]) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(.214, .018, 6, 32), gold);
        band.rotation.x = Math.PI / 2; band.position.set(-.025, y, .06); body.add(band); spineBands.push(band);
    }
    const target = new THREE.Mesh(new THREE.PlaneGeometry(W, H), standard(targetTexture));
    target.position.set(W / 2, 0, .245); target.receiveShadow = true; body.add(target);
    // Front cover: 3D box with an independently lit, embossed outer surface.
    const [coverCanvas, cc] = canvasContext();
    cc.drawImage(leatherImage, 0, 0, 1024, 1440); cc.fillStyle = '#091b33dc'; cc.fillRect(0, 0, 1024, 1440);
    cc.strokeStyle = '#c6a658'; cc.lineWidth = 5; cc.strokeRect(67, 66, 890, 1308); cc.lineWidth = 2; cc.strokeRect(84, 83, 856, 1274);
    cc.fillStyle = '#d9bb74'; cc.textAlign = 'center'; cc.font = '32px Cinzel, Georgia'; cc.fillText('EDITION MMXXVI', 512, 300);
    cc.font = '700 113px Cinzel, Georgia'; cc.fillText('LEXICON', 512, 630);
    cc.font = '44px Cinzel, Georgia'; cc.fillText('VERBA VITAE', 512, 730);
    cc.font = '88px Georgia'; cc.fillText('✦', 512, 930);
    cc.font = '25px Cinzel, Georgia'; cc.fillText('DICTIONARY OF LIVING ARTS', 512, 1220);
    const coverMap = texture(coverCanvas);
    const coverFront = standard(coverMap, {roughness: .6, metalness: .24, bumpMap: coverMap, bumpScale: .018});
    const coverInside = standard(pageTexture('VERBA VITAE', ['ex·libris The archive of living words.', 'imagination A beginning without a boundary.'], 'I'));
    const hinge = new THREE.Group(); hinge.position.set(0, 0, .36); body.add(hinge);
    solid(W + .14, H + .16, .105, [leather, leather, leather, leather, coverFront, coverInside], W / 2, .025, hinge);
    const leaves = [];
    for (let i = 0; i < 6; i++) {
        const element = document.querySelector(`[data-leaf-index="${i}"]`);
        const front = element.querySelector('.dict-leaf-front');
        const back = element.querySelector('.dict-leaf-back');
        const getEntries = el => [...el.querySelectorAll('.dict-columns p')].map(p => p.textContent);
        const frontMap = pageTexture(front.querySelector('.dict-running-header span').textContent, getEntries(front), String(14 + i * 78));
        const backMap = pageTexture(back.querySelector('.dict-running-header span:last-child').textContent, getEntries(back), String(15 + i * 78));
        backMap.wrapS = THREE.RepeatWrapping; backMap.repeat.x = -1; backMap.offset.x = 1;
        const geo = new THREE.PlaneGeometry(W, H, SEGMENTS, 8);
        const frontMesh = new THREE.Mesh(geo, standard(frontMap, {side: THREE.FrontSide}));
        const backMesh = new THREE.Mesh(geo, standard(backMap, {side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1}));
        frontMesh.castShadow = frontMesh.receiveShadow = backMesh.castShadow = backMesh.receiveShadow = true;
        body.add(frontMesh, backMesh);
        leaves.push({geo, frontMesh, backMesh, index: i, last: -1});
    }
    // A separate text mesh survives the blackout. All definition text otherwise
    // lives on the paper material and bends with the physical page.
    const [wordCanvas, wc] = canvasContext(1024, 160);
    wc.fillStyle = '#fff'; wc.font = '800 136px "EB Garamond", Georgia'; wc.textAlign = 'center'; wc.textBaseline = 'middle';
    wc.fillText('Creative Lab', 512, 83);
    const wordMaterial = new THREE.MeshBasicMaterial({map:texture(wordCanvas), color:0x17120d, transparent:true, depthWrite:false, side:THREE.DoubleSide});
    const headword = new THREE.Mesh(new THREE.PlaneGeometry(W * .84, W * .84 * 160 / 1024), wordMaterial);
    const wordPosition = new THREE.Vector3(W * .51, H * (.5 - 470 / 1440), .249);
    headword.position.copy(wordPosition); root.add(headword);
    const fadingMaterials = new Set();
    body.traverse(object => {
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => fadingMaterials.add(m));
    });
    host.classList.add('has-webgl');
    let pending = false;
    let viewWidth = 1, viewHeight = 1;
    let previousDark = -1;
    function resize() {
        const width = stage.clientWidth, height = stage.clientHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height; camera.updateProjectionMatrix();
        viewHeight = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(35 / 2)); viewWidth = viewHeight * camera.aspect;
        schedule();
    }
    function deform(leaf, t) {
        if (Math.abs(leaf.last - t) < .0001) return;
        leaf.last = t;
        const xValues = [0], zValues = [0], dx = W / SEGMENTS;
        for (let i = 1; i <= SEGMENTS; i++) {
            const u = (i - .5) / SEGMENTS;
            // Different local angles along the paper give a continuous curled
            // surface instead of rotating a rigid rectangular card.
            const angle = Math.PI * t + Math.sin(Math.PI * t) * .85 * Math.sin(u * Math.PI * 1.15);
            xValues[i] = xValues[i - 1] + Math.cos(angle) * dx;
            zValues[i] = zValues[i - 1] + Math.sin(angle) * dx;
        }
        const positions = leaf.geo.attributes.position;
        const layer = mix(.32 - leaf.index * .012, .27 + leaf.index * .008, t);
        for (let v = 0; v < positions.count; v++) {
            const column = v % (SEGMENTS + 1), row = Math.floor(v / (SEGMENTS + 1));
            const y = H / 2 - row * H / 8;
            const bow = Math.sin(Math.PI * column / SEGMENTS) * Math.sin(Math.PI * t);
            positions.setXYZ(v, xValues[column], y + bow * .06 * y, layer + zValues[column] + bow * .045);
        }
        positions.needsUpdate = true; leaf.geo.computeVertexNormals();
        leaf.geo.computeBoundingSphere();
    }
    function render() {
        pending = false;
        const p = clamp(-track.getBoundingClientRect().top / Math.max(1, track.offsetHeight - innerHeight));
        renderer.domElement.style.visibility = p < .37 ? 'hidden' : 'visible';
        if (p < .37 || track.getBoundingClientRect().bottom < 0) return;
        const enter = smooth(phase(p, .37, .58));
        const open = reduce.matches ? 1 : smooth(phase(p, .445, .565));
        const focus = reduce.matches ? 1 : smooth(phase(p, .565, .815));
        const dark = smooth(phase(p, .89, .96));
        const restScale = Math.min(viewWidth * .84 / (W * 2.2), viewHeight * .55 / H);
        const readingScale = Math.min(viewWidth * .91 / W, viewHeight * .78 / H);
        // Reframing and leafing share the same interval. The last leaf settles
        // at .815, exactly when the book reaches its final reading pose.
        const leafTurns = leaves.map(leaf => reduce.matches ? 1 : smooth(phase(p, .555 + leaf.index * .037, .630 + leaf.index * .037)));
        const lift = Math.max(...leafTurns.map(t => Math.sin(Math.PI * t)));
        const scale = reduce.matches ? readingScale : mix(mix(restScale * .5, restScale, enter), readingScale, focus) / (1 + .35 * lift * focus);
        root.scale.setScalar(scale);
        root.position.set(mix(viewWidth * .4, 0, enter) - W * .5 * scale * focus, mix(-viewHeight * .35, -.12, enter), 0);
        root.rotation.set(reduce.matches ? 0 : mix(-.6, -.48 * (1 - focus), enter), reduce.matches ? 0 : mix(-.55, -.30 * (1 - focus), enter), reduce.matches ? 0 : mix(-.35, .04 * (1 - focus), enter));
        spineBands.forEach(band => { band.visible = open < .4; });
        hinge.rotation.y = -Math.PI * open;
        hinge.position.z = mix(.36, -.02, open);
        leftBlock.visible = leftBack.visible = open > .85;
        leftBlock.scale.z = phase(p, .555, .815);
        leaves.forEach((leaf, index) => deform(leaf, leafTurns[index]));
        const center = reduce.matches ? 0 : smooth(phase(p, .94, .995));
        headword.position.set(mix(wordPosition.x, -root.position.x / scale, center), mix(wordPosition.y, -root.position.y / scale, center), .249);
        headword.scale.setScalar(mix(1, 1.2, center));
        wordMaterial.color.setRGB(mix(.015, .93, dark), mix(.011, .87, dark), mix(.006, .72, dark));
        if (Math.abs(previousDark - dark) > .0001) {
            fadingMaterials.forEach(material => {
                const transparent = dark > 0;
                if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
                material.opacity = 1 - dark;
            }); previousDark = dark;
        }
        body.visible = dark < .999;
        renderer.render(scene, camera);
        host.dataset.renderer = 'webgl';
        host.dataset.reframe = focus.toFixed(3);
        host.dataset.turningLeaves = String(leafTurns.filter(t => t > .001 && t < .999).length);
    }
    function schedule() { if (!pending) { pending = true; requestAnimationFrame(render); } }
    addEventListener('scroll', schedule, {passive:true});
    addEventListener('resize', resize); reduce.addEventListener('change', schedule);
    renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault(); renderer.domElement.style.display = 'none'; host.classList.remove('has-webgl');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => { renderer.domElement.style.display = ''; host.classList.add('has-webgl'); schedule(); });
    resize();
}
