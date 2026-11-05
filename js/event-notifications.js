// ==========================================================================
// Verba Vitae - Event Approval Chrome & Desktop Notifications System
// ==========================================================================

(function(window) {
    'use strict';

    // 1. Pleasant 2-tone chime using Web Audio API (Zero external assets required)
    function playNotificationChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const now = ctx.currentTime;

            // Tone 1: E5 (659.25 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.18, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            // Tone 2: A5 (880 Hz) - uplifting feel
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, now + 0.12);
            gain2.gain.setValueAtTime(0.22, now + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.12);
            osc2.stop(now + 0.65);
        } catch (e) {
            // Audio context blocked by browser autoplay policy
        }
    }

    // 2. Animated In-App Celebratory Banner
    function showApprovalToastBanner(eventTitle) {
        const existing = document.getElementById('vv-approval-toast');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'vv-approval-toast';
        banner.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 9999999;
            background: #1c4532;
            border: 1px solid #38a169;
            color: #ffffff;
            padding: 18px 22px;
            border-radius: 14px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 440px;
            font-family: inherit;
            animation: vvSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        banner.innerHTML = `
            <div style="width: 44px; height: 44px; border-radius: 50%; background: #276749; color: #68d391; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
                <i class="fas fa-check-circle"></i>
            </div>
            <div style="flex: 1;">
                <strong style="display: block; font-size: 0.98rem; color: #ffffff;">Registration Approved! 🎉</strong>
                <span style="font-size: 0.84rem; color: #c6f6d5; line-height: 1.4; display: block; margin-top: 3px;">
                    An administrator has approved your spot for <strong>${escapeHtml(eventTitle)}</strong>!
                </span>
            </div>
            <button type="button" style="background: none; border: none; color: #9ae6b4; font-size: 1.4rem; cursor: pointer; padding: 0 4px; line-height: 1;" aria-label="Close">&times;</button>
        `;

        if (!document.getElementById('vv-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'vv-toast-styles';
            style.textContent = `
                @keyframes vvSlideIn {
                    from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        banner.querySelector('button').onclick = () => banner.remove();
        document.body.appendChild(banner);

        setTimeout(() => {
            if (banner.parentElement) {
                banner.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(-15px)';
                setTimeout(() => banner.remove(), 400);
            }
        }, 9000);
    }

    // 3. Trigger Native Chrome Desktop Notification
    function triggerChromeApprovalNotification(eventTitle) {
        const notifApi = ('Notification' in window) ? window.Notification : (window.top && 'Notification' in window.top ? window.top.Notification : null);
        if (!notifApi || notifApi.permission !== 'granted') return;

        try {
            const n = new notifApi('Event Registration Approved! 🎉', {
                body: `Great news! An administrator has approved your registration for "${eventTitle}". You are confirmed to participate!`,
                icon: 'images/verbavitaelogoblue.png',
                badge: 'images/verbavitaelogoblue.png',
                tag: 'event-approval-' + encodeURIComponent(eventTitle)
            });

            n.onclick = function() {
                window.focus();
                if (window.location.pathname.includes('dashboard.html')) {
                    if (typeof renderRegisteredEvents === 'function') renderRegisteredEvents();
                } else if (window.location.pathname.includes('events.html')) {
                    if (typeof fetchEvents === 'function') fetchEvents();
                } else {
                    window.location.href = 'dashboard.html';
                }
            };
        } catch (e) {
            console.warn('Could not fire desktop notification:', e);
        }
    }

    // 4. Modal Pop-up asking user to enable Chrome notifications upon registration
    function promptEventNotificationPermission(eventTitle, onDone) {
        const existing = document.getElementById('notifPermissionModal');
        if (existing) existing.remove();

        const notifApi = ('Notification' in window) ? window.Notification : (window.top && 'Notification' in window.top ? window.top.Notification : null);
        const isAlreadyGranted = notifApi && notifApi.permission === 'granted';

        const modal = document.createElement('div');
        modal.id = 'notifPermissionModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(13, 27, 42, 0.78);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
            font-family: inherit;
        `;

        if (isAlreadyGranted) {
            // Already permitted - show beautiful hold confirmation with notification badge
            modal.innerHTML = `
                <div style="background: #ffffff; max-width: 480px; width: 90%; border-radius: 16px; padding: 28px 24px; text-align: center; box-shadow: 0 20px 45px rgba(0,0,0,0.3); animation: vvModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: #e6fffa; color: #234e52; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 16px auto; box-shadow: 0 4px 12px rgba(49, 151, 149, 0.2);">
                        <i class="fas fa-hourglass-half" style="color: #2b6cb0;"></i>
                    </div>
                    <h3 style="font-size: 1.3rem; color: #1a202c; margin: 0 0 8px 0; font-weight: 700;">Registration Submitted (On Hold)</h3>
                    <p style="font-size: 0.92rem; color: #4a5568; line-height: 1.5; margin: 0 0 16px 0;">
                        Your registration request for <strong style="color: #2b6cb0;">"${escapeHtml(eventTitle)}"</strong> has been placed on <strong>Hold</strong> awaiting administrator approval.
                    </p>
                    <div style="background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 10px; padding: 12px 16px; margin: 0 0 22px 0; text-align: left; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-bell" style="color: #3182ce; font-size: 1.2rem; flex-shrink: 0;"></i>
                        <span style="font-size: 0.85rem; color: #2b6cb0; line-height: 1.4;">
                            <strong>Chrome Notifications Active:</strong> You will automatically receive a desktop notification in Chrome as soon as an administrator approves your spot!
                        </span>
                    </div>
                    <div>
                        <button type="button" id="btnDismissNotifModal" style="padding: 12px 30px; background: #3182ce; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: background 0.2s;">
                            Got It!
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Permission not yet granted - prompt the user
            modal.innerHTML = `
                <div style="background: #ffffff; max-width: 480px; width: 90%; border-radius: 16px; padding: 28px 24px; text-align: center; box-shadow: 0 20px 45px rgba(0,0,0,0.3); animation: vvModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: #ebf8ff; color: #3182ce; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 16px auto; box-shadow: 0 4px 12px rgba(49, 130, 206, 0.2);">
                        <i class="fas fa-bell"></i>
                    </div>
                    <h3 style="font-size: 1.3rem; color: #1a202c; margin: 0 0 8px 0; font-weight: 700;">Get Notified on Chrome</h3>
                    <p style="font-size: 0.92rem; color: #4a5568; line-height: 1.5; margin: 0 0 16px 0;">
                        Your registration for <strong style="color: #2b6cb0;">"${escapeHtml(eventTitle)}"</strong> has been submitted on <strong>Hold</strong>.
                        <br><br>
                        Would you like to receive a notification in your <strong>Chrome browser</strong> as soon as an administrator verifies and approves your participation?
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button type="button" id="btnAllowNotifModal" style="padding: 12px 24px; background: #3182ce; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-bell"></i> Allow Notifications
                        </button>
                        <button type="button" id="btnDismissNotifModal" style="padding: 12px 20px; background: #edf2f7; color: #4a5568; border: none; border-radius: 8px; font-weight: 600; font-size: 0.92rem; cursor: pointer; transition: background 0.2s;">
                            Maybe Later
                        </button>
                    </div>
                </div>
            `;
        }

        if (!document.getElementById('vv-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'vv-modal-styles';
            style.textContent = `
                @keyframes vvModalPop {
                    from { opacity: 0; transform: scale(0.92); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        function closeModal() {
            modal.style.transition = 'opacity 0.2s ease';
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                if (typeof onDone === 'function') onDone();
            }, 200);
        }

        const allowBtn = modal.querySelector('#btnAllowNotifModal');
        if (allowBtn) {
            allowBtn.onclick = function() {
                if (notifApi) {
                    if (notifApi.permission === 'granted') {
                        triggerTestConfirmation();
                        closeModal();
                    } else if (notifApi.permission !== 'denied') {
                        try {
                            const req = notifApi.requestPermission();
                            if (req && typeof req.then === 'function') {
                                req.then(permission => {
                                    if (permission === 'granted') {
                                        triggerTestConfirmation();
                                    }
                                    closeModal();
                                }).catch(() => closeModal());
                            } else {
                                // Callback style fallback
                                notifApi.requestPermission(permission => {
                                    if (permission === 'granted') {
                                        triggerTestConfirmation();
                                    }
                                    closeModal();
                                });
                            }
                        } catch (e) {
                            closeModal();
                        }
                    } else {
                        alert('Notifications are currently blocked in your Chrome site settings. You can enable them anytime in Chrome Site Settings, or track your status directly on your Dashboard.');
                        closeModal();
                    }
                } else {
                    alert('Your browser does not support desktop notifications, but you can track your status anytime on your Dashboard.');
                    closeModal();
                }
            };
        }

        function triggerTestConfirmation() {
            try {
                if (notifApi && notifApi.permission === 'granted') {
                    new notifApi('Notifications Active! 🔔', {
                        body: `We will alert you in Chrome as soon as an administrator approves your spot for "${eventTitle}".`,
                        icon: 'images/verbavitaelogoblue.png'
                    });
                }
                localStorage.setItem('verba_notifications_enabled', 'true');
            } catch (e) {}
        }

        const dismissBtn = modal.querySelector('#btnDismissNotifModal');
        if (dismissBtn) {
            dismissBtn.onclick = closeModal;
        }

        document.body.appendChild(modal);
    }

    // 5. Watch for Event Approvals in Firestore in Real-Time
    let activeWatcherUnsubscribe = null;

    function startApprovalNotificationWatcher(db, userUid) {
        if (!db || !userUid || activeWatcherUnsubscribe) return;

        try {
            let isFirstSnapshot = true;
            activeWatcherUnsubscribe = db.collection('users').doc(userUid).collection('registered_events')
                .onSnapshot(snapshot => {
                    let notifiedList = JSON.parse(localStorage.getItem('verba_notified_event_approvals') || '[]');
                    const isInitial = isFirstSnapshot;
                    isFirstSnapshot = false;

                    snapshot.docChanges().forEach(change => {
                        const data = change.doc.data() || {};
                        const eventId = String(data.eventId || change.doc.id);
                        const status = (data.status || '').toLowerCase();
                        const title = data.title || data.eventTitle || 'Community Event';

                        if (status !== 'approved') return;

                        // Check if already notified
                        if (notifiedList.includes(eventId)) return;

                        // If it's the initial snapshot batch:
                        if (isInitial) {
                            let isRecent = false;
                            if (data.approvedAt) {
                                const approvedMillis = data.approvedAt.toMillis ? data.approvedAt.toMillis() : (new Date(data.approvedAt).getTime() || 0);
                                if (approvedMillis > 0 && (Date.now() - approvedMillis) < (24 * 60 * 60 * 1000)) {
                                    isRecent = true;
                                }
                            }
                            let wasOnHoldLocally = false;
                            try {
                                const localRegs = JSON.parse(localStorage.getItem('verba_registered_events')) || [];
                                const match = localRegs.find(r => String(r.id) === eventId || String(r.eventId) === eventId);
                                if (match && (match.status || '').toLowerCase() === 'hold') {
                                    wasOnHoldLocally = true;
                                }
                            } catch (e) {}

                            // If not recent and not previously on hold, mark as notified silently so we don't spam old historical events
                            if (!isRecent && !wasOnHoldLocally) {
                                notifiedList.push(eventId);
                                localStorage.setItem('verba_notified_event_approvals', JSON.stringify(notifiedList));
                                return;
                            }
                        }

                        // Fire notification!
                        notifiedList.push(eventId);
                        localStorage.setItem('verba_notified_event_approvals', JSON.stringify(notifiedList));

                        // 1. Native Chrome / Desktop notification
                        triggerChromeApprovalNotification(title);

                        // 2. Play pleasant chime
                        playNotificationChime();

                        // 3. Show In-App celebratory banner
                        showApprovalToastBanner(title);

                        // 4. Update local registered events if stored
                        try {
                            let localRegs = JSON.parse(localStorage.getItem('verba_registered_events')) || [];
                            let modified = false;
                            localRegs.forEach(r => {
                                if (String(r.id) === eventId || String(r.eventId) === eventId) {
                                    r.status = 'Approved';
                                    modified = true;
                                }
                            });
                            if (modified) {
                                localStorage.setItem('verba_registered_events', JSON.stringify(localRegs));
                            }
                        } catch (e) {}
                    });
                }, err => {
                    console.warn('Firestore approval notification watcher error:', err);
                });
        } catch (err) {
            console.warn('Could not initialize approval notification watcher:', err);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Expose globally on window
    window.VerbaEventNotifications = {
        playChime: playNotificationChime,
        showBanner: showApprovalToastBanner,
        triggerChromeNotification: triggerChromeApprovalNotification,
        promptPermission: promptEventNotificationPermission,
        startWatcher: startApprovalNotificationWatcher
    };

})(window);
