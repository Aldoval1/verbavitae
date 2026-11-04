/** Scroll-directed title, floating dictionary, six leaves, definition and blackout. */
document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('hero-scroll-track');
    const stage = document.getElementById('hero-sticky-stage');
    const logoBox = document.getElementById('hero-logo-box');
    const motionWrapper = document.getElementById('hero-motion-wrapper');
    const frameImg = document.getElementById('hero-motion-frame');
    const scrollCue = document.getElementById('hero-scroll-cue');
    const ambientGlow = document.getElementById('hero-ambient-glow');
    const topNav = document.getElementById('vim-nav');
    const scene = document.getElementById('hero-dict-scene');
    const book = document.getElementById('dict-book-3d');
    const cover = document.getElementById('dict-front-cover');
    const word = document.getElementById('dict-spotlight-word');
    const leaves = [...document.querySelectorAll('.dict-leaf')];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = value => Math.min(1, Math.max(0, value));
    const phase = (value, start, end) => clamp((value - start) / (end - start));
    const ease = value => value * value * (3 - 2 * value);
    const mix = (a, b, t) => a + (b - a) * t;
    const totalFrames = 10;
    const basePath = frameImg?.dataset.basePath || 'images/verba_in_motion_frames/';
    const frames = Array.from({ length: totalFrames }, (_, i) => {
        const image = new Image();
        image.src = `${basePath}frame_${i}.png`;
        image.addEventListener('load', scheduleUpdate);
        return image;
    });
    let currentFrame = -1;
    let ticking = false;
    let pageWidth = 0;
    let pageHeight = 0;
    let focusScale = 1;
    let wordOffset = { x: 0, y: 0 };

    function measure() {
        const height = stage?.clientHeight || window.innerHeight;
        pageWidth = Math.min(window.innerWidth * .43, 420, (height - 130) * .7);
        pageHeight = pageWidth * 1.4;
        scene?.style.setProperty('--dict-page-w', `${pageWidth}px`);
        scene?.style.setProperty('--dict-page-h', `${pageHeight}px`);
        focusScale = Math.min(2.3, (window.innerWidth - 38) / pageWidth, (height - 120) / pageHeight);
        // Offsets are in book coordinates, before its viewport transform.
        if (word) {
            wordOffset = { x: word.offsetLeft + word.offsetWidth / 2, y: word.offsetTop + word.offsetHeight / 2 };
            let ancestor = word.offsetParent;
            while (ancestor && ancestor !== book) {
                wordOffset.x += ancestor.offsetLeft;
                wordOffset.y += ancestor.offsetTop;
                ancestor = ancestor.offsetParent;
            }
        }
        updateHeroScroll();
    }

    function scheduleUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { ticking = false; updateHeroScroll(); });
    }

    function updateHeroScroll() {
        if (!track || !scene || !book) return;
        const rect = track.getBoundingClientRect();
        const progress = clamp(-rect.top / Math.max(1, track.offsetHeight - window.innerHeight));
        const reduced = reducedMotion.matches;
        const logoFade = 1 - ease(phase(progress, .025, .12));
        logoBox.style.opacity = logoFade;
        logoBox.style.transform = reduced ? 'none' : `translateY(${-30 * (1 - logoFade)}px) scale(${mix(.82, 1, logoFade)})`;
        logoBox.style.pointerEvents = 'none';
        scrollCue.style.opacity = 1 - phase(progress, 0, .045);
        const titleOpacity = ease(phase(progress, .08, .14)) * (1 - ease(phase(progress, .35, .43)));
        motionWrapper.style.opacity = titleOpacity;
        motionWrapper.style.transform = reduced ? 'none' : `translateY(${-25 * phase(progress, .35, .43)}px)`;
        motionWrapper.style.pointerEvents = 'none';
        const index = Math.min(9, Math.floor(phase(progress, .14, .34) * totalFrames));
        if (currentFrame !== index && frames[index].complete && frames[index].naturalWidth) {
            frameImg.src = frames[index].src;
            currentFrame = index;
        }

        const enter = ease(phase(progress, .37, .58));
        const opening = ease(phase(progress, .445, .565));
        const focus = ease(phase(progress, .565, .815));
        const darkness = ease(phase(progress, .89, .96));
        const scale = mix(mix(.24, 1, enter), focusScale, focus);
        // The origin is the spine. At rest the spread straddles the center;
        // the reading phase then centers the right page itself.
        const x = mix(window.innerWidth * .43, 0, enter) - pageWidth * scale * .5 * focus;
        const y = mix(window.innerHeight * .44, 20, enter);
        scene.style.opacity = phase(progress, .37, .395);
        scene.style.visibility = progress < .37 ? 'hidden' : 'visible';
        scene.style.setProperty('--dict-darkness', darkness);
        scene.classList.toggle('is-dark', darkness > 0);
        scene.dataset.phase = progress < .445 ? 'arrival' : progress < .565 ? 'opening' : progress < .815 ? 'leafing-and-centering' : progress < .89 ? 'definition' : 'spotlight';
        if (reduced) {
            book.style.transform = `translate3d(${-pageWidth * focusScale / 2}px, 20px, 0) scale(${focusScale})`;
        } else {
            book.style.transform = `translate3d(${x}px, ${y}px, 0) rotateX(${mix(24, 0, enter)}deg) rotateY(${mix(-24, 0, enter)}deg) rotateZ(${mix(23, 0, enter)}deg) scale(${scale})`;
        }
        cover.style.transform = `translateZ(${mix(18, 1, opening)}px) rotateY(${-179.6 * (reduced ? 1 : opening)}deg)`;
        leaves.forEach(leaf => {
            const i = Number(leaf.dataset.leafIndex);
            const t = reduced ? 1 : ease(phase(progress, .555 + i * .037, .630 + i * .037));
            const z = mix(14 - i, 4 + i * .4, t);
            leaf.style.transform = `translateZ(${z}px) rotateY(${-180 * t}deg)`;
            leaf.querySelectorAll('.dict-leaf-shade').forEach(shade => {
                shade.style.opacity = Math.sin(t * Math.PI) * .65;
            });
        });
        const ink = Math.round(mix(18, 248, darkness));
        word.style.color = `rgb(${ink}, ${Math.round(mix(16, 242, darkness))}, ${Math.round(mix(14, 226, darkness))})`;
        // Keep the headword on the page throughout the blackout, then gently
        // draw the surviving word to the center of the now empty stage.
        const centerWord = reduced ? 0 : ease(phase(progress, .94, .995));
        const activeScale = reduced ? focusScale : scale;
        const bookX = reduced ? -pageWidth * focusScale / 2 : x;
        word.style.transform = `translate(${(-bookX / activeScale - wordOffset.x) * centerWord}px, ${(-20 / activeScale - wordOffset.y) * centerWord}px) scale(${mix(1, 1.25, centerWord)})`;
        word.style.transformOrigin = 'center';
        word.style.textShadow = `0 0 ${darkness * 30}px rgba(248, 242, 226, ${darkness * .12})`;
        ambientGlow.style.opacity = (1 - darkness) * mix(.8, .25, progress);
        topNav.classList.toggle('visible', progress > .12 || rect.bottom <= 100);
        topNav.style.opacity = progress > .12 ? 1 - darkness : 0;
        topNav.style.pointerEvents = darkness > .5 || progress <= .12 ? 'none' : '';
        // Once the sticky stage leaves the viewport, normal navigation resumes.
        if (rect.bottom < window.innerHeight * .5) {
            topNav.style.opacity = 1;
            topNav.style.pointerEvents = '';
        }
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', measure);
    reducedMotion.addEventListener('change', measure);
    document.fonts.ready.then(measure);
    measure();

    // IntersectionObserver for elements in content sections
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.15
    };

    const scrollObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        scrollObserver.observe(el);
    });

    // =========================================================================
    // Visual References: Native HTML5 Video (No YouTube, No Overlays, Pure Art)
    // =========================================================================
    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        video.muted = true;
                        video.play();
                    });
                }
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.25 });

    document.querySelectorAll('.ref-native-video').forEach(video => {
        videoObserver.observe(video);

        const box = video.closest('.drawn-frame-box');
        if (!box) return;

        const soundBtn = box.querySelector('.ref-btn-sound');
        const playBtn = box.querySelector('.ref-btn-play');

        if (soundBtn) {
            soundBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                video.muted = !video.muted;
                soundBtn.innerHTML = video.muted
                    ? '<i class="fas fa-volume-mute"></i>'
                    : '<i class="fas fa-volume-up"></i>';
                soundBtn.title = video.muted ? 'Unmute' : 'Mute';
            });
        }

        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (video.paused) {
                    video.play();
                    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                } else {
                    video.pause();
                    playBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
            });
        }

        video.addEventListener('click', () => {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        });

        video.addEventListener('play', () => {
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        });
        video.addEventListener('pause', () => {
            if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
    });
});
