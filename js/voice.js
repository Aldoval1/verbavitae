/**
 * Verba Voice - The Digital Reading Room Controller
 * Verba Vitae Reading Club Online Discussion Platform
 */

(function () {
    'use strict';

    // Global State
    let currentUser = null;
    let currentUserRole = 'member'; // 'admin', 'eboard', 'member'
    let currentUserName = 'Member';
    let currentUserAvatar = '';
    let isAdmin = false;

    let discussions = [];
    let voices = [];
    let replies = [];
    let notifications = [];

    let currentDiscussionId = null;
    let currentTab = 'active'; // 'active', 'upcoming', 'archived'
    let currentSort = 'newest'; // 'newest', 'discussed', 'featured'
    let searchQuery = '';

    // Seed Data for Initial Launch
    const SEED_DISCUSSIONS = [
        {
            id: 'disc_dorian_gray',
            title: 'The Picture of Dorian Gray',
            author: 'Oscar Wilde',
            question: 'Can art ever truly be separated from morality?',
            description: 'In the preface to The Picture of Dorian Gray, Oscar Wilde famously writes that "There is no such thing as a moral or an immoral book. Books are well written, or badly written. That is all." Yet the novel itself traces the catastrophic moral degeneration of a man whose sins are mirrored on a hidden canvas. As we delve into the opening chapters, consider Lord Henry\'s aesthetic philosophies: Does art exist solely for pleasure and beauty, or does every aesthetic choice carry an inescapable ethical consequence?',
            type: 'Book Discussion',
            coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
            chapterRange: 'Chapters 1 – 6',
            status: 'active',
            isPinned: true,
            isLocked: false,
            openDate: '2026-09-15',
            closeDate: '2026-10-15',
            createdBy: { name: 'Aaron Bacallao', role: 'President & Admin' },
            createdAt: '2026-09-15T14:00:00.000Z',
            fromTheConversation: []
        },
        {
            id: 'disc_1984',
            title: '1984',
            author: 'George Orwell',
            question: 'Is rebellion meaningful if memory and history can be systematically rewritten?',
            description: 'Winston Smith writes in his secret diary: "Freedom is the freedom to say that two plus two make four. If that is granted, all else follows." In Oceania, the Ministry of Truth alters historical records so completely that the past exists only in memory—and memory is fallible. When reality is dictated by collective compliance, what constitutes authentic resistance? Can a private thought truly remain sacred?',
            type: 'Book Discussion',
            coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
            chapterRange: 'Part One',
            status: 'active',
            isPinned: false,
            isLocked: false,
            openDate: '2026-09-18',
            closeDate: '2026-10-20',
            createdBy: { name: 'Aaron Bacallao', role: 'President & Admin' },
            createdAt: '2026-09-18T16:30:00.000Z',
            fromTheConversation: []
        },
        {
            id: 'disc_quiroga',
            title: 'Tales of Love, Madness, and Death',
            author: 'Horacio Quiroga',
            question: 'How does Quiroga capture human vulnerability in the face of untamed nature and psychological dread?',
            description: 'Horacio Quiroga\'s short stories—steeped in the jungle atmosphere of Misiones, Argentina—frequently pit human pride against relentless wilderness and visceral obsessions. In stories like "El almohadón de plumas" and "A la deriva," mortality arrives with cold inevitability. Let\'s explore Quiroga\'s gothic realism: What makes his depiction of fate feel so chilling and uniquely Latin American?',
            type: 'Open Question',
            coverImage: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=800&q=80',
            chapterRange: 'Selected Short Stories',
            status: 'active',
            isPinned: false,
            isLocked: false,
            openDate: '2026-09-20',
            closeDate: '2026-10-30',
            createdBy: { name: 'Marilennis Naranjo', role: 'Vice President & Admin' },
            createdAt: '2026-09-20T10:15:00.000Z',
            fromTheConversation: []
        },
        {
            id: 'disc_frankenstein',
            title: 'Frankenstein',
            author: 'Mary Shelley',
            question: 'Who is the true monster: the creator who abandons, or the creature who retaliates?',
            description: 'Mary Shelley\'s masterpiece explores ambition, alienation, and parental responsibility. Victor Frankenstein defies nature to animate life, only to flee in horror upon witnessing his creation. Cast into a world that violently rejects him for his hideous visage, the creature discovers language, literature (Milton, Goethe, Plutarch), and ultimately cruelty. This archived discussion preserves our club\'s deep dive into empathy, justice, and the consequences of reckless discovery.',
            type: 'Debate',
            coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
            chapterRange: 'Full Novel',
            status: 'archived',
            isPinned: false,
            isLocked: true,
            openDate: '2026-08-01',
            closeDate: '2026-08-31',
            createdBy: { name: 'Melany Dorta', role: 'Secretary & Admin' },
            createdAt: '2026-08-01T12:00:00.000Z',
            fromTheConversation: [
                {
                    author: 'Melany Dorta',
                    role: 'Secretary',
                    quote: 'The creature learned what tenderness was through Milton\'s Paradise Lost before he ever experienced human malice. He was molded by abandonment, not by malice at birth.'
                },
                {
                    author: 'Aaron Bacallao',
                    role: 'President',
                    quote: 'Victor\'s failure is not scientific curiosity; it is moral cowardice. The moment he ran from the bedside, the tragedy was set in motion.'
                },
                {
                    author: 'Liz Valdivia',
                    role: 'Treasurer',
                    quote: 'The creature\'s demand for a companion mirrors the universal human requirement for mutual recognition. Solitude without choice becomes vengeance.'
                }
            ]
        },
        {
            id: 'disc_soledad',
            title: 'One Hundred Years of Solitude',
            author: 'Gabriel García Márquez',
            question: 'Does cyclical time condemn the Buendía family, or give Macondo an eternal mythical life?',
            description: 'Coming next month! Join our bilingual reading celebration as we explore Macondo, magical realism, memory, and political violence in Gabriel García Márquez\'s timeless epic.',
            type: 'Creative Response',
            coverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
            chapterRange: 'Chapters 1 – 5',
            status: 'upcoming',
            isPinned: false,
            isLocked: false,
            openDate: '2026-10-01',
            closeDate: '2026-11-01',
            createdBy: { name: 'Aaron Bacallao', role: 'President & Admin' },
            createdAt: '2026-09-21T09:00:00.000Z',
            fromTheConversation: []
        }
    ];

    const SEED_VOICES = [
        {
            id: 'voice_dorian_1',
            discussionId: 'disc_dorian_gray',
            userId: 'user_aaron',
            userName: 'Aaron Bacallao',
            userAvatar: 'images/aaron_bacallao.png',
            userRole: 'admin',
            content: 'Wilde\'s paradox is brilliant: by claiming art is completely divorced from morality, he crafts a narrative where art becomes the ultimate moral ledger. Dorian doesn\'t escape ethics; the portrait becomes his conscience made visible and festering.',
            quote: {
                text: 'All art is quite useless.',
                author: 'Oscar Wilde, Preface'
            },
            image: null,
            link: null,
            createdAt: '2026-09-16T18:42:00.000Z',
            isFeatured: true,
            isHidden: false,
            reactions: {
                love: ['u2', 'u3', 'u4', 'u5'],
                interesting: ['u2', 'u6'],
                thought: ['u3', 'u7', 'u8']
            }
        },
        {
            id: 'voice_dorian_2',
            discussionId: 'disc_dorian_gray',
            userId: 'user_melany',
            userName: 'Melany Dorta',
            userAvatar: 'images/melany_dorta.png',
            userRole: 'eboard',
            content: 'What struck me most is Lord Henry\'s influence. He treats Dorian as an experimental canvas—whispering toxic aesthetic ideals while remaining comfortably insulated in his own aristocratic safety. Can influence be considered an artistic creation, or is it pure manipulation?',
            quote: {
                text: 'There is no such thing as a good influence, Mr. Gray. All influence is immoral—immoral from the scientific point of view.',
                author: 'Lord Henry Wotton, Chapter 2'
            },
            image: null,
            link: null,
            createdAt: '2026-09-17T11:15:00.000Z',
            isFeatured: false,
            isHidden: false,
            reactions: {
                love: ['user_aaron', 'u2'],
                interesting: ['user_aaron', 'u3', 'u4'],
                thought: ['u5']
            }
        },
        {
            id: 'voice_dorian_3',
            discussionId: 'disc_dorian_gray',
            userId: 'user_marilennis',
            userName: 'Marilennis Naranjo',
            userAvatar: 'images/marilennis_lazo.png',
            userRole: 'admin',
            content: 'From a modern lens, the portrait functions almost like an early conceptualization of digital identity versus biological decay: presenting a flawless frozen image to society while the hidden reality accumulates every toxic transaction. Fascinating how 19th-century aesthetics anticipate our modern dilemmas.',
            quote: null,
            image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
            link: null,
            createdAt: '2026-09-18T15:20:00.000Z',
            isFeatured: true,
            isHidden: false,
            reactions: {
                love: ['user_aaron', 'user_melany', 'u9'],
                interesting: ['user_melany', 'u4', 'u5', 'u6'],
                thought: ['user_aaron', 'u7']
            }
        }
    ];

    const SEED_REPLIES = [
        {
            id: 'reply_1',
            voiceId: 'voice_dorian_2',
            discussionId: 'disc_dorian_gray',
            userId: 'user_aaron',
            userName: 'Aaron Bacallao',
            userAvatar: 'images/aaron_bacallao.png',
            userRole: 'admin',
            content: 'Spot on, Melany. Lord Henry describes himself as a spectator of life. He wants to experience the thrill of sin by proxy through Dorian, which makes him arguably more culpable than Dorian himself.',
            createdAt: '2026-09-17T14:30:00.000Z'
        },
        {
            id: 'reply_2',
            voiceId: 'voice_dorian_3',
            discussionId: 'disc_dorian_gray',
            userId: 'user_melany',
            userName: 'Melany Dorta',
            userAvatar: 'images/melany_dorta.png',
            userRole: 'eboard',
            content: 'That comparison to digital profiles vs hidden reality is mind-blowing, Marilennis! We curate perfection while burying the internal rot.',
            createdAt: '2026-09-18T16:05:00.000Z'
        }
    ];

    // --- Persistence & Initialization ---
    function loadLocalData() {
        const storedDiscussions = localStorage.getItem('verba_voice_discussions');
        discussions = storedDiscussions ? JSON.parse(storedDiscussions) : SEED_DISCUSSIONS;

        const storedVoices = localStorage.getItem('verba_voice_voices');
        voices = storedVoices ? JSON.parse(storedVoices) : SEED_VOICES;

        const storedReplies = localStorage.getItem('verba_voice_replies');
        replies = storedReplies ? JSON.parse(storedReplies) : SEED_REPLIES;

        const storedNotifs = localStorage.getItem('verba_voice_notifications');
        notifications = storedNotifs ? JSON.parse(storedNotifs) : [];

        // Always save seed if first time
        saveLocalData();
    }

    function saveLocalData() {
        localStorage.setItem('verba_voice_discussions', JSON.stringify(discussions));
        localStorage.setItem('verba_voice_voices', JSON.stringify(voices));
        localStorage.setItem('verba_voice_replies', JSON.stringify(replies));
        localStorage.setItem('verba_voice_notifications', JSON.stringify(notifications));
    }

    // Synchronize with Firestore when online
    async function syncFirestore() {
        if (typeof db === 'undefined' || !db) return;
        try {
            const snap = await db.collection('discussions').get();
            if (!snap.empty) {
                const remote = [];
                snap.forEach(doc => remote.push({ id: doc.id, ...doc.data() }));
                // Merge remote discussions
                remote.forEach(r => {
                    const idx = discussions.findIndex(d => d.id === r.id);
                    if (idx >= 0) discussions[idx] = { ...discussions[idx], ...r };
                    else discussions.unshift(r);
                });
                saveLocalData();
                renderDiscussions();
            }
        } catch (e) {
            console.warn("Firestore sync warning (falling back to offline cache):", e);
        }
    }

    // --- Auth & Role Management ---
    function initAuth() {
        if (typeof auth !== 'undefined' && auth) {
            auth.onAuthStateChanged(async (user) => {
                currentUser = user;
                if (user) {
                    localStorage.setItem('verba_logged_in', 'true');
                    const email = user.email || '';
                    isAdmin = email.includes('admin') || email.includes('verbavitae') || email.endsWith('@theverbavitae.org') || email === 'aaronbacallao06@gmail.com';
                    currentUserRole = isAdmin ? 'admin' : 'member';
                    currentUserName = user.displayName || email.split('@')[0] || 'Member';

                    // Try user document in firestore for profile photo and role
                    if (typeof db !== 'undefined' && db) {
                        try {
                            const userDoc = await db.collection('users').doc(user.uid).get();
                            if (userDoc.exists) {
                                const uData = userDoc.data();
                                if (uData.role === 'admin') { isAdmin = true; currentUserRole = 'admin'; }
                                else if (uData.role === 'eboard') { currentUserRole = 'eboard'; }
                                if (uData.fullName) currentUserName = uData.fullName;
                                if (uData.profilePic) currentUserAvatar = uData.profilePic;
                            }
                        } catch (err) {
                            console.warn(err);
                        }
                    }

                    // Update Top Nav
                    const loginBtns = document.querySelectorAll('.btn-login, .mobile-nav a[href="login.html"]');
                    loginBtns.forEach(b => {
                        b.textContent = 'DASHBOARD';
                        b.href = 'dashboard.html';
                    });
                } else {
                    isAdmin = false;
                    currentUserRole = 'guest';
                    currentUserName = 'Guest';
                    currentUserAvatar = '';
                }

                updateUIForUser();
                if (currentDiscussionId) {
                    renderDiscussionView(currentDiscussionId);
                } else {
                    renderDiscussions();
                }
            });
        }
    }

    function updateUIForUser() {
        const createBtn = document.getElementById('btnOpenCreateModal');
        if (createBtn) {
            createBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }

        const composerAvatar = document.getElementById('composerUserAvatar');
        if (composerAvatar) {
            if (currentUserAvatar) {
                composerAvatar.innerHTML = `<img src="${currentUserAvatar}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                composerAvatar.textContent = (currentUserName.charAt(0) || 'U').toUpperCase();
            }
        }

        updateNotificationBadge();
    }

    // --- Time formatting helper ---
    function formatTimeAgo(isoString) {
        if (!isoString) return 'Just now';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

    // --- Discussions Catalog View ---
    function renderDiscussions() {
        const grid = document.getElementById('discussionsGrid');
        if (!grid) return;

        // Filter by tab (active, upcoming, archived)
        let filtered = discussions.filter(d => {
            if (currentTab === 'active') return d.status === 'active';
            if (currentTab === 'upcoming') return d.status === 'upcoming';
            if (currentTab === 'archived') return d.status === 'archived';
            return true;
        });

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(d =>
                (d.title && d.title.toLowerCase().includes(q)) ||
                (d.question && d.question.toLowerCase().includes(q)) ||
                (d.author && d.author.toLowerCase().includes(q)) ||
                (d.type && d.type.toLowerCase().includes(q))
            );
        }

        // Sort: Pinned first, then by date
        filtered.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Update tab count badges
        const activeCount = discussions.filter(d => d.status === 'active').length;
        const upcomingCount = discussions.filter(d => d.status === 'upcoming').length;
        const archivedCount = discussions.filter(d => d.status === 'archived').length;

        const countActiveEl = document.getElementById('countActive');
        if (countActiveEl) countActiveEl.textContent = activeCount;
        const countUpcomingEl = document.getElementById('countUpcoming');
        if (countUpcomingEl) countUpcomingEl.textContent = upcomingCount;
        const countArchivedEl = document.getElementById('countArchived');
        if (countArchivedEl) countArchivedEl.textContent = archivedCount;

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="voice-empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-book-open voice-empty-icon"></i>
                    <h3 class="voice-empty-title">No Discussions in this Shelf</h3>
                    <p class="voice-empty-desc">
                        ${currentTab === 'archived'
                            ? 'This conversation has ended, but its Voices remain part of the Verba Vitae archive.'
                            : 'There are no discussions matching your current filter. New literary topics will be added shortly!'}
                    </p>
                    ${isAdmin ? `<button class="btn-new-discussion" onclick="openCreateModal()"><i class="fas fa-plus"></i> Create Discussion</button>` : ''}
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(d => {
            const discVoices = voices.filter(v => v.discussionId === d.id && !v.isHidden);
            const discVoiceCount = discVoices.length;
            const discReplyCount = replies.filter(r => r.discussionId === d.id).length;

            const coverImg = d.coverImage || 'images/slide1.jpg';
            const author = d.author ? `by ${escapeHtml(d.author)}` : '';
            const chapterTag = d.chapterRange ? `· ${escapeHtml(d.chapterRange)}` : '';
            const createdByName = d.createdBy ? escapeHtml(d.createdBy.name) : 'Admin';

            return `
                <article class="discussion-card ${d.isPinned ? 'pinned' : ''}" data-id="${d.id}">
                    ${d.isPinned ? `<span class="pinned-badge"><i class="fas fa-thumbtack"></i> Pinned Topic</span>` : ''}
                    <div class="card-cover-container">
                        <img src="${coverImg}" alt="${escapeHtml(d.title)}" class="card-cover-img" loading="lazy">
                        <div class="card-cover-gradient"></div>
                        <div class="card-cover-info">
                            <span class="card-type-tag">${escapeHtml(d.type || 'Book Discussion')}</span>
                            <h3 class="card-book-title">${escapeHtml(d.title)}</h3>
                            <p class="card-book-author">${author} ${chapterTag}</p>
                        </div>
                    </div>
                    <div class="card-body">
                        <h4 class="card-question">${escapeHtml(d.question)}</h4>
                        <p class="card-prompt">${escapeHtml(d.description)}</p>
                        <div class="card-meta">
                            <div class="card-author">
                                <i class="fas fa-feather-pointed" style="color: var(--voice-accent);"></i>
                                <span>${createdByName}</span>
                            </div>
                            <div class="card-counts">
                                <span><i class="far fa-comment-dots"></i> ${discVoiceCount} Voices</span>
                                <span><i class="fas fa-reply"></i> ${discReplyCount} Replies</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn-join-discussion" onclick="openDiscussion('${d.id}')">
                            <i class="fas fa-door-open"></i> Join Discussion
                        </button>
                    </div>
                </article>
            `;
        }).join('');
    }

    // --- Discussion View (Single Topic) ---
    function openDiscussion(id) {
        currentDiscussionId = id;
        const url = new URL(window.location);
        url.searchParams.set('id', id);
        window.history.pushState({ discussionId: id }, '', url);

        renderDiscussionView(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.openDiscussion = openDiscussion;

    function renderDiscussionView(id) {
        const hubWrapper = document.getElementById('voiceHubWrapper');
        const viewWrapper = document.getElementById('voiceTopicWrapper');
        if (!hubWrapper || !viewWrapper) return;

        const disc = discussions.find(d => d.id === id);
        if (!disc) {
            alert('Discussion not found.');
            goBackToHub();
            return;
        }

        hubWrapper.style.display = 'none';
        viewWrapper.style.display = 'block';

        // Render Header
        document.getElementById('topicBookTitle').textContent = disc.author ? `${disc.title} by ${disc.author}` : disc.title;
        document.getElementById('topicTypeBadge').textContent = disc.type || 'Book Discussion';
        document.getElementById('topicStatusBadge').className = `topic-status-badge status-${disc.status || 'active'}`;
        document.getElementById('topicStatusBadge').textContent = (disc.status || 'active').toUpperCase();

        const chapterEl = document.getElementById('topicChapterBadge');
        if (chapterEl) {
            chapterEl.textContent = disc.chapterRange || '';
            chapterEl.style.display = disc.chapterRange ? 'inline-block' : 'none';
        }

        document.getElementById('topicQuestionTitle').textContent = disc.question;
        document.getElementById('topicPromptBody').textContent = disc.description;

        const coverImgEl = document.getElementById('topicCoverImg');
        if (coverImgEl) {
            coverImgEl.src = disc.coverImage || 'images/slide1.jpg';
            coverImgEl.alt = disc.title;
        }

        // Admin controls in Header
        const adminControls = document.getElementById('topicAdminControls');
        if (adminControls) {
            adminControls.style.display = isAdmin ? 'flex' : 'none';
            if (isAdmin) {
                adminControls.innerHTML = `
                    <button class="btn-admin-action" onclick="openEditModal('${disc.id}')"><i class="fas fa-edit"></i> Edit Prompt</button>
                    <button class="btn-admin-action" onclick="togglePinDiscussion('${disc.id}')"><i class="fas fa-thumbtack"></i> ${disc.isPinned ? 'Unpin' : 'Pin'}</button>
                    <button class="btn-admin-action" onclick="toggleLockDiscussion('${disc.id}')"><i class="fas fa-lock"></i> ${disc.isLocked ? 'Unlock' : 'Lock'}</button>
                    <button class="btn-admin-action" onclick="toggleArchiveDiscussion('${disc.id}')"><i class="fas fa-archive"></i> ${disc.status === 'archived' ? 'Reopen Discussion' : 'Archive Discussion'}</button>
                    <button class="btn-admin-action" onclick="openCurateModal('${disc.id}')"><i class="fas fa-star" style="color:#d4af37;"></i> Manage "From the Conversation"</button>
                    <button class="btn-admin-action danger" onclick="deleteDiscussionPrompt('${disc.id}')"><i class="fas fa-trash-alt"></i> Delete</button>
                `;
            }
        }

        // Render "From the Conversation" Section
        const fromConvBox = document.getElementById('fromConversationBox');
        if (fromConvBox) {
            if (disc.fromTheConversation && disc.fromTheConversation.length > 0) {
                fromConvBox.style.display = 'block';
                const grid = document.getElementById('fromConvGrid');
                grid.innerHTML = disc.fromTheConversation.map(item => `
                    <div class="highlight-card">
                        <div class="highlight-author">
                            <i class="fas fa-bookmark" style="color: var(--voice-gold);"></i>
                            <strong>${escapeHtml(item.author)}</strong>
                            <span style="font-size: 0.75rem; color: var(--voice-text-muted);">(${escapeHtml(item.role || 'Member')})</span>
                        </div>
                        <p class="highlight-quote">"${escapeHtml(item.quote)}"</p>
                    </div>
                `).join('');
            } else {
                fromConvBox.style.display = 'none';
            }
        }

        // Handle locked status for composer
        const composerCard = document.getElementById('voiceComposerCard');
        if (composerCard) {
            if (disc.isLocked) {
                composerCard.innerHTML = `
                    <div style="text-align: center; color: #718096; padding: 10px;">
                        <i class="fas fa-lock" style="font-size: 1.3rem; margin-bottom: 6px; color: #a0aec0;"></i>
                        <p style="margin: 0; font-weight: 600;">This discussion is currently locked by the administrator. New Voices cannot be added.</p>
                    </div>
                `;
            }
        }

        renderVoicesFeed();
    }

    function goBackToHub() {
        currentDiscussionId = null;
        const url = new URL(window.location);
        url.searchParams.delete('id');
        url.searchParams.delete('discussion');
        window.history.pushState({}, '', url);

        const hubWrapper = document.getElementById('voiceHubWrapper');
        const viewWrapper = document.getElementById('voiceTopicWrapper');
        if (hubWrapper && viewWrapper) {
            hubWrapper.style.display = 'block';
            viewWrapper.style.display = 'none';
        }
        renderDiscussions();
    }

    window.goBackToHub = goBackToHub;

    // --- Voices Feed Rendering ---
    function renderVoicesFeed() {
        const feedContainer = document.getElementById('voicesFeedList');
        const countLabel = document.getElementById('voicesTotalCount');
        if (!feedContainer || !currentDiscussionId) return;

        let discVoices = voices.filter(v => v.discussionId === currentDiscussionId);

        // Filter hidden voices for non-admins
        if (!isAdmin) {
            discVoices = discVoices.filter(v => !v.isHidden);
        }

        if (countLabel) {
            countLabel.textContent = `${discVoices.length} ${discVoices.length === 1 ? 'Voice' : 'Voices'}`;
        }

        // Sorting
        if (currentSort === 'featured') {
            discVoices.sort((a, b) => {
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
        } else if (currentSort === 'discussed') {
            discVoices.sort((a, b) => {
                const aReplies = replies.filter(r => r.voiceId === a.id).length;
                const bReplies = replies.filter(r => r.voiceId === b.id).length;
                return bReplies - aReplies;
            });
        } else {
            // Newest first
            discVoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        if (discVoices.length === 0) {
            feedContainer.innerHTML = `
                <div class="voice-empty-state">
                    <i class="fas fa-feather-pointed voice-empty-icon"></i>
                    <h3 class="voice-empty-title">Be the first to add your Voice.</h3>
                    <p class="voice-empty-desc">A discussion becomes interesting when someone starts it. Share your thoughts, a striking quote, or an insightful perspective.</p>
                    <button class="btn-post-voice" onclick="focusComposer()"><i class="fas fa-pen"></i> Add Your Voice</button>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = discVoices.map(v => renderVoiceCardHtml(v)).join('');
    }

    function renderVoiceCardHtml(v) {
        const isAuthor = currentUser && (currentUser.uid === v.userId || currentUser.email === v.userEmail);
        const canModerate = isAdmin;
        const voiceReplies = replies.filter(r => r.voiceId === v.id);

        const currentUid = currentUser ? currentUser.uid : 'anon';
        const loves = (v.reactions && v.reactions.love) || [];
        const interesting = (v.reactions && v.reactions.interesting) || [];
        const thought = (v.reactions && v.reactions.thought) || [];

        const hasLoved = loves.includes(currentUid);
        const hasInteresting = interesting.includes(currentUid);
        const hasThought = thought.includes(currentUid);

        // Avatar
        let avatarHtml = '';
        if (v.userAvatar) {
            avatarHtml = `<img src="${v.userAvatar}" alt="${escapeHtml(v.userName)}" class="voice-avatar">`;
        } else {
            avatarHtml = `<div class="voice-avatar">${(v.userName || 'U').charAt(0).toUpperCase()}</div>`;
        }

        // Role tag
        let roleBadge = '';
        if (v.userRole === 'admin') {
            roleBadge = `<span class="voice-role-tag role-admin"><i class="fas fa-shield-halved"></i> Admin</span>`;
        } else if (v.userRole === 'eboard') {
            roleBadge = `<span class="voice-role-tag role-eboard"><i class="fas fa-star"></i> E-Board</span>`;
        } else {
            roleBadge = `<span class="voice-role-tag role-member">Member</span>`;
        }

        return `
            <article class="voice-card ${v.isFeatured ? 'featured' : ''} ${v.isHidden ? 'hidden-voice' : ''}" id="card_${v.id}">
                ${v.isFeatured ? `<div class="featured-voice-badge"><i class="fas fa-award"></i> Featured Voice</div>` : ''}
                ${v.isHidden ? `<div style="background:#fed7d7; color:#c53030; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:700; margin-bottom:8px;"><i class="fas fa-eye-slash"></i> Hidden by Moderator</div>` : ''}

                <div class="voice-card-header">
                    <div class="voice-user-meta">
                        ${avatarHtml}
                        <div class="voice-user-info">
                            <div class="voice-author-name">
                                <span>${escapeHtml(v.userName)}</span>
                                ${roleBadge}
                            </div>
                            <span class="voice-timestamp">${formatTimeAgo(v.createdAt)}</span>
                        </div>
                    </div>

                    <!-- Voice Dropdown Menu -->
                    <div class="voice-menu-dropdown">
                        <button class="btn-voice-menu" onclick="toggleVoiceMenu('${v.id}')" aria-label="Menu"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="voice-menu-popup" id="menu_${v.id}">
                            ${canModerate ? `
                                <button class="voice-menu-item" onclick="toggleFeatureVoice('${v.id}')">
                                    <i class="fas fa-star" style="color:var(--voice-gold);"></i> ${v.isFeatured ? 'Unmark Featured' : 'Mark as Featured Voice'}
                                </button>
                                <button class="voice-menu-item" onclick="toggleHideVoice('${v.id}')">
                                    <i class="fas ${v.isHidden ? 'fa-eye' : 'fa-eye-slash'}"></i> ${v.isHidden ? 'Unhide Voice' : 'Hide from Public'}
                                </button>
                            ` : ''}
                            ${isAuthor ? `
                                <button class="voice-menu-item" onclick="editVoiceContent('${v.id}')">
                                    <i class="fas fa-pencil-alt"></i> Edit Your Voice
                                </button>
                            ` : ''}
                            ${(isAuthor || canModerate) ? `
                                <button class="voice-menu-item danger" onclick="deleteVoice('${v.id}')">
                                    <i class="fas fa-trash-alt"></i> Delete Voice
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Main Text -->
                <div class="voice-body-text" id="voice_body_${v.id}">${escapeHtml(v.content)}</div>

                <!-- Attached Quote -->
                ${v.quote && v.quote.text ? `
                    <div class="voice-quote-attachment">
                        <p class="voice-quote-text">“${escapeHtml(v.quote.text)}”</p>
                        ${v.quote.author ? `<p class="voice-quote-author">— ${escapeHtml(v.quote.author)}</p>` : ''}
                    </div>
                ` : ''}

                <!-- Attached Image -->
                ${v.image ? `
                    <div class="voice-image-attachment">
                        <img src="${v.image}" alt="Attachment" onclick="window.open('${v.image}', '_blank')" loading="lazy">
                    </div>
                ` : ''}

                <!-- Attached Link -->
                ${v.link && v.link.url ? `
                    <a href="${escapeHtml(v.link.url)}" target="_blank" rel="noopener noreferrer" class="voice-link-attachment">
                        <i class="fas fa-external-link-alt"></i> ${escapeHtml(v.link.title || v.link.url)}
                    </a>
                ` : ''}

                <!-- Reactions & Reply Footer -->
                <div class="voice-card-footer">
                    <div class="voice-reactions-bar">
                        <button class="reaction-pill ${hasLoved ? 'active' : ''}" onclick="toggleReaction('${v.id}', 'love')">
                            <span>❤️</span> <span>${loves.length || 0}</span>
                        </button>
                        <button class="reaction-pill ${hasInteresting ? 'active' : ''}" onclick="toggleReaction('${v.id}', 'interesting')">
                            <span>💡</span> <span>${interesting.length || 0}</span>
                        </button>
                        <button class="reaction-pill ${hasThought ? 'active' : ''}" onclick="toggleReaction('${v.id}', 'thought')">
                            <span>🤔</span> <span>${thought.length || 0}</span>
                        </button>
                    </div>

                    <button class="btn-trigger-reply" onclick="toggleReplyBox('${v.id}')">
                        <i class="fas fa-reply"></i> Reply (${voiceReplies.length})
                    </button>
                </div>

                <!-- Nested Replies Section -->
                <div class="replies-thread-container" id="replies_${v.id}">
                    ${voiceReplies.map(r => `
                        <div class="reply-item">
                            <div class="reply-header">
                                <div class="reply-user-meta">
                                    ${r.userAvatar ? `<img src="${r.userAvatar}" class="reply-avatar">` : `<div class="reply-avatar">${(r.userName || 'U').charAt(0).toUpperCase()}</div>`}
                                    <span class="reply-author-name">${escapeHtml(r.userName)}</span>
                                </div>
                                <span style="font-size: 0.72rem; color: #a0aec0;">${formatTimeAgo(r.createdAt)}</span>
                            </div>
                            <p class="reply-body-text">${escapeHtml(r.content)}</p>
                        </div>
                    `).join('')}

                    <!-- Reply Composer (Always visible or toggleable) -->
                    <div class="reply-composer-box" id="reply_box_${v.id}">
                        <input type="text" placeholder="Reply to ${escapeHtml(v.userName)}..." class="reply-input-text" id="reply_input_${v.id}" onkeydown="if(event.key==='Enter') submitReply('${v.id}')">
                        <button class="btn-send-reply" onclick="submitReply('${v.id}')">Reply</button>
                    </div>
                </div>
            </article>
        `;
    }

    // --- Submitting a New Voice ("Add Your Voice") ---
    async function submitVoice() {
        if (!currentUser && localStorage.getItem('verba_logged_in') !== 'true') {
            alert('You must be registered and logged into Verba Vitae to add your Voice.');
            window.location.href = 'login.html';
            return;
        }

        const inputEl = document.getElementById('voiceMainText');
        const text = inputEl ? inputEl.value.trim() : '';

        // Check attachments
        const quoteTextEl = document.getElementById('quoteTextInput');
        const quoteAuthorEl = document.getElementById('quoteAuthorInput');
        const linkUrlEl = document.getElementById('linkUrlInput');
        const linkTitleEl = document.getElementById('linkTitleInput');
        const imagePreviewEl = document.getElementById('composerImgPreview');

        const quoteText = quoteTextEl ? quoteTextEl.value.trim() : '';
        const quoteAuthor = quoteAuthorEl ? quoteAuthorEl.value.trim() : '';
        const linkUrl = linkUrlEl ? linkUrlEl.value.trim() : '';
        const linkTitle = linkTitleEl ? linkTitleEl.value.trim() : '';
        const imgData = (imagePreviewEl && imagePreviewEl.style.display !== 'none') ? imagePreviewEl.src : null;

        if (!text && !quoteText && !imgData && !linkUrl) {
            alert('Please share your thoughts or attach a quote/image to post your Voice.');
            return;
        }

        const newVoice = {
            id: 'voice_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            discussionId: currentDiscussionId,
            userId: currentUser ? currentUser.uid : ('user_' + Date.now()),
            userEmail: currentUser ? currentUser.email : '',
            userName: currentUserName || 'Member',
            userAvatar: currentUserAvatar || '',
            userRole: currentUserRole || 'member',
            content: text,
            quote: quoteText ? { text: quoteText, author: quoteAuthor } : null,
            image: imgData || null,
            link: linkUrl ? { url: linkUrl, title: linkTitle || linkUrl } : null,
            createdAt: new Date().toISOString(),
            isFeatured: false,
            isHidden: false,
            reactions: { love: [], interesting: [], thought: [] }
        };

        voices.unshift(newVoice);
        saveLocalData();

        // Sync to firestore if available
        if (typeof db !== 'undefined' && db) {
            db.collection('voices').doc(newVoice.id).set(newVoice).catch(e => console.warn(e));
        }

        // Reset inputs
        if (inputEl) inputEl.value = '';
        if (quoteTextEl) quoteTextEl.value = '';
        if (quoteAuthorEl) quoteAuthorEl.value = '';
        if (linkUrlEl) linkUrlEl.value = '';
        if (linkTitleEl) linkTitleEl.value = '';
        if (imagePreviewEl) { imagePreviewEl.src = ''; imagePreviewEl.style.display = 'none'; }
        closeAllComposerPanels();

        renderVoicesFeed();
    }

    window.submitVoice = submitVoice;

    // --- Submitting a Reply ---
    async function submitReply(voiceId) {
        if (!currentUser && localStorage.getItem('verba_logged_in') !== 'true') {
            alert('You must log in to reply to this Voice.');
            window.location.href = 'login.html';
            return;
        }

        const input = document.getElementById(`reply_input_${voiceId}`);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        const newReply = {
            id: 'rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            voiceId: voiceId,
            discussionId: currentDiscussionId,
            userId: currentUser ? currentUser.uid : 'anon',
            userName: currentUserName || 'Member',
            userAvatar: currentUserAvatar || '',
            userRole: currentUserRole || 'member',
            content: text,
            createdAt: new Date().toISOString()
        };

        replies.push(newReply);
        saveLocalData();

        if (typeof db !== 'undefined' && db) {
            db.collection('replies').doc(newReply.id).set(newReply).catch(e => console.warn(e));
        }

        // Create notification for the Voice author
        const parentVoice = voices.find(v => v.id === voiceId);
        if (parentVoice && parentVoice.userId !== (currentUser ? currentUser.uid : null)) {
            createNotification({
                recipientUid: parentVoice.userId,
                title: 'New Reply to Your Voice',
                message: `${currentUserName} replied to your Voice in "${document.getElementById('topicBookTitle').textContent}".`,
                discussionId: currentDiscussionId,
                voiceId: voiceId
            });
        }

        input.value = '';
        renderVoicesFeed();
    }

    window.submitReply = submitReply;

    // --- Reaction System ---
    function toggleReaction(voiceId, type) {
        if (!currentUser && localStorage.getItem('verba_logged_in') !== 'true') {
            alert('Please log in to react to this Voice.');
            window.location.href = 'login.html';
            return;
        }

        const v = voices.find(item => item.id === voiceId);
        if (!v) return;

        if (!v.reactions) v.reactions = { love: [], interesting: [], thought: [] };
        if (!v.reactions[type]) v.reactions[type] = [];

        const uid = currentUser ? currentUser.uid : 'local_user';
        const list = v.reactions[type];
        const idx = list.indexOf(uid);

        if (idx >= 0) {
            list.splice(idx, 1); // remove
        } else {
            list.push(uid); // add
        }

        saveLocalData();

        if (typeof db !== 'undefined' && db) {
            db.collection('voices').doc(v.id).update({
                [`reactions.${type}`]: list
            }).catch(e => console.warn(e));
        }

        renderVoicesFeed();
    }

    window.toggleReaction = toggleReaction;

    // --- Admin Voice Moderation ---
    function toggleFeatureVoice(voiceId) {
        if (!isAdmin) return;
        const v = voices.find(item => item.id === voiceId);
        if (!v) return;
        v.isFeatured = !v.isFeatured;
        saveLocalData();

        if (v.isFeatured) {
            createNotification({
                recipientUid: v.userId,
                title: 'Your Voice was Featured! ⭐',
                message: `An admin highlighted your Voice as a Featured Voice in the reading club discussion!`,
                discussionId: v.discussionId,
                voiceId: v.id
            });
        }

        renderVoicesFeed();
    }

    window.toggleFeatureVoice = toggleFeatureVoice;

    function toggleHideVoice(voiceId) {
        if (!isAdmin) return;
        const v = voices.find(item => item.id === voiceId);
        if (!v) return;
        v.isHidden = !v.isHidden;
        saveLocalData();
        renderVoicesFeed();
    }

    window.toggleHideVoice = toggleHideVoice;

    function deleteVoice(voiceId) {
        const v = voices.find(item => item.id === voiceId);
        if (!v) return;
        if (!confirm('Are you sure you want to delete this Voice?')) return;

        voices = voices.filter(item => item.id !== voiceId);
        replies = replies.filter(r => r.voiceId !== voiceId);
        saveLocalData();

        if (typeof db !== 'undefined' && db) {
            db.collection('voices').doc(voiceId).delete().catch(e => console.warn(e));
        }

        renderVoicesFeed();
    }

    window.deleteVoice = deleteVoice;

    function editVoiceContent(voiceId) {
        const v = voices.find(item => item.id === voiceId);
        if (!v) return;
        const newText = prompt('Edit your Voice:', v.content);
        if (newText !== null && newText.trim()) {
            v.content = newText.trim();
            saveLocalData();
            renderVoicesFeed();
        }
    }

    window.editVoiceContent = editVoiceContent;

    // --- Admin Discussion Operations ---
    function togglePinDiscussion(discId) {
        if (!isAdmin) return;
        const d = discussions.find(item => item.id === discId);
        if (!d) return;
        d.isPinned = !d.isPinned;
        saveLocalData();
        renderDiscussionView(discId);
    }

    window.togglePinDiscussion = togglePinDiscussion;

    function toggleLockDiscussion(discId) {
        if (!isAdmin) return;
        const d = discussions.find(item => item.id === discId);
        if (!d) return;
        d.isLocked = !d.isLocked;
        saveLocalData();
        renderDiscussionView(discId);
    }

    window.toggleLockDiscussion = toggleLockDiscussion;

    function toggleArchiveDiscussion(discId) {
        if (!isAdmin) return;
        const d = discussions.find(item => item.id === discId);
        if (!d) return;
        d.status = (d.status === 'archived') ? 'active' : 'archived';
        saveLocalData();
        renderDiscussionView(discId);
    }

    window.toggleArchiveDiscussion = toggleArchiveDiscussion;

    function deleteDiscussionPrompt(discId) {
        if (!isAdmin) return;
        if (!confirm('Are you sure you want to delete this entire discussion and all its Voices?')) return;
        discussions = discussions.filter(item => item.id !== discId);
        voices = voices.filter(v => v.discussionId !== discId);
        replies = replies.filter(r => r.discussionId !== discId);
        saveLocalData();

        if (typeof db !== 'undefined' && db) {
            db.collection('discussions').doc(discId).delete().catch(e => console.warn(e));
        }

        goBackToHub();
    }

    window.deleteDiscussionPrompt = deleteDiscussionPrompt;

    // --- Create & Edit Discussion Modal ---
    function openCreateModal() {
        if (!isAdmin) return;
        document.getElementById('modalFormTitle').textContent = 'Create New Discussion';
        document.getElementById('editDiscussionId').value = '';
        document.getElementById('mBookTitle').value = '';
        document.getElementById('mAuthor').value = '';
        document.getElementById('mQuestion').value = '';
        document.getElementById('mPromptDesc').value = '';
        document.getElementById('mCoverUrl').value = '';
        document.getElementById('mChapterRange').value = '';
        document.getElementById('mDiscType').value = 'Book Discussion';
        document.getElementById('mStatus').value = 'active';
        document.getElementById('mIsPinned').checked = false;

        document.getElementById('voiceModalOverlay').classList.add('show');
    }

    window.openCreateModal = openCreateModal;

    function openEditModal(discId) {
        if (!isAdmin) return;
        const d = discussions.find(item => item.id === discId);
        if (!d) return;

        document.getElementById('modalFormTitle').textContent = 'Edit Discussion';
        document.getElementById('editDiscussionId').value = d.id;
        document.getElementById('mBookTitle').value = d.title || '';
        document.getElementById('mAuthor').value = d.author || '';
        document.getElementById('mQuestion').value = d.question || '';
        document.getElementById('mPromptDesc').value = d.description || '';
        document.getElementById('mCoverUrl').value = d.coverImage || '';
        document.getElementById('mChapterRange').value = d.chapterRange || '';
        document.getElementById('mDiscType').value = d.type || 'Book Discussion';
        document.getElementById('mStatus').value = d.status || 'active';
        document.getElementById('mIsPinned').checked = !!d.isPinned;

        document.getElementById('voiceModalOverlay').classList.add('show');
    }

    window.openEditModal = openEditModal;

    function closeDiscussionModal() {
        document.getElementById('voiceModalOverlay').classList.remove('show');
    }

    window.closeDiscussionModal = closeDiscussionModal;

    function saveDiscussionFromModal() {
        if (!isAdmin) return;
        const editId = document.getElementById('editDiscussionId').value;
        const bookTitle = document.getElementById('mBookTitle').value.trim();
        const author = document.getElementById('mAuthor').value.trim();
        const question = document.getElementById('mQuestion').value.trim();
        const desc = document.getElementById('mPromptDesc').value.trim();
        const cover = document.getElementById('mCoverUrl').value.trim();
        const chapters = document.getElementById('mChapterRange').value.trim();
        const type = document.getElementById('mDiscType').value;
        const status = document.getElementById('mStatus').value;
        const isPinned = document.getElementById('mIsPinned').checked;

        if (!bookTitle || !question || !desc) {
            alert('Please fill out the Book Title, Central Question, and Description prompt.');
            return;
        }

        if (editId) {
            // Edit existing
            const d = discussions.find(item => item.id === editId);
            if (d) {
                d.title = bookTitle;
                d.author = author;
                d.question = question;
                d.description = desc;
                d.coverImage = cover || d.coverImage;
                d.chapterRange = chapters;
                d.type = type;
                d.status = status;
                d.isPinned = isPinned;
            }
        } else {
            // Create new
            const newDisc = {
                id: 'disc_' + Date.now(),
                title: bookTitle,
                author: author,
                question: question,
                description: desc,
                coverImage: cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
                chapterRange: chapters,
                type: type,
                status: status,
                isPinned: isPinned,
                isLocked: false,
                openDate: new Date().toISOString().split('T')[0],
                closeDate: '',
                createdBy: { name: currentUserName, role: currentUserRole },
                createdAt: new Date().toISOString(),
                fromTheConversation: []
            };
            discussions.unshift(newDisc);

            if (typeof db !== 'undefined' && db) {
                db.collection('discussions').doc(newDisc.id).set(newDisc).catch(e => console.warn(e));
            }
        }

        saveLocalData();
        closeDiscussionModal();

        if (currentDiscussionId && editId) {
            renderDiscussionView(editId);
        } else {
            renderDiscussions();
        }
    }

    window.saveDiscussionFromModal = saveDiscussionFromModal;

    // --- "From the Conversation" Curator Modal ---
    function openCurateModal(discId) {
        if (!isAdmin) return;
        const d = discussions.find(item => item.id === discId);
        if (!d) return;

        const discVoices = voices.filter(v => v.discussionId === discId && !v.isHidden);
        if (discVoices.length === 0) {
            alert('There are no Voices in this discussion to curate yet.');
            return;
        }

        const voiceOptions = discVoices.map((v, idx) => `
            <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
                <label style="display: flex; gap: 8px; align-items: flex-start; cursor: pointer;">
                    <input type="checkbox" name="curateVoice" value="${v.id}" ${(d.fromTheConversation || []).some(h => h.author === v.userName && h.quote === v.content) ? 'checked' : ''}>
                    <div>
                        <strong>${escapeHtml(v.userName)} (${escapeHtml(v.userRole)})</strong>
                        <p style="margin: 4px 0 0 0; font-size: 0.88rem; color: #4a5568;">${escapeHtml(v.content)}</p>
                    </div>
                </label>
            </div>
        `).join('');

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'voice-modal-overlay show';
        modalOverlay.id = 'curateModalOverlay';
        modalOverlay.innerHTML = `
            <div class="voice-modal-card" style="max-width: 600px;">
                <div class="voice-modal-header">
                    <h3 class="voice-modal-title">Manage "From the Conversation"</h3>
                    <button class="btn-close-modal" onclick="document.getElementById('curateModalOverlay').remove()">&times;</button>
                </div>
                <div class="voice-modal-body">
                    <p style="font-size: 0.9rem; color: #718096; margin: 0 0 10px 0;">Select approximately 3 to 5 Voices to preserve in the permanent highlight reel for this book.</p>
                    ${voiceOptions}
                </div>
                <div class="voice-modal-footer">
                    <button class="btn-admin-action" onclick="document.getElementById('curateModalOverlay').remove()">Cancel</button>
                    <button class="btn-post-voice" id="btnSaveCurated">Save Highlights</button>
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        document.getElementById('btnSaveCurated').addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('input[name="curateVoice"]:checked');
            const selected = [];
            checkedBoxes.forEach(cb => {
                const targetVoice = discVoices.find(v => v.id === cb.value);
                if (targetVoice) {
                    selected.push({
                        author: targetVoice.userName,
                        role: targetVoice.userRole,
                        quote: targetVoice.content
                    });
                }
            });

            d.fromTheConversation = selected;
            saveLocalData();
            modalOverlay.remove();
            renderDiscussionView(discId);
        });
    }

    window.openCurateModal = openCurateModal;

    // --- Notifications System ---
    function createNotification({ recipientUid, title, message, discussionId, voiceId }) {
        const notif = {
            id: 'notif_' + Date.now(),
            recipientUid: recipientUid,
            title: title,
            message: message,
            discussionId: discussionId,
            voiceId: voiceId,
            read: false,
            createdAt: new Date().toISOString()
        };
        notifications.unshift(notif);
        saveLocalData();
        updateNotificationBadge();
    }

    function updateNotificationBadge() {
        const badge = document.getElementById('voiceNotifBadge');
        if (!badge) return;
        const unreadCount = notifications.filter(n => !n.read).length;
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }

    function toggleNotificationDrawer() {
        const drawer = document.getElementById('notifDrawer');
        const overlay = document.getElementById('notifDrawerOverlay');
        if (!drawer || !overlay) return;

        const isShowing = drawer.classList.contains('show');
        if (isShowing) {
            drawer.classList.remove('show');
            overlay.classList.remove('show');
        } else {
            renderNotificationsList();
            drawer.classList.add('show');
            overlay.classList.add('show');
        }
    }

    window.toggleNotificationDrawer = toggleNotificationDrawer;

    function renderNotificationsList() {
        const listEl = document.getElementById('notifList');
        if (!listEl) return;

        if (notifications.length === 0) {
            listEl.innerHTML = '<div style="padding: 24px; text-align: center; color: #a0aec0; font-size: 0.9rem;">No notifications right now.</div>';
            return;
        }

        listEl.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="clickNotification('${n.id}')">
                <span class="notif-title">${escapeHtml(n.title)}</span>
                <span class="notif-text">${escapeHtml(n.message)}</span>
                <span class="notif-time">${formatTimeAgo(n.createdAt)}</span>
            </div>
        `).join('');
    }

    function clickNotification(notifId) {
        const n = notifications.find(item => item.id === notifId);
        if (!n) return;
        n.read = true;
        saveLocalData();
        updateNotificationBadge();
        toggleNotificationDrawer();

        if (n.discussionId) {
            openDiscussion(n.discussionId);
        }
    }

    window.clickNotification = clickNotification;

    // --- UI Helpers & Event Listeners ---
    function toggleVoiceMenu(voiceId) {
        const menu = document.getElementById(`menu_${voiceId}`);
        if (!menu) return;
        const isShown = menu.classList.contains('show');
        document.querySelectorAll('.voice-menu-popup').forEach(m => m.classList.remove('show'));
        if (!isShown) menu.classList.add('show');
    }

    window.toggleVoiceMenu = toggleVoiceMenu;

    function toggleReplyBox(voiceId) {
        const box = document.getElementById(`reply_box_${voiceId}`);
        const input = document.getElementById(`reply_input_${voiceId}`);
        if (box && input) {
            box.style.display = (box.style.display === 'none') ? 'flex' : 'flex';
            input.focus();
        }
    }

    window.toggleReplyBox = toggleReplyBox;

    function focusComposer() {
        const input = document.getElementById('voiceMainText');
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    window.focusComposer = focusComposer;

    function closeAllComposerPanels() {
        document.querySelectorAll('.composer-attachment-panel').forEach(p => p.classList.remove('open'));
        document.querySelectorAll('.btn-media-toggle').forEach(b => b.classList.remove('active'));
    }

    function toggleMediaPanel(panelId, btn) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const isOpen = panel.classList.contains('open');
        closeAllComposerPanels();
        if (!isOpen) {
            panel.classList.add('open');
            if (btn) btn.classList.add('active');
        }
    }

    window.toggleMediaPanel = toggleMediaPanel;

    // Image Upload helper (converts file to base64 data URL)
    function handleImageFileSelect(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
            const preview = document.getElementById('composerImgPreview');
            const previewBox = document.getElementById('imgPreviewBox');
            if (preview && previewBox) {
                preview.src = evt.target.result;
                preview.style.display = 'block';
                previewBox.style.display = 'flex';
            }
        };
        reader.readAsDataURL(file);
    }

    window.handleImageFileSelect = handleImageFileSelect;

    function removeAttachedImage() {
        const preview = document.getElementById('composerImgPreview');
        const previewBox = document.getElementById('imgPreviewBox');
        const fileInput = document.getElementById('imageFileInput');
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        if (previewBox) previewBox.style.display = 'none';
        if (fileInput) fileInput.value = '';
    }

    window.removeAttachedImage = removeAttachedImage;

    // Global Click outside dropdown listener
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.voice-menu-dropdown')) {
            document.querySelectorAll('.voice-menu-popup').forEach(m => m.classList.remove('show'));
        }
    });

    // --- Document Ready Handler ---
    document.addEventListener('DOMContentLoaded', () => {
        loadLocalData();
        initAuth();
        syncFirestore();

        // Check URL params for deep linking
        const params = new URLSearchParams(window.location.search);
        const deepId = params.get('id') || params.get('discussion');
        if (deepId) {
            openDiscussion(deepId);
        } else {
            renderDiscussions();
        }

        // Tab click listeners
        document.querySelectorAll('.voice-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.voice-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentTab = btn.getAttribute('data-tab');
                renderDiscussions();
            });
        });

        // Search listener
        const searchInput = document.getElementById('voiceSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderDiscussions();
            });
        }

        // Sorting listener
        const sortSelect = document.getElementById('voiceSortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                renderVoicesFeed();
            });
        }

        // Popstate back navigation
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.discussionId) {
                renderDiscussionView(e.state.discussionId);
            } else {
                goBackToHub();
            }
        });
    });

})();
