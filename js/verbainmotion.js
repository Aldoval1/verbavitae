/**
 * VERBA IN MOTION - Apple-Style Scroll Controller
 * Seamless multi-stage hero:
 * Stage 1: Initial Verba Vitae Logo (Clay Heart in Motion) on pure black
 * Stage 2: Scroll-driven 10-frame VERBA IN MOTION claymation sequence
 * Stage 3: 3D Dictionary floats in from corner, opens cover, flips leaves,
 *          centers on the definition of "Creative Lab", and darkens everything
 *          to pure black except the glowing words "Creative Lab".
 */

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('hero-scroll-track');
    const logoBox = document.getElementById('hero-logo-box');
    const motionWrapper = document.getElementById('hero-motion-wrapper');
    const frameImg = document.getElementById('hero-motion-frame');
    const scrollCue = document.getElementById('hero-scroll-cue');
    const ambientGlow = document.getElementById('hero-ambient-glow');
    const topNav = document.getElementById('vim-nav');

    // Stage 3 Dictionary Elements
    const dictScene = document.getElementById('hero-dict-scene');
    const dictBook = document.getElementById('dict-book-3d');
    const dictFrontCover = document.getElementById('dict-front-cover');
    const dictBackCover = document.getElementById('dict-back-cover');
    const dictSpineHinge = document.getElementById('dict-spine-hinge');
    const dictStackEdges = document.getElementById('dict-page-stack-edges');
    const dictTargetPage = document.getElementById('dict-target-page');
    const dictPaperBg = document.getElementById('dict-page-paper-bg');
    const dictGutterShadow = document.getElementById('dict-page-gutter-shadow');
    const dictSpotlightWord = document.getElementById('dict-spotlight-word');
    const dictFadeElements = document.querySelectorAll('.dict-fade-on-blackout');
    const dictLeaves = [
        document.getElementById('dict-leaf-1'),
        document.getElementById('dict-leaf-2'),
        document.getElementById('dict-leaf-3'),
        document.getElementById('dict-leaf-4'),
        document.getElementById('dict-leaf-5'),
        document.getElementById('dict-leaf-6')
    ].filter(Boolean);

    // Clamp utility
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    // Smoothstep easing utility
    const smoothstep = (min, max, val) => {
        const t = clamp((val - min) / (max - min), 0, 1);
        return t * t * (3 - 2 * t);
    };

    // Map a value from [inMin, inMax] to [outMin, outMax]
    const mapRange = (val, inMin, inMax, outMin, outMax) => {
        const t = clamp((val - inMin) / (inMax - inMin), 0, 1);
        return outMin + t * (outMax - outMin);
    };

    // Map with smoothstep easing
    const mapSmooth = (val, inMin, inMax, outMin, outMax) => {
        const t = smoothstep(inMin, inMax, val);
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
        const preloaded = preloadedFrames[index];
        if (!preloaded || !preloaded.complete || preloaded.naturalWidth === 0) {
            return;
        }
        currentFrameIndex = index;
        const targetSrc = `${basePath}frame_${index}.png`;
        if (frameImg.getAttribute('src') !== targetSrc) {
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

        // 1. Initial Scroll Cue (fades out in first 5% of scroll)
        if (scrollCue) {
            const cueOpacity = mapRange(progress, 0, 0.05, 1, 0);
            scrollCue.style.opacity = cueOpacity;
            scrollCue.style.pointerEvents = cueOpacity <= 0 ? 'none' : 'auto';
        }

        // 2. Stage 1: Initial Verba Vitae Logo (Clay Heart)
        // Fully visible at start (0% - 4%), then smoothly scales & fades out by 14%
        if (logoBox) {
            if (progress <= 0.04) {
                logoBox.style.opacity = 1;
                logoBox.style.transform = 'translateY(0px) scale(1)';
                logoBox.style.pointerEvents = 'auto';
            } else if (progress <= 0.15) {
                const logoOpacity = mapRange(progress, 0.04, 0.14, 1, 0);
                const translateY = mapRange(progress, 0.04, 0.14, 0, -45);
                const scale = mapRange(progress, 0.04, 0.14, 1, 0.78);
                logoBox.style.opacity = logoOpacity;
                logoBox.style.transform = `translateY(${translateY}px) scale(${scale})`;
                logoBox.style.pointerEvents = logoOpacity > 0.3 ? 'auto' : 'none';
            } else {
                logoBox.style.opacity = 0;
                logoBox.style.pointerEvents = 'none';
            }
        }

        // 3. Stage 2: Scroll-Driven VERBA IN MOTION 10-Frame Sequence
        // Enters at 10%, in full focus from 16% to 36% (10 frames advance), fades out by 43%
        if (motionWrapper) {
            if (progress < 0.10) {
                motionWrapper.style.opacity = 0;
                motionWrapper.style.transform = 'translateY(40px) scale(0.92)';
                motionWrapper.style.pointerEvents = 'none';
                setFrame(0);
            } else if (progress <= 0.16) {
                const enterOpacity = mapRange(progress, 0.10, 0.16, 0, 1);
                const enterTranslateY = mapRange(progress, 0.10, 0.16, 40, 0);
                const enterScale = mapRange(progress, 0.10, 0.16, 0.92, 1.0);
                motionWrapper.style.opacity = enterOpacity;
                motionWrapper.style.transform = `translateY(${enterTranslateY}px) scale(${enterScale})`;
                motionWrapper.style.pointerEvents = enterOpacity > 0.5 ? 'auto' : 'none';
                setFrame(0);
            } else if (progress <= 0.36) {
                motionWrapper.style.opacity = 1;
                motionWrapper.style.transform = 'translateY(0px) scale(1)';
                motionWrapper.style.pointerEvents = 'auto';

                // Map scroll progress across [0.16, 0.35] to frames 0 through 9
                const frameProgress = clamp((progress - 0.16) / 0.19, 0, 1);
                const frameIndex = clamp(Math.floor(frameProgress * totalFrames), 0, totalFrames - 1);
                setFrame(frameIndex);
            } else if (progress <= 0.43) {
                const exitOpacity = mapRange(progress, 0.36, 0.43, 1, 0);
                const exitTranslateY = mapRange(progress, 0.36, 0.43, 0, -35);
                const exitScale = mapRange(progress, 0.36, 0.43, 1, 0.92);
                motionWrapper.style.opacity = exitOpacity;
                motionWrapper.style.transform = `translateY(${exitTranslateY}px) scale(${exitScale})`;
                motionWrapper.style.pointerEvents = exitOpacity > 0.3 ? 'auto' : 'none';
                setFrame(totalFrames - 1);
            } else {
                motionWrapper.style.opacity = 0;
                motionWrapper.style.pointerEvents = 'none';
            }
        }

        // 4. Stage 3: 3D Floating Dictionary -> Cover Opens -> Leaves Flip -> Center Definition -> Spotlight Blackout
        if (dictScene && dictBook) {
            if (progress < 0.38) {
                dictScene.style.opacity = 0;
                dictScene.style.pointerEvents = 'none';
            } else {
                // Scene visibility: fades in [0.38 -> 0.43], stays 1 until [0.96 -> 1.00]
                let sceneOpacity = 1;
                if (progress <= 0.43) {
                    sceneOpacity = mapRange(progress, 0.38, 0.43, 0, 1);
                } else if (progress >= 0.96) {
                    sceneOpacity = mapRange(progress, 0.96, 1.0, 1, 0);
                }
                dictScene.style.opacity = sceneOpacity;
                dictScene.style.pointerEvents = sceneOpacity > 0.5 ? 'auto' : 'none';

                const pageW = (dictTargetPage && dictTargetPage.offsetWidth) ? dictTargetPage.offsetWidth : 340;
                const vw = window.innerWidth;
                const vh = window.innerHeight;

                // -----------------------------------------------------------------
                // A. Book 3D Position & Orientation Trajectory
                // -----------------------------------------------------------------
                // Phase A1 [0.38 -> 0.56]: Floats from bottom-right corner toward center
                // Phase A2 [0.56 -> 0.71]: Holds in center while pages flip rapidly
                // Phase A3 [0.71 -> 0.82]: Shifts left by -pageW/2 so the Right Page (Creative Lab) is dead-center & zooms in
                let bookX = 0;
                let bookY = 0;
                let bookZ = 0;
                let rotX = 0;
                let rotY = 0;
                let rotZ = 0;
                let bookScale = 1;

                const startCornerX = Math.min(vw * 0.42, 520);
                const startCornerY = Math.min(vh * 0.38, 340);

                if (progress <= 0.56) {
                    bookX = mapSmooth(progress, 0.38, 0.56, startCornerX, 0);
                    bookY = mapSmooth(progress, 0.38, 0.56, startCornerY, 0);
                    bookZ = mapSmooth(progress, 0.38, 0.56, -260, 0);
                    rotX = mapSmooth(progress, 0.38, 0.56, 32, 14);
                    rotY = mapSmooth(progress, 0.38, 0.56, -28, -4);
                    rotZ = mapSmooth(progress, 0.38, 0.56, 16, 0);
                    bookScale = mapSmooth(progress, 0.38, 0.56, 0.55, 0.96);
                } else if (progress <= 0.70) {
                    bookX = 0;
                    bookY = 0;
                    bookZ = 0;
                    rotX = 14;
                    rotY = -4;
                    rotZ = 0;
                    bookScale = 0.96;
                } else {
                    // Center specifically on the Right Page (where Creative Lab is defined)
                    bookX = mapSmooth(progress, 0.70, 0.82, 0, -pageW * 0.5);
                    bookY = 0;
                    bookZ = 0;
                    rotX = mapSmooth(progress, 0.70, 0.82, 14, 0);
                    rotY = mapSmooth(progress, 0.70, 0.82, -4, 0);
                    rotZ = 0;
                    bookScale = mapSmooth(progress, 0.70, 0.82, 0.96, 1.12);
                }

                dictBook.style.transform = `translate3d(${bookX.toFixed(1)}px, ${bookY.toFixed(1)}px, ${bookZ.toFixed(1)}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${bookScale.toFixed(3)})`;

                // -----------------------------------------------------------------
                // B. Front Hardcover Opening [0.44 -> 0.55]
                // -----------------------------------------------------------------
                const coverAngle = mapSmooth(progress, 0.44, 0.55, 0, -176);
                const coverZ = coverAngle > -90 ? 9 : 0.5;
                if (dictFrontCover) {
                    dictFrontCover.style.transform = `translateZ(${coverZ}px) rotateY(${coverAngle.toFixed(2)}deg)`;
                }

                // -----------------------------------------------------------------
                // C. Staggered Page Leafing ("Hojeo de las hojas") [0.50 -> 0.73]
                // -----------------------------------------------------------------
                const numLeaves = dictLeaves.length;
                dictLeaves.forEach((leaf, idx) => {
                    // Leaf 0 flips first [0.50 -> 0.565], Leaf 5 flips last [0.665 -> 0.73]
                    const leafStart = 0.50 + idx * 0.033;
                    const leafEnd = leafStart + 0.065;
                    const leafAngle = mapSmooth(progress, leafStart, leafEnd, 0, -175);

                    // Prevent 3D z-fighting: stack top-to-bottom on right before -90deg, bottom-to-top on left after -90deg
                    const leafZ = leafAngle > -90
                        ? (numLeaves - idx) * 1.2
                        : (idx + 1) * 1.2;

                    leaf.style.transform = `translateZ(${leafZ.toFixed(2)}px) rotateY(${leafAngle.toFixed(2)}deg)`;

                    // Dynamic shadow across turning page
                    const turnRatio = clamp(( progress - leafStart ) / ( leafEnd - leafStart ), 0, 1);
                    const shadeIntensity = Math.sin(turnRatio * Math.PI) * 0.65;
                    const shades = leaf.querySelectorAll('.dict-leaf-shade');
                    shades.forEach(s => {
                        s.style.opacity = shadeIntensity.toFixed(3);
                    });
                });

                // -----------------------------------------------------------------
                // D. Spotlight Blackout [0.84 -> 0.94]
                // Everything darkens to pure black except the words "Creative Lab"
                // -----------------------------------------------------------------
                const blackout = smoothstep(0.84, 0.93, progress);
                const surroundOpacity = 1 - blackout;

                if (dictBackCover) {
                    dictBackCover.style.opacity = surroundOpacity;
                    dictBackCover.style.filter = `brightness(${surroundOpacity})`;
                }
                if (dictSpineHinge) {
                    dictSpineHinge.style.opacity = surroundOpacity;
                }
                if (dictStackEdges) {
                    dictStackEdges.style.opacity = surroundOpacity;
                    dictStackEdges.style.filter = `brightness(${surroundOpacity})`;
                }
                if (dictFrontCover) {
                    dictFrontCover.style.opacity = surroundOpacity;
                }
                dictLeaves.forEach(leaf => {
                    leaf.style.opacity = surroundOpacity;
                });
                if (dictPaperBg) {
                    dictPaperBg.style.opacity = surroundOpacity;
                    dictPaperBg.style.filter = `brightness(${surroundOpacity})`;
                }
                if (dictGutterShadow) {
                    dictGutterShadow.style.opacity = surroundOpacity;
                }
                dictFadeElements.forEach(el => {
                    el.style.opacity = surroundOpacity;
                });

                // Illuminate & center "Creative Lab" as the rest of the page turns pitch black
                if (dictSpotlightWord) {
                    const r = Math.round(mapRange(blackout, 0, 1, 18, 255));
                    const g = Math.round(mapRange(blackout, 0, 1, 16, 255));
                    const b = Math.round(mapRange(blackout, 0, 1, 14, 255));
                    dictSpotlightWord.style.color = `rgb(${r}, ${g}, ${b})`;

                    if (blackout > 0.01) {
                        const glowBlue = (0.85 * blackout).toFixed(3);
                        const glowWhite = (0.55 * blackout).toFixed(3);
                        dictSpotlightWord.style.textShadow = `0 0 ${(42 * blackout).toFixed(1)}px rgba(41, 151, 255, ${glowBlue}), 0 0 ${(14 * blackout).toFixed(1)}px rgba(255, 255, 255, ${glowWhite})`;
                    } else {
                        dictSpotlightWord.style.textShadow = 'none';
                    }

                    // Gently shift & scale "Creative Lab" toward the center of the page during blackout
                    const wordScale = 1 + 0.35 * blackout;
                    const shiftX = pageW * 0.12 * blackout;
                    const shiftY = 18 * blackout;
                    dictSpotlightWord.style.transform = `translate3d(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 4px) scale(${wordScale.toFixed(3)})`;
                }
            }
        }

        // 5. Ambient Glow dynamic intensity (dims during final blackout so background is pure pitch black)
        if (ambientGlow) {
            let glowOpacity = mapRange(progress, 0, 0.4, 0.8, 0.45);
            if (progress > 0.82) {
                glowOpacity = mapRange(progress, 0.82, 0.92, 0.45, 0.08);
            }
            ambientGlow.style.opacity = glowOpacity;
        }

        // 6. Sticky Navigation Bar Visibility
        if (topNav) {
            if (progress > 0.18 || rect.bottom <= 100) {
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
