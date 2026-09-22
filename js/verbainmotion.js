/**
 * VERBA IN MOTION - Apple-Style Scroll Controller
 * Handles precise scroll interpolation for hero logo reveal and narrative blocks.
 */

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('hero-scroll-track');
    const stage = document.getElementById('hero-sticky-stage');
    const logoBox = document.getElementById('hero-logo-box');
    const scrollCue = document.getElementById('hero-scroll-cue');
    const ambientGlow = document.getElementById('hero-ambient-glow');
    const block1 = document.getElementById('hero-reveal-block-1');
    const block2 = document.getElementById('hero-reveal-block-2');
    const topNav = document.getElementById('vim-nav');

    // Clamp utility
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    // Map a value from [inMin, inMax] to [outMin, outMax]
    const mapRange = (val, inMin, inMax, outMin, outMax) => {
        const t = clamp((val - inMin) / (inMax - inMin), 0, 1);
        return outMin + t * (outMax - outMin);
    };

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

        // 2. Central Logo Animation
        // Progress 0.0 -> 0.35: Logo scales down and shifts upward
        if (logoBox) {
            if (progress < 0.35) {
                const scale = mapRange(progress, 0, 0.35, 1.0, 0.65);
                const translateY = mapRange(progress, 0, 0.35, 0, -60);
                const logoOpacity = mapRange(progress, 0.25, 0.35, 1, 0);
                logoBox.style.transform = `translateY(${translateY}px) scale(${scale})`;
                logoBox.style.opacity = logoOpacity;
            } else {
                logoBox.style.opacity = 0;
            }
        }

        // 3. Reveal Block 1: "VERBA IN MOTION" Title & Subtitle
        // Enters at 0.15, peaks at 0.35, fades out by 0.55
        if (block1) {
            if (progress >= 0.15 && progress <= 0.58) {
                let opacity = 0;
                let translateY = 30;
                if (progress <= 0.35) {
                    opacity = mapRange(progress, 0.15, 0.32, 0, 1);
                    translateY = mapRange(progress, 0.15, 0.32, 30, 0);
                } else {
                    opacity = mapRange(progress, 0.45, 0.58, 1, 0);
                    translateY = mapRange(progress, 0.45, 0.58, 0, -25);
                }
                block1.style.opacity = opacity;
                block1.style.transform = `translateY(${translateY}px) scale(${0.96 + opacity * 0.04})`;
                block1.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
            } else {
                block1.style.opacity = 0;
                block1.style.pointerEvents = 'none';
            }
        }

        // 4. Reveal Block 2: The Manifesto Statement
        // Enters at 0.52, peaks at 0.75, fades out by 0.95
        if (block2) {
            if (progress >= 0.52 && progress <= 0.98) {
                let opacity = 0;
                let translateY = 30;
                if (progress <= 0.72) {
                    opacity = mapRange(progress, 0.52, 0.70, 0, 1);
                    translateY = mapRange(progress, 0.52, 0.70, 30, 0);
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
        // Shows as soon as user progresses past initial logo (around progress 0.25) or when past track
        if (topNav) {
            if (progress > 0.25 || rect.bottom <= 100) {
                topNav.classList.add('visible');
            } else {
                topNav.classList.remove('visible');
            }
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateHeroScroll);
    
    // Initial call
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
