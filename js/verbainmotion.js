/**
 * VERBA IN MOTION - Apple-Style Scroll Controller
 * Seamless multi-stage hero:
 * Stage 1: Initial Verba Vitae Logo (Clay Heart in Motion) on pure black
 * Stage 2: Scroll-driven 10-frame VERBA IN MOTION sequence
 * Stage 3: Manifesto statement reveal
 */

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('hero-scroll-track');
    const stage = document.getElementById('hero-sticky-stage');
    const logoBox = document.getElementById('hero-logo-box');
    const motionWrapper = document.getElementById('hero-motion-wrapper');
    const frameImg = document.getElementById('hero-motion-frame');
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
    // 10-Frame Image Sequence Preloader
    // =========================================================================
    const totalFrames = 10;
    const preloadedFrames = [];
    const basePath = (frameImg && frameImg.dataset.basePath) ? frameImg.dataset.basePath : 'images/verba_in_motion_frames/';

    for (let i = 0; i < totalFrames; i++) {
        const img = new Image();
        img.src = `${basePath}frame_${i}.png`;
        preloadedFrames.push(img);
    }

    let currentFrameIndex = -1;

    function setFrame(index) {
        if (!frameImg || currentFrameIndex === index) return;
        currentFrameIndex = index;
        const targetSrc = `${basePath}frame_${index}.png`;
        if (frameImg.src !== targetSrc) {
            frameImg.src = targetSrc;
        }
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

        // 1. Initial Scroll Cue (fades out in first 8% of scroll)
        if (scrollCue) {
            const cueOpacity = mapRange(progress, 0, 0.08, 1, 0);
            scrollCue.style.opacity = cueOpacity;
            scrollCue.style.pointerEvents = cueOpacity <= 0 ? 'none' : 'auto';
        }

        // 2. Stage 1: Initial Verba Vitae Logo (Clay Heart)
        // Fully visible at start (0% - 6%), then smoothly scales & fades out by 22%
        if (logoBox) {
            if (progress <= 0.06) {
                logoBox.style.opacity = 1;
                logoBox.style.transform = 'translateY(0px) scale(1)';
                logoBox.style.pointerEvents = 'auto';
            } else if (progress <= 0.24) {
                const logoOpacity = mapRange(progress, 0.06, 0.22, 1, 0);
                const translateY = mapRange(progress, 0.06, 0.22, 0, -45);
                const scale = mapRange(progress, 0.06, 0.22, 1, 0.78);
                logoBox.style.opacity = logoOpacity;
                logoBox.style.transform = `translateY(${translateY}px) scale(${scale})`;
                logoBox.style.pointerEvents = logoOpacity > 0.3 ? 'auto' : 'none';
            } else {
                logoBox.style.opacity = 0;
                logoBox.style.pointerEvents = 'none';
            }
        }

        // 3. Stage 2: Scroll-Driven VERBA IN MOTION 10-Frame Sequence
        // Enters at 16%, in full focus from 25% to 65% (where 10 frames advance), fades out by 78%
        if (motionWrapper) {
            if (progress < 0.16) {
                motionWrapper.style.opacity = 0;
                motionWrapper.style.transform = 'translateY(40px) scale(0.92)';
                motionWrapper.style.pointerEvents = 'none';
                setFrame(0);
            } else if (progress <= 0.26) {
                const enterOpacity = mapRange(progress, 0.16, 0.26, 0, 1);
                const enterTranslateY = mapRange(progress, 0.16, 0.26, 40, 0);
                const enterScale = mapRange(progress, 0.16, 0.26, 0.92, 1.0);
                motionWrapper.style.opacity = enterOpacity;
                motionWrapper.style.transform = `translateY(${enterTranslateY}px) scale(${enterScale})`;
                motionWrapper.style.pointerEvents = enterOpacity > 0.5 ? 'auto' : 'none';
                setFrame(0);
            } else if (progress <= 0.65) {
                motionWrapper.style.opacity = 1;
                motionWrapper.style.transform = 'translateY(0px) scale(1)';
                motionWrapper.style.pointerEvents = 'auto';

                // Map scroll progress across [0.26, 0.62] to frames 0 through 9
                const frameProgress = clamp((progress - 0.26) / 0.36, 0, 1);
                const frameIndex = clamp(Math.floor(frameProgress * totalFrames), 0, totalFrames - 1);
                setFrame(frameIndex);
            } else if (progress <= 0.78) {
                const exitOpacity = mapRange(progress, 0.65, 0.78, 1, 0);
                const exitTranslateY = mapRange(progress, 0.65, 0.78, 0, -35);
                const exitScale = mapRange(progress, 0.65, 0.78, 1, 0.94);
                motionWrapper.style.opacity = exitOpacity;
                motionWrapper.style.transform = `translateY(${exitTranslateY}px) scale(${exitScale})`;
                motionWrapper.style.pointerEvents = exitOpacity > 0.3 ? 'auto' : 'none';
                setFrame(totalFrames - 1);
            } else {
                motionWrapper.style.opacity = 0;
                motionWrapper.style.pointerEvents = 'none';
            }
        }

        // 4. Stage 3: The Manifesto Statement Reveal
        // Enters at 72%, peaks at 82%, fades out into vision section by 96%
        if (block2) {
            if (progress >= 0.70 && progress <= 0.98) {
                let opacity = 0;
                let translateY = 30;
                if (progress <= 0.82) {
                    opacity = mapRange(progress, 0.70, 0.82, 0, 1);
                    translateY = mapRange(progress, 0.70, 0.82, 30, 0);
                } else {
                    opacity = mapRange(progress, 0.88, 0.98, 1, 0);
                    translateY = mapRange(progress, 0.88, 0.98, 0, -25);
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
        // Shows as soon as user progresses past initial stage (progress > 0.20) or when past track
        if (topNav) {
            if (progress > 0.20 || rect.bottom <= 100) {
                topNav.classList.add('visible');
            } else {
                topNav.classList.remove('visible');
            }
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateHeroScroll);
    
    // Initial call to set initial states
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

    // =========================================================================
    // Visual References: Locked Video Preview & Clean Player Controller
    // =========================================================================
    document.querySelectorAll('.drawn-frame-box').forEach(box => {
        const cover = box.querySelector('.ref-locked-cover');
        const playerContainer = box.querySelector('.ref-video-player');
        const lockBtn = box.querySelector('.ref-lock-btn');
        const videoId = box.dataset.videoId;
        const videoTitle = box.dataset.videoTitle || 'Verba in Motion Reference';

        if (cover && playerContainer && videoId) {
            cover.addEventListener('click', () => {
                cover.classList.add('unlocked');
                playerContainer.innerHTML = `
                    <iframe 
                        src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1" 
                        title="${videoTitle}" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                    </iframe>
                `;
                if (lockBtn) lockBtn.style.display = 'block';
            });
        }

        if (lockBtn && cover && playerContainer) {
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playerContainer.innerHTML = '';
                cover.classList.remove('unlocked');
                lockBtn.style.display = 'none';
            });
        }
    });
});

