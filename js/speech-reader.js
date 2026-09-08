/**
 * Verba Vitae - Speech AI PDF Reader
 * Advanced single-page PDF streaming with text-to-speech audio reader,
 * Gemini 2.0 AI Neural Speech integration, fluid continuous synthesis,
 * karaoke sentence highlighting, and auto-page turning.
 */

(function () {
    'use strict';

    // Default Firebase API key from project as fallback default
    const defaultGoogleKey = (typeof firebaseConfig !== 'undefined' && firebaseConfig && firebaseConfig.apiKey) ? 
        firebaseConfig.apiKey : 'AIzaSyDYQWPWtY17SUP32rDHjOSqSENIAg_x5Tk';

    // State Management
    const state = {
        pdfDoc: null,
        currentPage: 1,
        totalPages: 0,
        currentScale: 1.2,
        renderTask: null,
        pageRendering: false,
        pageNumPending: null,
        textCache: new Map(), // pageNum -> { rawText, sentences }
        currentSentences: [],
        currentSentenceIndex: 0,
        isPlaying: false,
        isPaused: false,
        autoAdvance: true,
        speechRate: 1.0,
        selectedVoice: 'gemini:Aoede', // Default to ultra fluid Gemini AI voice!
        availableVoices: [],
        viewMode: 'split',
        theme: 'light',
        ttsProvider: 'gemini', // 'gemini' | 'webspeech' | 'openai'
        geminiApiKey: localStorage.getItem('vv_speech_gemini_key') || defaultGoogleKey,
        geminiVoice: localStorage.getItem('vv_speech_gemini_voice') || 'Aoede',
        openAiKey: localStorage.getItem('vv_speech_openai_key') || '',
        openAiVoice: localStorage.getItem('vv_speech_openai_voice') || 'nova',
        activeAudioElement: null,
        prefetchedAudios: new Map(), // sentenceIndex -> audio object/blob
        isPrefetching: false
    };

    // DOM Elements
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input');
    const btnSelectFile = document.getElementById('btn-select-file');
    const btnSampleDoc = document.getElementById('btn-sample-doc');
    const workspace = document.getElementById('reader-workspace');
    const canvas = document.getElementById('pdf-canvas');
    const canvasCtx = canvas ? canvas.getContext('2d') : null;
    const pageLoadingOverlay = document.getElementById('page-loading-overlay');
    const textScrollContainer = document.getElementById('text-content-scroll');

    // Navigation & Info DOM
    const docNameEl = document.getElementById('doc-name');
    const docStatsEl = document.getElementById('doc-stats');
    const pageInput = document.getElementById('current-page-input');
    const totalPagesEl = document.getElementById('total-pages-count');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const btnFirstPage = document.getElementById('btn-first-page');
    const btnLastPage = document.getElementById('btn-last-page');
    const splitViewContainer = document.getElementById('reader-split-view');
    const btnToggleSplit = document.getElementById('btn-toggle-split');
    const btnNewPdf = document.getElementById('btn-new-pdf');
    const themeSelect = document.getElementById('theme-select');

    // Audio Controls DOM
    const btnPlayPause = document.getElementById('btn-play-pause');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const btnStop = document.getElementById('btn-stop');
    const btnPrevSentence = document.getElementById('btn-prev-sentence');
    const btnNextSentence = document.getElementById('btn-next-sentence');
    const btnReplayPage = document.getElementById('btn-replay-page');
    const autoAdvanceToggle = document.getElementById('auto-advance-toggle');
    const voiceSelect = document.getElementById('voice-select');
    const speedButtons = document.querySelectorAll('.speed-btn');
    const aiWaveContainer = document.getElementById('ai-wave-container');
    const aiAvatarPulse = document.getElementById('ai-avatar-pulse');

    // Modal DOM
    const btnAiSettings = document.getElementById('btn-ai-settings');
    const settingsModal = document.getElementById('ai-settings-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnTestGeminiVoice = document.getElementById('btn-test-gemini');
    const geminiKeyInput = document.getElementById('gemini-api-key');
    const geminiVoiceSelect = document.getElementById('gemini-voice-select');
    const openAiKeyInput = document.getElementById('openai-api-key');
    const openAiVoiceSelect = document.getElementById('openai-voice-select');
    const ttsProviderSelect = document.getElementById('tts-provider-select');
    const toastEl = document.getElementById('speech-toast');

    // Initialize PDF.js worker
    if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    /**
     * Show toast message
     */
    function showToast(message, icon = 'fa-info-circle', duration = 4000) {
        if (!toastEl) return;
        toastEl.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), duration);
    }

    /**
     * Populate Voice Select List with Gemini AI options + Native Web Speech
     */
    function initVoiceList() {
        if (!voiceSelect) return;
        voiceSelect.innerHTML = '';

        // 1. Group: Gemini AI Voices (Ultra Fluid & Natural)
        const geminiGroup = document.createElement('optgroup');
        geminiGroup.label = '🌟 Gemini 2.0 AI (Ultra Fluida & Humana)';

        const geminiVoices = [
            { id: 'gemini:Aoede', name: 'Aoede', desc: 'Femenina • Expresiva y Melódica' },
            { id: 'gemini:Kore', name: 'Kore', desc: 'Femenina • Natural y Cálida' },
            { id: 'gemini:Puck', name: 'Puck', desc: 'Masculina • Enérgica y Clara' },
            { id: 'gemini:Charon', name: 'Charon', desc: 'Masculina • Grave y Profesional' },
            { id: 'gemini:Fenrir', name: 'Fenrir', desc: 'Masculina • Profunda y Resonante' }
        ];

        geminiVoices.forEach(gv => {
            const opt = document.createElement('option');
            opt.value = gv.id;
            opt.textContent = `✨ Gemini AI - ${gv.name} (${gv.desc})`;
            geminiGroup.appendChild(opt);
        });
        voiceSelect.appendChild(geminiGroup);

        // 2. Web Speech System Voices
        if ('speechSynthesis' in window) {
            const loadNativeVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                if (!voices || voices.length === 0) return;
                state.availableVoices = voices;

                // Remove previous native groups if any
                const existingNativeGroups = voiceSelect.querySelectorAll('.native-group');
                existingNativeGroups.forEach(g => g.remove());

                const spanishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
                const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));

                const addNativeGroup = (label, list) => {
                    if (list.length === 0) return;
                    const optGroup = document.createElement('optgroup');
                    optGroup.className = 'native-group';
                    optGroup.label = label;
                    list.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = 'native:' + v.name;
                        const isNatural = /natural|neural|online|google|siri/i.test(v.name);
                        opt.textContent = `${v.name} (${v.lang})${isNatural ? ' [Natural]' : ''}`;
                        optGroup.appendChild(opt);
                    });
                    voiceSelect.appendChild(optGroup);
                };

                addNativeGroup('Voces del Sistema (Español)', spanishVoices);
                addNativeGroup('Voces del Sistema (English)', englishVoices);
            };

            loadNativeVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadNativeVoices;
            }
        }

        // Set default selected voice
        const savedVoice = localStorage.getItem('vv_speech_active_voice');
        if (savedVoice) {
            voiceSelect.value = savedVoice;
            state.selectedVoice = savedVoice;
        } else {
            voiceSelect.value = 'gemini:Aoede';
            state.selectedVoice = 'gemini:Aoede';
        }

        updateProviderFromVoice(voiceSelect.value);
    }

    /**
     * Synchronize TTS provider based on voice selection
     */
    function updateProviderFromVoice(voiceVal) {
        if (!voiceVal) return;
        if (voiceVal.startsWith('gemini:')) {
            state.ttsProvider = 'gemini';
            state.geminiVoice = voiceVal.replace('gemini:', '');
            localStorage.setItem('vv_speech_gemini_voice', state.geminiVoice);
        } else if (voiceVal.startsWith('openai:')) {
            state.ttsProvider = 'openai';
        } else {
            state.ttsProvider = 'webspeech';
        }
        localStorage.setItem('vv_speech_active_voice', voiceVal);
    }

    /**
     * Load PDF from ArrayBuffer or URL
     */
    async function loadPdfDocument(data, docName = 'documento.pdf') {
        try {
            if (pageLoadingOverlay) pageLoadingOverlay.classList.add('active');
            stopSpeech();
            state.textCache.clear();
            state.prefetchedAudios.clear();

            const loadingTask = window.pdfjsLib.getDocument({
                data: data,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
            });

            state.pdfDoc = await loadingTask.promise;
            state.totalPages = state.pdfDoc.numPages;
            state.currentPage = 1;

            if (docNameEl) docNameEl.textContent = docName;
            if (docStatsEl) docStatsEl.textContent = `${state.totalPages} páginas detectadas • Modo lectura individual`;
            if (totalPagesEl) totalPagesEl.textContent = state.totalPages;
            if (pageInput) {
                pageInput.value = '1';
                pageInput.max = state.totalPages;
            }

            if (dropzone) dropzone.style.display = 'none';
            if (workspace) workspace.classList.add('active');

            await renderCurrentPage();
            showToast(`Documento cargado: ${state.totalPages} páginas.`, 'fa-check-circle');
        } catch (error) {
            console.error('Error cargando PDF:', error);
            showToast('Error al procesar el archivo PDF: ' + error.message, 'fa-times-circle');
        } finally {
            if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('active');
        }
    }

    /**
     * Render strictly ONE page onto the canvas (High-DPI optimized)
     */
    async function renderCurrentPage() {
        if (!state.pdfDoc) return;
        state.pageRendering = true;
        if (pageLoadingOverlay) pageLoadingOverlay.classList.add('active');

        try {
            const page = await state.pdfDoc.getPage(state.currentPage);

            const containerWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 40 : 800;
            const unscaledViewport = page.getViewport({ scale: 1 });
            const desiredScale = Math.min(Math.max(containerWidth / unscaledViewport.width, 0.8), 2.0);
            state.currentScale = desiredScale;

            const viewport = page.getViewport({ scale: state.currentScale });
            const pixelRatio = window.devicePixelRatio || 1;

            canvas.height = viewport.height * pixelRatio;
            canvas.width = viewport.width * pixelRatio;
            canvas.style.height = `${viewport.height}px`;
            canvas.style.width = `${viewport.width}px`;

            canvasCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            const renderContext = {
                canvasContext: canvasCtx,
                viewport: viewport
            };

            if (state.renderTask) {
                state.renderTask.cancel();
            }

            state.renderTask = page.render(renderContext);
            await state.renderTask.promise;
            state.renderTask = null;

            updateNavState();
            await preparePageText(page);

        } catch (error) {
            if (error && error.name !== 'RenderingCancelledException') {
                console.error('Error renderizando página:', error);
            }
        } finally {
            state.pageRendering = false;
            if (pageLoadingOverlay) pageLoadingOverlay.classList.remove('active');

            if (state.pageNumPending !== null) {
                const next = state.pageNumPending;
                state.pageNumPending = null;
                goToPage(next);
            }
        }
    }

    /**
     * Extract text of the current page and split into sentences
     */
    async function preparePageText(page) {
        const pageNum = state.currentPage;

        if (state.textCache.has(pageNum)) {
            const cached = state.textCache.get(pageNum);
            state.currentSentences = cached.sentences;
            renderTextBlocks(cached.sentences);
            return;
        }

        const textContent = await page.getTextContent();
        let rawText = '';
        let lastY = null;

        for (const item of textContent.items) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                rawText += '\n';
            }
            rawText += item.str + ' ';
            lastY = item.transform[5];
        }

        const cleaned = rawText.replace(/\s+/g, ' ').trim();
        const sentences = tokenizeSentences(cleaned);

        state.textCache.set(pageNum, { rawText: cleaned, sentences: sentences });
        state.currentSentences = sentences;
        state.currentSentenceIndex = 0;
        renderTextBlocks(sentences);
    }

    /**
     * Split text into speech-friendly natural thought units
     */
    function tokenizeSentences(text) {
        if (!text || text.trim() === '') {
            return ['Esta página no contiene texto reconocible o es una imagen.'];
        }

        // Split by natural sentence boundaries (. ! ? \n)
        const rawTokens = text.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g) || [text];
        const result = [];

        rawTokens.forEach(token => {
            const trimmed = token.trim();
            if (trimmed.length > 0) {
                // Keep sentences cohesive; only subdivide if excessively long (> 300 chars)
                if (trimmed.length > 300) {
                    const subTokens = trimmed.split(/([;:]\s+)/);
                    let buffer = '';
                    for (let i = 0; i < subTokens.length; i++) {
                        buffer += subTokens[i];
                        if (buffer.length > 150 || i === subTokens.length - 1) {
                            if (buffer.trim().length > 0) result.push(buffer.trim());
                            buffer = '';
                        }
                    }
                } else {
                    result.push(trimmed);
                }
            }
        });

        return result.length > 0 ? result : [text];
    }

    /**
     * Render sentence blocks into the live reader panel
     */
    function renderTextBlocks(sentences) {
        if (!textScrollContainer) return;
        textScrollContainer.innerHTML = '';

        if (sentences.length === 0 || (sentences.length === 1 && sentences[0].includes('no contiene texto'))) {
            textScrollContainer.innerHTML = `<div style="text-align: center; color: var(--speech-text-muted); padding: 40px 20px;">
                <i class="fas fa-file-alt" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>
                <p>No se extrajo texto legible en esta página. Puede tratarse de una imagen o documento escaneado.</p>
            </div>`;
            return;
        }

        sentences.forEach((sentence, index) => {
            const span = document.createElement('span');
            span.className = 'sentence-block';
            span.dataset.index = index;
            span.textContent = sentence + ' ';

            span.addEventListener('click', () => {
                jumpToSentence(index);
            });

            textScrollContainer.appendChild(span);
        });

        updateHighlightedSentence();
    }

    /**
     * Highlight active sentence and scroll it smoothly into view
     */
    function updateHighlightedSentence() {
        if (!textScrollContainer) return;
        const blocks = textScrollContainer.querySelectorAll('.sentence-block');
        blocks.forEach((block, idx) => {
            if (idx === state.currentSentenceIndex && state.isPlaying) {
                block.classList.add('active-sentence');
                block.classList.remove('completed-sentence');
                block.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (idx < state.currentSentenceIndex) {
                block.classList.remove('active-sentence');
                block.classList.add('completed-sentence');
            } else {
                block.classList.remove('active-sentence', 'completed-sentence');
            }
        });
    }

    /**
     * Jump to a specific sentence and play
     */
    function jumpToSentence(index) {
        state.currentSentenceIndex = Math.max(0, Math.min(index, state.currentSentences.length - 1));
        if (state.activeAudioElement) {
            state.activeAudioElement.pause();
            state.activeAudioElement = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        if (state.isPlaying) {
            speakCurrentSentence();
        } else {
            updateHighlightedSentence();
            playSpeech();
        }
    }

    /**
     * Update navigation state
     */
    function updateNavState() {
        if (pageInput) pageInput.value = state.currentPage;
        if (btnPrevPage) btnPrevPage.disabled = (state.currentPage <= 1);
        if (btnFirstPage) btnFirstPage.disabled = (state.currentPage <= 1);
        if (btnNextPage) btnNextPage.disabled = (state.currentPage >= state.totalPages);
        if (btnLastPage) btnLastPage.disabled = (state.currentPage >= state.totalPages);
    }

    /**
     * Navigate to target page
     */
    async function goToPage(targetPage, autoPlay = false) {
        if (!state.pdfDoc) return;
        const pageNum = Math.max(1, Math.min(targetPage, state.totalPages));
        if (pageNum === state.currentPage && !autoPlay) return;

        state.currentPage = pageNum;
        state.currentSentenceIndex = 0;
        state.prefetchedAudios.clear();

        if (state.pageRendering) {
            state.pageNumPending = pageNum;
            return;
        }

        await renderCurrentPage();

        if (autoPlay && state.isPlaying) {
            speakCurrentSentence();
        }
    }

    /**
     * Play Speech
     */
    function playSpeech() {
        if (!state.pdfDoc) {
            showToast('Por favor sube o abre un archivo PDF primero.', 'fa-exclamation-circle');
            return;
        }

        if (state.isPaused) {
            if (state.activeAudioElement) {
                state.activeAudioElement.play();
            } else if ('speechSynthesis' in window) {
                window.speechSynthesis.resume();
            }
            state.isPaused = false;
            state.isPlaying = true;
            setSpeakingUI(true);
            return;
        }

        state.isPlaying = true;
        state.isPaused = false;
        setSpeakingUI(true);
        speakCurrentSentence();
    }

    /**
     * Master dispatcher for speaking current sentence
     */
    async function speakCurrentSentence() {
        if (!state.isPlaying) return;

        // End of current page?
        if (state.currentSentenceIndex >= state.currentSentences.length) {
            if (state.autoAdvance && state.currentPage < state.totalPages) {
                showToast(`Avanzando automáticamente a la página ${state.currentPage + 1}...`, 'fa-forward');
                await goToPage(state.currentPage + 1, true);
                return;
            } else {
                stopSpeech();
                showToast('Lectura finalizada para este documento.', 'fa-flag-checkered');
                return;
            }
        }

        const sentenceText = state.currentSentences[state.currentSentenceIndex];
        updateHighlightedSentence();

        // Check selected provider
        if (state.ttsProvider === 'gemini') {
            await speakWithGemini(sentenceText);
        } else if (state.ttsProvider === 'openai' && state.openAiKey) {
            await speakWithOpenAI(sentenceText);
        } else {
            speakWithWebSpeech(sentenceText);
        }
    }

    /**
     * =========================================================
     * Gemini 2.0 Flash Neural Audio Engine (Ultra Fluid & Human)
     * =========================================================
     */
    async function speakWithGemini(text) {
        // If key is empty, prompt settings modal
        const apiKey = state.geminiApiKey || defaultGoogleKey;
        if (!apiKey) {
            showToast('Por favor ingresa tu clave API de Gemini en Ajustes.', 'fa-key');
            if (settingsModal) settingsModal.classList.add('active');
            speakWithWebSpeech(text);
            return;
        }

        const voiceName = state.geminiVoice || 'Aoede';
        const currentIndex = state.currentSentenceIndex;

        try {
            setSpeakingUI(true);

            // Check if audio was prefetched in memory
            let audioBlob = state.prefetchedAudios.get(currentIndex);

            if (!audioBlob) {
                audioBlob = await fetchGeminiAudioBlob(text, voiceName, apiKey);
            }

            if (!audioBlob) {
                throw new Error('No audio returned from Gemini');
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            state.activeAudioElement = audio;

            // Apply playback rate
            audio.playbackRate = state.speechRate || 1.0;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                state.activeAudioElement = null;
                if (!state.isPlaying) return;
                state.currentSentenceIndex++;
                speakCurrentSentence();
            };

            audio.onerror = (e) => {
                console.warn('Audio playback error, advancing to next sentence:', e);
                state.currentSentenceIndex++;
                speakCurrentSentence();
            };

            // Prefetch next sentence in background for continuous seamless flow!
            prefetchNextGeminiSentence(currentIndex + 1, voiceName, apiKey);

            await audio.play();

        } catch (err) {
            console.error('Gemini Audio error:', err);
            const errMsg = err.message || '';

            if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('blocked')) {
                showToast('Clave de Gemini con restricción en Google Cloud. Abriendo opciones...', 'fa-exclamation-triangle', 5000);
                if (settingsModal) settingsModal.classList.add('active');
            } else {
                showToast('Detalle de voz Gemini: ' + errMsg + '. Usando voz neural del navegador...', 'fa-info-circle');
            }

            // Fallback to fluid Web Speech engine
            state.ttsProvider = 'webspeech';
            speakWithWebSpeech(text);
        }
    }

    /**
     * Fetch Gemini audio binary from API
     */
    async function fetchGeminiAudioBlob(text, voiceName, apiKey) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

        const promptText = `Lee el siguiente texto en voz alta con una entonación humana completamente fluida, natural, expresiva y sin pausas artificiales:\n\n"${text}"`;

        const requestBody = {
            contents: [{
                role: 'user',
                parts: [{ text: promptText }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voiceName
                        }
                    }
                }
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}));
            const msg = errorJson.error ? errorJson.error.message : `HTTP ${response.status}`;
            throw new Error(msg);
        }

        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];

        if (!part || !part.inlineData || !part.inlineData.data) {
            throw new Error('Gemini no devolvió datos de audio en la respuesta.');
        }

        const base64Data = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'audio/wav';

        if (mimeType.includes('pcm')) {
            return pcmToWav(base64Data, 24000);
        } else {
            return base64ToBlob(base64Data, mimeType);
        }
    }

    /**
     * Prefetch the next sentence in background to eliminate latency between phrases
     */
    async function prefetchNextGeminiSentence(nextIndex, voiceName, apiKey) {
        if (state.isPrefetching || nextIndex >= state.currentSentences.length) return;
        if (state.prefetchedAudios.has(nextIndex)) return;

        state.isPrefetching = true;
        try {
            const nextText = state.currentSentences[nextIndex];
            const blob = await fetchGeminiAudioBlob(nextText, voiceName, apiKey);
            if (blob) {
                state.prefetchedAudios.set(nextIndex, blob);
            }
        } catch (e) {
            // Silently ignore prefetch failures; will fetch on-demand
        } finally {
            state.isPrefetching = false;
        }
    }

    /**
     * Convert raw PCM 24kHz 16-bit mono to valid WAV Blob
     */
    function pcmToWav(pcmBase64, sampleRate = 24000) {
        const binary = atob(pcmBase64);
        const len = binary.length;
        const buffer = new ArrayBuffer(44 + len);
        const view = new DataView(buffer);

        function writeStr(offset, str) {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        }

        // RIFF header
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + len, true);
        writeStr(8, 'WAVE');

        // fmt chunk
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
        view.setUint16(22, 1, true); // NumChannels (1 = Mono)
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 * 2)
        view.setUint16(32, 2, true); // BlockAlign (1 * 16/8)
        view.setUint16(34, 16, true); // BitsPerSample

        // data chunk
        writeStr(36, 'data');
        view.setUint32(40, len, true);

        // Copy audio bytes
        const uint8 = new Uint8Array(buffer, 44);
        for (let i = 0; i < len; i++) {
            uint8[i] = binary.charCodeAt(i);
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    /**
     * Convert base64 string to Blob
     */
    function base64ToBlob(base64, mimeType) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        const sliceSize = 512;

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            byteArrays.push(new Uint8Array(byteNumbers));
        }

        return new Blob(byteArrays, { type: mimeType });
    }

    /**
     * =========================================================
     * Enhanced Fluid Web Speech API Engine
     * =========================================================
     */
    function speakWithWebSpeech(sentenceText) {
        if (!('speechSynthesis' in window)) {
            showToast('Navegador sin soporte para Web Speech.', 'fa-exclamation-triangle');
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.rate = state.speechRate;

        // Pick best natural voice matching language
        const voiceVal = voiceSelect ? voiceSelect.value : '';
        let targetVoice = null;

        if (voiceVal.startsWith('native:')) {
            const name = voiceVal.replace('native:', '');
            targetVoice = state.availableVoices.find(v => v.name === name);
        } else {
            // Find preferred Spanish natural voice
            targetVoice = state.availableVoices.find(v => v.lang.startsWith('es') && /natural|neural|google|sabina|alvaro/i.test(v.name)) ||
                          state.availableVoices.find(v => v.lang.startsWith('es')) ||
                          state.availableVoices[0];
        }

        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        utterance.onstart = () => {
            setSpeakingUI(true);
        };

        utterance.onend = () => {
            if (!state.isPlaying) return;
            state.currentSentenceIndex++;
            speakCurrentSentence();
        };

        utterance.onerror = (e) => {
            if (e.error === 'canceled' || e.error === 'interrupted') return;
            console.warn('SpeechSynthesis error:', e);
            state.currentSentenceIndex++;
            speakCurrentSentence();
        };

        window.speechSynthesis.speak(utterance);
    }

    /**
     * Speak with OpenAI TTS
     */
    async function speakWithOpenAI(text) {
        try {
            setSpeakingUI(true);
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.openAiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: state.openAiVoice || 'nova',
                    speed: state.speechRate
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI error: ${response.status}`);
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            state.activeAudioElement = audio;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                state.activeAudioElement = null;
                if (!state.isPlaying) return;
                state.currentSentenceIndex++;
                speakCurrentSentence();
            };

            audio.onerror = () => {
                state.currentSentenceIndex++;
                speakCurrentSentence();
            };

            await audio.play();
        } catch (err) {
            console.error('OpenAI TTS error:', err);
            showToast('Fallo en voz OpenAI. Usando voz del sistema.', 'fa-exclamation-triangle');
            state.ttsProvider = 'webspeech';
            speakWithWebSpeech(text);
        }
    }

    /**
     * Pause Speech
     */
    function pauseSpeech() {
        if (!state.isPlaying) return;
        state.isPaused = true;
        state.isPlaying = false;
        if (state.activeAudioElement) {
            state.activeAudioElement.pause();
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.pause();
        }
        setSpeakingUI(false);
    }

    /**
     * Stop Speech
     */
    function stopSpeech() {
        state.isPlaying = false;
        state.isPaused = false;
        if (state.activeAudioElement) {
            state.activeAudioElement.pause();
            state.activeAudioElement = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setSpeakingUI(false);
        updateHighlightedSentence();
    }

    /**
     * Update Speaking UI state (waveform, buttons)
     */
    function setSpeakingUI(speaking) {
        if (playPauseIcon) {
            playPauseIcon.className = speaking ? 'fas fa-pause' : 'fas fa-play';
        }
        if (aiWaveContainer) {
            if (speaking) {
                aiWaveContainer.classList.add('speaking');
            } else {
                aiWaveContainer.classList.remove('speaking');
            }
        }
        if (aiAvatarPulse) {
            if (speaking) {
                aiAvatarPulse.classList.add('speaking');
            } else {
                aiAvatarPulse.classList.remove('speaking');
            }
        }
    }

    /**
     * Generate an interactive multi-page sample PDF
     */
    function loadSampleDocument() {
        const samplePdfContent = generateSamplePdfBinary();
        const blob = new Blob([samplePdfContent], { type: 'application/pdf' });
        const fileReader = new FileReader();
        fileReader.onload = function () {
            loadPdfDocument(this.result, 'Verba_Vitae_Muestra_Lectura.pdf');
        };
        fileReader.readAsArrayBuffer(blob);
    }

    /**
     * Binary generator for a lightweight 3-page sample PDF
     */
    function generateSamplePdfBinary() {
        const page1Text = "Bienvenido a Verba Vitae Speech AI. Esta plataforma permite leer documentos extensos pagina por pagina sin saturar la memoria. Puedes escuchar la voz leyendo en altavoz y seguir el texto sincronizado.";
        const page2Text = "Segunda pagina de lectura. La tecnologia de avance automatico cambia de pagina cuando termina la oracion final. De esta forma, puedes escuchar libros enteros con total comodidad.";
        const page3Text = "Tercera pagina del documento. Verba Vitae fomenta la lectura bilingue y el acceso a la literatura universitaria. Sube tu propio archivo PDF arriba para comenzar a disfrutar de la lectura auditiva.";

        const escapePdfText = (str) => str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
        const p1 = escapePdfText(page1Text);
        const p2 = escapePdfText(page2Text);
        const p3 = escapePdfText(page3Text);

        const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 7 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 8 0 R >>
endobj
5 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 6 0 R >> >> /Contents 9 0 R >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
7 0 obj
<< /Length 260 >>
stream
BT
/F1 22 Tf
50 720 Td
(VERBA VITAE - SPEECH AI READER) Tj
/F1 14 Tf
0 -50 Td
(Pagina 1 de 3: Introduccion) Tj
/F1 12 Tf
0 -40 Td
(${p1}) Tj
ET
endstream
endobj
8 0 obj
<< /Length 260 >>
stream
BT
/F1 22 Tf
50 720 Td
(VERBA VITAE - CAPITULO 2) Tj
/F1 14 Tf
0 -50 Td
(Pagina 2 de 3: Avance Continuo) Tj
/F1 12 Tf
0 -40 Td
(${p2}) Tj
ET
endstream
endobj
9 0 obj
<< /Length 260 >>
stream
BT
/F1 22 Tf
50 720 Td
(VERBA VITAE - CAPITULO 3) Tj
/F1 14 Tf
0 -50 Td
(Pagina 3 de 3: Conclusiones) Tj
/F1 12 Tf
0 -40 Td
(${p3}) Tj
ET
endstream
endobj
xref
0 10
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000125 00000 n 
0000000240 00000 n 
0000000355 00000 n 
0000000470 00000 n 
0000000540 00000 n 
0000000852 00000 n 
0000001164 00000 n 
trailer
<< /Size 10 /Root 1 0 R >>
startxref
1476
%%EOF`;
        return new TextEncoder().encode(pdf);
    }

    /**
     * Test Gemini Voice inside Settings modal
     */
    async function testGeminiVoice() {
        const testBtn = document.getElementById('btn-test-gemini');
        const originalHtml = testBtn ? testBtn.innerHTML : '';
        if (testBtn) {
            testBtn.disabled = true;
            testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando voz...';
        }

        const key = (geminiKeyInput && geminiKeyInput.value.trim()) || state.geminiApiKey || defaultGoogleKey;
        const voice = (geminiVoiceSelect && geminiVoiceSelect.value) || state.geminiVoice || 'Aoede';

        try {
            const sampleText = 'Hola, soy la inteligencia artificial de Gemini. Ahora tu lectura de libros es mucho más fluida, natural y humana.';
            const blob = await fetchGeminiAudioBlob(sampleText, voice, key);
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
                URL.revokeObjectURL(url);
                if (testBtn) {
                    testBtn.disabled = false;
                    testBtn.innerHTML = originalHtml;
                }
            };
            audio.play();
            showToast('¡Voz de Gemini probada con éxito!', 'fa-check');
        } catch (err) {
            console.error('Error probando Gemini:', err);
            showToast('Error con la clave de Gemini: ' + (err.message || 'Verifica la clave'), 'fa-times-circle', 6000);
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.innerHTML = originalHtml;
            }
        }
    }

    /**
     * Bind Event Listeners
     */
    function setupEventListeners() {
        // Drag and drop zone
        if (dropzone) {
            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('drag-over');
                });
            });

            dropzone.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0 && files[0].type === 'application/pdf') {
                    handleSelectedFile(files[0]);
                } else {
                    showToast('Por favor suelta un archivo PDF válido.', 'fa-exclamation-triangle');
                }
            });

            dropzone.addEventListener('click', (e) => {
                if (e.target.closest('#btn-sample-doc')) return;
                if (fileInput) fileInput.click();
            });
        }

        if (btnSelectFile && fileInput) {
            btnSelectFile.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleSelectedFile(e.target.files[0]);
                }
            });
        }

        if (btnSampleDoc) {
            btnSampleDoc.addEventListener('click', (e) => {
                e.stopPropagation();
                loadSampleDocument();
            });
        }

        if (btnNewPdf) {
            btnNewPdf.addEventListener('click', () => {
                stopSpeech();
                if (workspace) workspace.classList.remove('active');
                if (dropzone) dropzone.style.display = 'block';
                if (fileInput) fileInput.value = '';
            });
        }

        // Navigation buttons
        if (btnPrevPage) {
            btnPrevPage.addEventListener('click', () => {
                goToPage(state.currentPage - 1, state.isPlaying);
            });
        }

        if (btnNextPage) {
            btnNextPage.addEventListener('click', () => {
                goToPage(state.currentPage + 1, state.isPlaying);
            });
        }

        if (btnFirstPage) {
            btnFirstPage.addEventListener('click', () => {
                goToPage(1, state.isPlaying);
            });
        }

        if (btnLastPage) {
            btnLastPage.addEventListener('click', () => {
                goToPage(state.totalPages, state.isPlaying);
            });
        }

        if (pageInput) {
            pageInput.addEventListener('change', () => {
                const target = parseInt(pageInput.value, 10);
                if (!isNaN(target)) {
                    goToPage(target, state.isPlaying);
                }
            });
            pageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    pageInput.blur();
                }
            });
        }

        // Toggle Split View vs Single Focus View
        if (btnToggleSplit && splitViewContainer) {
            btnToggleSplit.addEventListener('click', () => {
                splitViewContainer.classList.toggle('single-view');
                const isSingle = splitViewContainer.classList.contains('single-view');
                btnToggleSplit.innerHTML = isSingle ? 
                    '<i class="fas fa-columns"></i> <span>Vista Dividida</span>' : 
                    '<i class="fas fa-desktop"></i> <span>Vista Enfocada</span>';
                renderCurrentPage();
            });
        }

        // Theme selection
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                document.body.classList.remove('theme-dark', 'theme-sepia');
                if (e.target.value === 'dark') document.body.classList.add('theme-dark');
                if (e.target.value === 'sepia') document.body.classList.add('theme-sepia');
            });
        }

        // Audio controls
        if (btnPlayPause) {
            btnPlayPause.addEventListener('click', () => {
                if (state.isPlaying) {
                    pauseSpeech();
                } else {
                    playSpeech();
                }
            });
        }

        if (btnStop) {
            btnStop.addEventListener('click', stopSpeech);
        }

        if (btnReplayPage) {
            btnReplayPage.addEventListener('click', () => {
                stopSpeech();
                state.currentSentenceIndex = 0;
                playSpeech();
            });
        }

        if (btnPrevSentence) {
            btnPrevSentence.addEventListener('click', () => {
                jumpToSentence(state.currentSentenceIndex - 1);
            });
        }

        if (btnNextSentence) {
            btnNextSentence.addEventListener('click', () => {
                jumpToSentence(state.currentSentenceIndex + 1);
            });
        }

        if (autoAdvanceToggle) {
            autoAdvanceToggle.addEventListener('change', (e) => {
                state.autoAdvance = e.target.checked;
                showToast(state.autoAdvance ? 'Avance automático activado' : 'Avance automático desactivado', 'fa-redo');
            });
        }

        // Speed buttons
        speedButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                speedButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.speechRate = parseFloat(btn.dataset.speed || '1.0');
                if (state.activeAudioElement) {
                    state.activeAudioElement.playbackRate = state.speechRate;
                } else if (state.isPlaying) {
                    window.speechSynthesis.cancel();
                    speakCurrentSentence();
                }
            });
        });

        // Voice dropdown change
        if (voiceSelect) {
            voiceSelect.addEventListener('change', () => {
                const voiceVal = voiceSelect.value;
                state.selectedVoice = voiceVal;
                updateProviderFromVoice(voiceVal);

                if (state.isPlaying) {
                    if (state.activeAudioElement) {
                        state.activeAudioElement.pause();
                        state.activeAudioElement = null;
                    }
                    if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                    }
                    speakCurrentSentence();
                }
            });
        }

        // AI Settings Modal
        if (btnAiSettings && settingsModal) {
            btnAiSettings.addEventListener('click', () => {
                if (geminiKeyInput) geminiKeyInput.value = state.geminiApiKey || defaultGoogleKey;
                if (geminiVoiceSelect) geminiVoiceSelect.value = state.geminiVoice || 'Aoede';
                if (openAiKeyInput) openAiKeyInput.value = state.openAiKey;
                if (openAiVoiceSelect) openAiVoiceSelect.value = state.openAiVoice;
                if (ttsProviderSelect) ttsProviderSelect.value = state.ttsProvider;
                settingsModal.classList.add('active');
            });
        }

        if (btnCloseModal && settingsModal) {
            btnCloseModal.addEventListener('click', () => {
                settingsModal.classList.remove('active');
            });
        }

        if (btnTestGeminiVoice) {
            btnTestGeminiVoice.addEventListener('click', testGeminiVoice);
        }

        if (btnSaveSettings && settingsModal) {
            btnSaveSettings.addEventListener('click', () => {
                if (geminiKeyInput) {
                    state.geminiApiKey = geminiKeyInput.value.trim();
                    localStorage.setItem('vv_speech_gemini_key', state.geminiApiKey);
                }
                if (geminiVoiceSelect) {
                    state.geminiVoice = geminiVoiceSelect.value;
                    localStorage.setItem('vv_speech_gemini_voice', state.geminiVoice);
                    if (voiceSelect) voiceSelect.value = 'gemini:' + state.geminiVoice;
                }
                if (openAiKeyInput) {
                    state.openAiKey = openAiKeyInput.value.trim();
                    localStorage.setItem('vv_speech_openai_key', state.openAiKey);
                }
                if (openAiVoiceSelect) {
                    state.openAiVoice = openAiVoiceSelect.value;
                    localStorage.setItem('vv_speech_openai_voice', state.openAiVoice);
                }
                if (ttsProviderSelect) {
                    state.ttsProvider = ttsProviderSelect.value;
                    if (state.ttsProvider === 'gemini' && voiceSelect) {
                        voiceSelect.value = 'gemini:' + state.geminiVoice;
                    }
                }
                settingsModal.classList.remove('active');
                showToast('Configuraciones de voz AI guardadas.', 'fa-save');
            });
        }

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                if (state.isPlaying) pauseSpeech(); else playSpeech();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                goToPage(state.currentPage + 1, state.isPlaying);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                goToPage(state.currentPage - 1, state.isPlaying);
            }
        });

        // Window resize debounced re-render
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (state.pdfDoc) renderCurrentPage();
            }, 250);
        });
    }

    /**
     * Handle user uploaded file
     */
    function handleSelectedFile(file) {
        if (!file || file.type !== 'application/pdf') {
            showToast('El archivo seleccionado no es un PDF válido.', 'fa-times-circle');
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            loadPdfDocument(this.result, file.name);
        };
        reader.readAsArrayBuffer(file);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        initVoiceList();
        setupEventListeners();
    });

})();
