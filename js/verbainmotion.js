/**
 * VERBA IN MOTION - Apple-Style Scroll Controller
 * Handles frame-by-frame scroll advancement for the 10-frame VERBA_IN_MOTION sequence
 * and seamless interpolation of narrative blocks.
 */

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('hero-scroll-track');
    const stage = document.getElementById('hero-sticky-stage');
    const motionWrapper = document.getElementById('hero-motion-wrapper');
    const canvas = document.getElementById('hero-motion-canvas');
    const fallbackImg = document.getElementById('hero-motion-fallback');
    const scrollCue = document.getElementById('hero-scroll-cue');
    const ambientGlow = document.getElementById('hero-ambient-glow');
    const block2 = document.getElementById('hero-reveal-block-2');
    const topNav = document.getElementById('vim-nav');

    // Clamp utility
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    // Map a value from [inMin, inMax] to [outMin, outMax]
    const mapRange = (val, inMin, inMax, outMin, outMax) => {
        const t = clamp((val - inMin) / (inMax - inMin), 0, 1);
        return outMin + t * (outMax - outMin);
    };

    // =========================================================================
    // 10-Frame Image Sequence Preloader & Renderer
    // =========================================================================
    const totalFrames = 10;
    const frames = [];
    let currentDrawnIndex = -1;

    // Detect base path from canvas data attribute or fallback
    const basePath = (canvas && canvas.dataset.basePath) ? canvas.dataset.basePath : 'images/verba_in_motion_frames/';

    function drawCurrentFrame(index) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = frames[index];
        if (img && img.complete && img.naturalWidth > 0) {
            if (currentDrawnIndex !== index) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                currentDrawnIndex = index;
            }
        } else if (fallbackImg) {
            fallbackImg.src = `${basePath}frame_${index}.png`;
            fallbackImg.style.display = 'block';
            canvas.style.display = 'none';
        }
    }

    // Preload all 10 frames
    for (let i = 0; i < totalFrames; i++) {
        const img = new Image();
        img.src = `${basePath}frame_${i}.png`;
        img.onload = () => {
            if (i === 0 && currentDrawnIndex === -1) {
                drawCurrentFrame(0);
            }
        };
        frames.push(img);
    }

    let ticking = false;

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateHeroScroll();
                ticking = false;
            });
            ticking = true;
        }
    }

    function updateHeroScroll() {
        if (!track) return;

        const rect = track.getBoundingClientRect();
        const totalScroll = track.offsetHeight - window.innerHeight;
        const currentScroll = -rect.top;
        const progress = clamp(currentScroll / totalScroll, 0, 1);

        // 1. Scroll cue fade out (fades out in first 8% of scroll)
        if (scrollCue) {
            const cueOpacity = mapRange(progress, 0, 0.08, 1, 0);
            scrollCue.style.opacity = cueOpacity;
            scrollCue.style.pointerEvents = cueOpacity <= 0 ? 'none' : 'auto';
        }

        // 2. Scroll-Driven 10-Frame Advancement
        // Across progress 0.00 -> 0.48, scroll distance maps to frames 0 through 9
        const frameProgress = clamp(progress / 0.48, 0, 1);
        const frameIndex = clamp(Math.floor(frameProgress * totalFrames), 0, totalFrames - 1);
        drawCurrentFrame(frameIndex);

        // 3. Motion Wrapper Scaling & Fade Out
        // Stays fully visible from 0.0 -> 0.50, then gracefully scales and fades out to reveal manifesto
        if (motionWrapper) {
            if (progress <= 0.50) {
                motionWrapper.style.opacity = 1;
                motionWrapper.style.transform = 'translateY(0px) scale(1)';
                motionWrapper.style.pointerEvents = 'auto';
            } else if (progress <= 0.65) {
                const fadeOpacity = mapRange(progress, 0.50, 0.65, 1, 0);
                const translateY = mapRange(progress, 0.50, 0.65, 0, -35);
                const scale = mapRange(progress, 0.50, 0.65, 1, 0.94);
                motionWrapper.style.opacity = fadeOpacity;
                motionWrapper.style.transform = `translateY(${translateY}px) scale(${scale})`;
                motionWrapper.style.pointerEvents = fadeOpacity > 0.3 ? 'auto' : 'none';
            } else {
                motionWrapper.style.opacity = 0;
                motionWrapper.style.pointerEvents = 'none';
            }
        }

        // 4. Reveal Block 2: The Manifesto Statement
        // Enters at 0.58, peaks at 0.74, fades out by 0.94
        if (block2) {
            if (progress >= 0.56 && progress <= 0.98) {
                let opacity = 0;
                let translateY = 30;
                if (progress <= 0.72) {
                    opacity = mapRange(progress, 0.56, 0.70, 0, 1);
                    translateY = mapRange(progress, 0.56, 0.70, 30, 0);
                } else {
                    opacity = mapRange(progress, 0.82, 0.96, 1, 0);
                    translateY = mapRange(progress, 0.82, 0.96, 0, -25);
                }
                block2.style.opacity = opacity;
                block2.style.transform = `translateY(${translateY}px) scale(${0.96 + opacity * 0.04})`;
                block2.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
            } else {
                block2.style.opacity = 0;
                block2.style.pointerEvents = 'none';
            }
        }

        // 5. Ambient Glow dynamic intensity
        if (ambientGlow) {
            const glowOpacity = mapRange(progress, 0, 0.4, 0.8, 0.4);
            ambientGlow.style.opacity = glowOpacity;
        }

        // 6. Sticky Navigation Bar Visibility
        // Shows as soon as user progresses past initial stage (progress > 0.15) or when past track
        if (topNav) {
            if (progress > 0.15 || rect.bottom <= 100) {
                topNav.classList.add('visible');
            } else {
                topNav.classList.remove('visible');
            }
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateHeroScroll);
    
    // Initial call to render frame 0 and set initial states
    updateHeroScroll();

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
});
