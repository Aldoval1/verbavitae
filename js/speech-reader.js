/**
 * Verba Vitae - Speech AI PDF Reader
 * Advanced single-page PDF streaming with text-to-speech audio reader,
 * sentence-by-sentence karaoke highlighting, and auto-page turning.
 */

(function () {
    'use strict';

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
        selectedVoice: null,
        availableVoices: [],
        viewMode: 'split', // 'split' or 'single'
        theme: 'light',
        ttsProvider: 'webspeech', // 'webspeech' | 'openai' | 'elevenlabs'
        openAiKey: localStorage.getItem('vv_speech_openai_key') || '',
        openAiVoice: localStorage.getItem('vv_speech_openai_voice') || 'nova',
        elevenLabsKey: localStorage.getItem('vv_speech_eleven_key') || '',
        activeAudioElement: null
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
    function showToast(message, icon = 'fa-info-circle') {
        if (!toastEl) return;
        toastEl.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        toastEl.classList.add('show');
        setTimeout(() => toastEl.classList.remove('show'), 3500);
    }

    /**
     * Populate Voices from Web Speech API
     */
    function initVoiceList() {
        if (!('speechSynthesis' in window)) {
            showToast('Tu navegador no soporta síntesis de voz Web Speech.', 'fa-exclamation-triangle');
            return;
        }

        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (!voices || voices.length === 0) return;
            state.availableVoices = voices;

            if (voiceSelect) {
                voiceSelect.innerHTML = '';

                // Group voices: Spanish first, then English, then others
                const spanishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
                const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
                const otherVoices = voices.filter(v => !v.lang.toLowerCase().startsWith('es') && !v.lang.toLowerCase().startsWith('en'));

                const addGroup = (label, voiceList) => {
                    if (voiceList.length === 0) return;
                    const optGroup = document.createElement('optgroup');
                    optGroup.label = label;
                    voiceList.forEach(v => {
                        const opt = document.createElement('option');
                        opt.value = v.name;
                        // Mark natural voices
                        const isNatural = /natural|neural|online|google|siri/i.test(v.name);
                        opt.textContent = `${v.name} (${v.lang})${isNatural ? ' ✨ AI' : ''}`;
                        optGroup.appendChild(opt);
                    });
                    voiceSelect.appendChild(optGroup);
                };

                addGroup('Español (Recomendado)', spanishVoices);
                addGroup('English', englishVoices);
                addGroup('Otros Idiomas', otherVoices);

                // Auto-select preferred voice
                const preferred = spanishVoices.find(v => /natural|neural|google|sabina|alvaro/i.test(v.name)) ||
                                 spanishVoices[0] ||
                                 englishVoices.find(v => /natural|neural|google|jenny|guy/i.test(v.name)) ||
                                 voices[0];

                if (preferred) {
                    voiceSelect.value = preferred.name;
                    state.selectedVoice = preferred;
                }
            }
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    /**
     * Load PDF from ArrayBuffer or URL
     */
    async function loadPdfDocument(data, docName = 'documento.pdf') {
        try {
            if (pageLoadingOverlay) pageLoadingOverlay.classList.add('active');
            stopSpeech();
            state.textCache.clear();

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

            // Hide upload, reveal reader workspace
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

            // Calculate responsive scale based on viewport width
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

            // Update navigation button states
            updateNavState();

            // Extract and prepare text for speech & synchronized reader
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

        // Clean text and split into sentences
        const cleaned = rawText.replace(/\s+/g, ' ').trim();
        const sentences = tokenizeSentences(cleaned);

        state.textCache.set(pageNum, { rawText: cleaned, sentences: sentences });
        state.currentSentences = sentences;
        state.currentSentenceIndex = 0;
        renderTextBlocks(sentences);
    }

    /**
     * Split text into speech-friendly sentence units
     */
    function tokenizeSentences(text) {
        if (!text || text.trim() === '') {
            return ['Esta página no contiene texto reconocible o es una imagen.'];
        }

        // Split by sentence terminators (. ! ? \n) keeping delimiters
        const rawTokens = text.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g) || [text];
        const result = [];

        rawTokens.forEach(token => {
            const trimmed = token.trim();
            if (trimmed.length > 0) {
                // If sentence is exceedingly long (> 300 chars), split by comma/semicolon for more natural speech breathing
                if (trimmed.length > 250) {
                    const subTokens = trimmed.split(/([,;:]\s+)/);
                    let buffer = '';
                    for (let i = 0; i < subTokens.length; i++) {
                        buffer += subTokens[i];
                        if (buffer.length > 120 || i === subTokens.length - 1) {
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

            // Clicking any sentence plays speech from that sentence
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
        if (state.isPlaying) {
            window.speechSynthesis.cancel();
            speakCurrentSentence();
        } else {
            updateHighlightedSentence();
            playSpeech();
        }
    }

    /**
     * Update navigation state (buttons, input)
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
            window.speechSynthesis.resume();
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
     * Speak current sentence using Web Speech API or external AI
     */
    async function speakCurrentSentence() {
        if (!state.isPlaying) return;

        // Check if we reached the end of current page's sentences
        if (state.currentSentenceIndex >= state.currentSentences.length) {
            if (state.autoAdvance && state.currentPage < state.totalPages) {
                // Seamlessly advance to the NEXT PAGE!
                showToast(`Avanzando automáticamente a la página ${state.currentPage + 1}...`, 'fa-forward');
                await goToPage(state.currentPage + 1, true);
                return;
            } else {
                // End of page or document
                stopSpeech();
                showToast('Lectura finalizada para esta sección.', 'fa-flag-checkered');
                return;
            }
        }

        const sentenceText = state.currentSentences[state.currentSentenceIndex];
        updateHighlightedSentence();

        // Check if OpenAI TTS provider is selected and configured
        if (state.ttsProvider === 'openai' && state.openAiKey) {
            await speakWithOpenAI(sentenceText);
            return;
        }

        // Web Speech API execution
        window.speechSynthesis.cancel(); // clear previous
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.rate = state.speechRate;

        // Apply selected voice
        const selectedVoiceName = voiceSelect ? voiceSelect.value : null;
        if (selectedVoiceName) {
            const matched = state.availableVoices.find(v => v.name === selectedVoiceName);
            if (matched) utterance.voice = matched;
        } else if (state.selectedVoice) {
            utterance.voice = state.selectedVoice;
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
            console.warn('Speech synthesis warning:', e);
            // Move to next sentence on benign error
            state.currentSentenceIndex++;
            speakCurrentSentence();
        };

        window.speechSynthesis.speak(utterance);
    }

    /**
     * Optional: Speak with OpenAI TTS
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
                    voice: state.openAiVoice,
                    speed: state.speechRate
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error (${response.status})`);
            }

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            state.activeAudioElement = audio;

            audio.onended = () => {
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
            showToast('Fallo en voz OpenAI. Usando voz Web Speech por defecto.', 'fa-exclamation-triangle');
            state.ttsProvider = 'webspeech';
            speakCurrentSentence();
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
        } else {
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
     * Generate an interactive multi-page sample PDF for instant testing
     */
    function loadSampleDocument() {
        // Built-in minimalist multi-page PDF generator (raw PDF specification)
        // Creates a real 3-page bilingual reading sample for Verba Vitae
        const samplePdfContent = generateSamplePdfBinary();
        const blob = new Blob([samplePdfContent], { type: 'application/pdf' });
        const fileReader = new FileReader();
        fileReader.onload = function () {
            loadPdfDocument(this.result, 'Verba_Vitae_Muestra_Lectura.pdf');
        };
        fileReader.readAsArrayBuffer(blob);
    }

    /**
     * Binary generator for a lightweight 3-page sample PDF without external dependencies
     */
    function generateSamplePdfBinary() {
        // Generates a valid multi-page PDF 1.4 in binary string
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
                // Trigger re-render to fit new width
                renderCurrentPage();
            });
        }

        // Theme selection (Light, Sepia, Dark)
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
                if (state.isPlaying) {
                    window.speechSynthesis.cancel();
                    speakCurrentSentence();
                }
            });
        });

        // Voice dropdown change
        if (voiceSelect) {
            voiceSelect.addEventListener('change', () => {
                const voiceName = voiceSelect.value;
                state.selectedVoice = state.availableVoices.find(v => v.name === voiceName);
                if (state.isPlaying) {
                    window.speechSynthesis.cancel();
                    speakCurrentSentence();
                }
            });
        }

        // AI Settings Modal
        if (btnAiSettings && settingsModal) {
            btnAiSettings.addEventListener('click', () => {
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

        if (btnSaveSettings && settingsModal) {
            btnSaveSettings.addEventListener('click', () => {
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
                }
                settingsModal.classList.remove('active');
                showToast('Configuraciones de voz AI guardadas.', 'fa-save');
            });
        }

        // Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            // Avoid when typing in input
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
