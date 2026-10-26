/**
 * Verba Vitae Dynamic Application Controller
 * Handles multi-step application submission, dynamic role questions,
 * file previews, and Firestore/localStorage integration.
 */

(function () {
    'use strict';

    let currentStep = 1;
    const totalSteps = 5;
    let selectedOpportunity = null;
    let selectedRoles = [];
    let uploadedFiles = {}; // { questionId: { name, size, rawBytes, type, base64 } }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Init on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const oppId = urlParams.get('id') || 'poetry-in-motion';
        selectedOpportunity = typeof getOpportunityById === 'function' ? getOpportunityById(oppId) : null;

        if (!selectedOpportunity) {
            alert('Opportunity not found.');
            window.location.href = 'opportunities.html';
            return;
        }

        // Initialize header info
        const oppTitleEl = document.getElementById('appOppTitle');
        if (oppTitleEl) oppTitleEl.textContent = selectedOpportunity.title;
        const oppTaglineEl = document.getElementById('appOppTagline');
        if (oppTaglineEl) oppTaglineEl.textContent = selectedOpportunity.tagline || 'Verba Vitae Creative Project';

        // Pre-fill user details if logged in
        prefillUserInfo();

        // Render Step 2 Role Cards
        renderRoleSelectionCards();

        // Setup Step 1 Button & Tracker
        updateStepTracker();
    });

    function prefillUserInfo() {
        if (typeof auth !== 'undefined' && auth) {
            auth.onAuthStateChanged(user => {
                if (user) {
                    const nameInput = document.getElementById('applicantName');
                    const emailInput = document.getElementById('applicantEmail');
                    if (nameInput && !nameInput.value && user.displayName) {
                        nameInput.value = user.displayName;
                    }
                    if (emailInput && !emailInput.value && user.email) {
                        emailInput.value = user.email;
                    }
                }
            });
        }
    }

    // --- Step 2: Role Selection Rendering ---
    function renderRoleSelectionCards() {
        const container = document.getElementById('roleSelectGrid');
        if (!container || !selectedOpportunity.roles) return;

        container.innerHTML = selectedOpportunity.roles.map(role => `
            <div class="role-select-card" id="roleCard_${escapeHtml(role.id)}" onclick="toggleRoleSelection('${escapeHtml(role.id)}')">
                <div class="role-select-check">
                    <i class="fas fa-check"></i>
                </div>
                <div class="role-select-info">
                    <h4 class="role-select-title">
                        <i class="fas ${escapeHtml(role.icon || 'fa-star')}"></i>
                        ${escapeHtml(role.title)}
                    </h4>
                    <p class="role-select-desc">${escapeHtml(role.shortDesc)}</p>
                </div>
            </div>
        `).join('');
    }

    window.toggleRoleSelection = function (roleId) {
        const card = document.getElementById(`roleCard_${roleId}`);
        const idx = selectedRoles.indexOf(roleId);
        if (idx > -1) {
            selectedRoles.splice(idx, 1);
            if (card) card.classList.remove('selected');
        } else {
            selectedRoles.push(roleId);
            if (card) card.classList.add('selected');
        }
        document.getElementById('roleSelectionError').style.display = selectedRoles.length ? 'none' : 'block';
    };

    // --- Step 3: Dynamic Role Questions Rendering ---
    function renderRoleQuestions() {
        const container = document.getElementById('dynamicRoleQuestionsContainer');
        if (!container) return;

        if (!selectedRoles.length) {
            container.innerHTML = `<p style="color: #718096; text-align: center;">Please return to Step 2 and select at least one role.</p>`;
            return;
        }

        container.innerHTML = selectedRoles.map(roleId => {
            const role = selectedOpportunity.roles.find(r => r.id === roleId);
            const questions = (selectedOpportunity.customQuestions && selectedOpportunity.customQuestions[roleId]) || [];

            if (!questions.length) return '';

            const questionsHtml = questions.map(q => renderSingleQuestionField(q, roleId)).join('');

            return `
                <div class="role-question-group" data-role="${escapeHtml(roleId)}">
                    <div class="role-group-header">
                        <span class="role-group-badge">Role Specific</span>
                        <h3 class="role-group-title"><i class="fas ${escapeHtml(role ? role.icon : 'fa-check')}"></i> ${escapeHtml(role ? role.title : roleId)} Questions</h3>
                    </div>
                    <div class="role-group-fields">
                        ${questionsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderSingleQuestionField(q, roleId) {
        const fieldName = `rq_${roleId}_${q.id}`;
        const safeLabel = escapeHtml(q.label);
        const safePlaceholder = escapeHtml(q.placeholder || '');

        if (q.type === 'textarea') {
            return `
                <div class="form-group">
                    <label for="${fieldName}">${safeLabel} ${q.required ? '<span class="required">*</span>' : ''}</label>
                    <textarea class="form-control" id="${fieldName}" name="${fieldName}" ${q.required ? 'required' : ''} placeholder="${safePlaceholder}"></textarea>
                </div>
            `;
        }

        if (q.type === 'text' || q.type === 'url') {
            return `
                <div class="form-group">
                    <label for="${fieldName}">${safeLabel} ${q.required ? '<span class="required">*</span>' : ''}</label>
                    <input type="${q.type}" class="form-control" id="${fieldName}" name="${fieldName}" ${q.required ? 'required' : ''} placeholder="${safePlaceholder}">
                </div>
            `;
        }

        if (q.type === 'select') {
            const optionsHtml = (q.options || []).map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
            return `
                <div class="form-group">
                    <label for="${fieldName}">${safeLabel} ${q.required ? '<span class="required">*</span>' : ''}</label>
                    <select class="form-control" id="${fieldName}" name="${fieldName}" ${q.required ? 'required' : ''}>
                        <option value="">-- Please select an option --</option>
                        ${optionsHtml}
                    </select>
                </div>
            `;
        }

        if (q.type === 'checkboxes') {
            const optionsHtml = (q.options || []).map((opt) => `
                <label class="checkbox-option-label">
                    <input type="checkbox" name="${fieldName}[]" value="${escapeHtml(opt)}">
                    <span>${escapeHtml(opt)}</span>
                </label>
            `).join('');
            return `
                <div class="form-group">
                    <label>${safeLabel} ${q.required ? '<span class="required">*</span>' : ''}</label>
                    <div class="checkbox-options-grid">
                        ${optionsHtml}
                    </div>
                </div>
            `;
        }

        if (q.type === 'file') {
            return `
                <div class="form-group">
                    <label>${safeLabel} ${q.required ? '<span class="required">*</span>' : ''}</label>
                    <div class="file-upload-box" onclick="document.getElementById('${fieldName}').click()">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <div class="file-upload-text">Click to choose a file from your device</div>
                        <div class="file-upload-subtext">${escapeHtml(q.accept || 'Images or videos up to 10MB')}</div>
                        <input type="file" id="${fieldName}" accept="${escapeHtml(q.accept || '*')}" style="display:none;" onchange="handleFileUpload('${fieldName}', this)">
                        <div id="preview_${fieldName}"></div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    window.handleFileUpload = function (fieldId, input) {
        const file = input.files[0];
        const previewEl = document.getElementById(`preview_${fieldId}`);
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            alert('File is too large. Please select a file under 15MB.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            uploadedFiles[fieldId] = {
                name: file.name,
                size: (file.size / 1024).toFixed(1) + ' KB',
                rawBytes: file.size,
                type: file.type,
                base64: e.target.result
            };
            if (previewEl) {
                previewEl.innerHTML = `
                    <div class="file-preview-pill">
                        <i class="fas fa-file-check" style="color: #38a169;"></i>
                        <strong>${escapeHtml(file.name)}</strong> (${(file.size / 1024).toFixed(1)} KB)
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    };

    // --- Step 5: Review Summary Generator ---
    function renderReviewSummary() {
        const container = document.getElementById('reviewSummaryContent');
        if (!container) return;

        const name = escapeHtml(document.getElementById('applicantName').value);
        const email = escapeHtml(document.getElementById('applicantEmail').value);
        const campus = escapeHtml(document.getElementById('applicantCampus').value);
        const major = escapeHtml(document.getElementById('applicantMajor').value);
        const year = escapeHtml(document.getElementById('applicantYear').value);
        const phone = escapeHtml(document.getElementById('applicantPhone').value || 'Not provided');
        const availability = escapeHtml(document.getElementById('applicantAvailability').value);

        const roleTitles = escapeHtml(selectedRoles.map(rid => {
            const r = selectedOpportunity.roles.find(item => item.id === rid);
            return r ? r.title : rid;
        }).join(', '));

        let roleAnswersHtml = '';
        selectedRoles.forEach(roleId => {
            const role = selectedOpportunity.roles.find(r => r.id === roleId);
            const questions = (selectedOpportunity.customQuestions && selectedOpportunity.customQuestions[roleId]) || [];
            
            let answersForRole = '';
            questions.forEach(q => {
                const fieldName = `rq_${roleId}_${q.id}`;
                let val = '';
                if (q.type === 'checkboxes') {
                    const checkedBoxes = Array.from(document.querySelectorAll(`input[name="${fieldName}[]"]:checked`));
                    val = checkedBoxes.map(cb => cb.value).join(', ') || 'None selected';
                } else if (q.type === 'file') {
                    val = uploadedFiles[fieldName] ? uploadedFiles[fieldName].name : 'No file uploaded';
                } else {
                    const el = document.getElementById(fieldName);
                    val = el ? el.value.trim() : '';
                }
                const safeVal = val ? escapeHtml(val) : '<em>Not provided</em>';
                answersForRole += `
                    <div style="margin-bottom: 8px;">
                        <span style="color: #718096; font-size: 0.85rem; font-weight: 600;">${escapeHtml(q.label)}</span>
                        <div style="font-weight: 700; color: #1a202c; font-size: 0.9rem; margin-top: 2px;">${safeVal}</div>
                    </div>
                `;
            });

            roleAnswersHtml += `
                <div class="review-section">
                    <div class="review-title">${escapeHtml(role ? role.title : roleId)} Responses</div>
                    ${answersForRole}
                </div>
            `;
        });

        container.innerHTML = `
            <div class="review-section">
                <div class="review-title">Applicant Profile</div>
                <div class="review-row"><span class="review-label">Full Name:</span><span class="review-value">${name}</span></div>
                <div class="review-row"><span class="review-label">MDC Email:</span><span class="review-value">${email}</span></div>
                <div class="review-row"><span class="review-label">Campus:</span><span class="review-value">${campus}</span></div>
                <div class="review-row"><span class="review-label">Major & Year:</span><span class="review-value">${major} (${year})</span></div>
                <div class="review-row"><span class="review-label">Phone:</span><span class="review-value">${phone}</span></div>
                <div class="review-row"><span class="review-label">General Availability:</span><span class="review-value">${availability}</span></div>
            </div>

            <div class="review-section">
                <div class="review-title">Opportunity & Selected Roles</div>
                <div class="review-row"><span class="review-label">Opportunity:</span><span class="review-value">${escapeHtml(selectedOpportunity.title)}</span></div>
                <div class="review-row"><span class="review-label">Roles Applied For:</span><span class="review-value" style="color: var(--app-primary);">${roleTitles}</span></div>
            </div>

            ${roleAnswersHtml}
        `;
    }

    // --- Navigation & Validation ---
    window.goToNextStep = function () {
        if (!validateStep(currentStep)) return;

        if (currentStep === 2) {
            renderRoleQuestions();
        }

        if (currentStep === 4) {
            renderReviewSummary();
        }

        if (currentStep < totalSteps) {
            currentStep++;
            showStep(currentStep);
        }
    };

    window.goToPrevStep = function () {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    };

    function showStep(step) {
        document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
        const activeSection = document.getElementById(`stepSection${step}`);
        if (activeSection) activeSection.classList.add('active');

        // Scroll smoothly to top of card
        const card = document.querySelector('.apply-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });

        updateStepTracker();
    }

    function updateStepTracker() {
        for (let i = 1; i <= totalSteps; i++) {
            const item = document.getElementById(`stepItem${i}`);
            if (!item) continue;
            item.classList.remove('active', 'completed');
            if (i === currentStep) {
                item.classList.add('active');
            } else if (i < currentStep) {
                item.classList.add('completed');
            }
        }

        const progressEl = document.getElementById('stepProgress');
        if (progressEl) {
            const percent = ((currentStep - 1) / (totalSteps - 1)) * 100;
            progressEl.style.width = `${percent}%`;
        }

        // Toggle step navigation buttons cleanly
        const btnPrev = document.getElementById('btnPrevStep');
        const btnNext = document.getElementById('btnNextStep');
        const btnSubmit = document.getElementById('btnSubmitApp');

        if (btnPrev) btnPrev.style.display = currentStep === 1 ? 'none' : 'inline-flex';
        if (btnNext) btnNext.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
        if (btnSubmit) btnSubmit.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
    }

    function validateStep(step) {
        if (step === 1) {
            const name = document.getElementById('applicantName').value.trim();
            const email = document.getElementById('applicantEmail').value.trim().toLowerCase();
            const campus = document.getElementById('applicantCampus').value;
            const major = document.getElementById('applicantMajor').value.trim();
            const year = document.getElementById('applicantYear').value;
            const availability = document.getElementById('applicantAvailability').value.trim();
            const why = document.getElementById('applicantWhy').value.trim();
            const contribute = document.getElementById('applicantContribute').value.trim();

            if (!name || !email || !campus || !major || !year || !availability || !why || !contribute) {
                alert('Please fill out all required fields in Step 1.');
                return false;
            }

            // Basic email validation
            if (!email.includes('@') || !email.includes('.')) {
                alert('Please enter a valid MDC or student email address.');
                return false;
            }

            return true;
        }

        if (step === 2) {
            if (selectedRoles.length === 0) {
                document.getElementById('roleSelectionError').style.display = 'block';
                return false;
            }
            document.getElementById('roleSelectionError').style.display = 'none';
            return true;
        }

        if (step === 3) {
            let valid = true;
            selectedRoles.forEach(roleId => {
                const questions = (selectedOpportunity.customQuestions && selectedOpportunity.customQuestions[roleId]) || [];
                questions.forEach(q => {
                    if (q.required) {
                        const fieldName = `rq_${roleId}_${q.id}`;
                        if (q.type === 'checkboxes') {
                            const checked = document.querySelectorAll(`input[name="${fieldName}[]"]:checked`).length;
                            if (!checked) {
                                alert(`Please answer the required question: "${q.label}"`);
                                valid = false;
                            }
                        } else if (q.type !== 'file') {
                            const el = document.getElementById(fieldName);
                            if (el && !el.value.trim()) {
                                alert(`Please answer the required question: "${q.label}"`);
                                el.focus();
                                valid = false;
                            }
                        }
                    }
                });
            });
            return valid;
        }

        return true;
    }

    // --- Submission Handler ---
    window.submitApplication = async function () {
        const submitBtn = document.getElementById('btnSubmitApp');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting...`;
        }

        const appId = 'app_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const name = document.getElementById('applicantName').value.trim();
        const email = document.getElementById('applicantEmail').value.trim().toLowerCase();
        const studentId = (document.getElementById('applicantStudentId').value || '').trim();
        const campus = document.getElementById('applicantCampus').value;
        const major = document.getElementById('applicantMajor').value.trim();
        const year = document.getElementById('applicantYear').value;
        const phone = (document.getElementById('applicantPhone').value || '').trim();
        const availability = document.getElementById('applicantAvailability').value.trim();
        const why = document.getElementById('applicantWhy').value.trim();
        const contribute = document.getElementById('applicantContribute').value.trim();
        const consolidatedPortfolio = (document.getElementById('consolidatedPortfolio').value || '').trim();
        const finalComments = (document.getElementById('finalComments').value || '').trim();

        const storageInst = (typeof storage !== 'undefined' && storage)
            ? storage
            : (typeof firebase !== 'undefined' && typeof firebase.storage === 'function' ? firebase.storage() : null);

        // Compile role answers (uploading files to Firebase Storage when available)
        const roleAnswers = {};
        for (const roleId of selectedRoles) {
            roleAnswers[roleId] = {};
            const questions = (selectedOpportunity.customQuestions && selectedOpportunity.customQuestions[roleId]) || [];
            for (const q of questions) {
                const fieldName = `rq_${roleId}_${q.id}`;
                if (q.type === 'checkboxes') {
                    const checkedBoxes = Array.from(document.querySelectorAll(`input[name="${fieldName}[]"]:checked`));
                    roleAnswers[roleId][q.id] = checkedBoxes.map(cb => cb.value);
                } else if (q.type === 'file') {
                    const fileObj = uploadedFiles[fieldName];
                    if (fileObj) {
                        let fileEntry = {
                            name: fileObj.name,
                            size: fileObj.size,
                            type: fileObj.type
                        };
                        if (storageInst && fileObj.base64) {
                            try {
                                const safeFileName = fileObj.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                                const snap = await storageInst.ref('applications/' + appId + '/' + safeFileName).putString(fileObj.base64, 'data_url');
                                fileEntry.fileUrl = await snap.ref.getDownloadURL();
                            } catch (uploadErr) {
                                console.warn('Firebase Storage upload fallback:', uploadErr);
                                // Only keep base64 inline if < 400KB so Firestore 1 MiB limit is never exceeded
                                if (fileObj.rawBytes && fileObj.rawBytes < 400 * 1024) {
                                    fileEntry.base64 = fileObj.base64;
                                }
                            }
                        } else if (fileObj.rawBytes && fileObj.rawBytes < 400 * 1024) {
                            fileEntry.base64 = fileObj.base64;
                        }
                        roleAnswers[roleId][q.id] = fileEntry;
                    } else {
                        roleAnswers[roleId][q.id] = null;
                    }
                } else {
                    const el = document.getElementById(fieldName);
                    roleAnswers[roleId][q.id] = el ? el.value.trim() : '';
                }
            }
        }

        const newApplication = {
            id: appId,
            opportunityId: selectedOpportunity.id,
            opportunityTitle: selectedOpportunity.title,
            applicant: {
                name,
                email,
                studentId,
                campus,
                major,
                year,
                phone,
                availability
            },
            generalAnswers: {
                why,
                contribute,
                consolidatedPortfolio,
                finalComments
            },
            selectedRoles: selectedRoles,
            roleAnswers: roleAnswers,
            status: 'Pending', // 'Pending', 'Under Review', 'Interview', 'Accepted', 'Rejected'
            adminNotes: '',
            createdAt: new Date().toISOString()
        };

        // 1. Save to LocalStorage Backup (with QuotaExceededError fallback stripping inline base64)
        try {
            const savedApps = JSON.parse(localStorage.getItem('verba_submitted_applications') || '[]');
            savedApps.unshift(newApplication);
            localStorage.setItem('verba_submitted_applications', JSON.stringify(savedApps));
        } catch (err) {
            console.warn('LocalStorage quota warning, saving lightweight copy:', err);
            try {
                const lightCopy = JSON.parse(JSON.stringify(newApplication));
                if (lightCopy.roleAnswers) {
                    Object.values(lightCopy.roleAnswers).forEach(rObj => {
                        Object.values(rObj).forEach(ans => {
                            if (ans && typeof ans === 'object' && ans.base64) {
                                delete ans.base64;
                            }
                        });
                    });
                }
                const savedApps = JSON.parse(localStorage.getItem('verba_submitted_applications') || '[]');
                savedApps.unshift(lightCopy);
                localStorage.setItem('verba_submitted_applications', JSON.stringify(savedApps));
            } catch (e2) {
                console.warn('LocalStorage unavailable:', e2);
            }
        }

        // 2. Save to Firestore (if online & connected)
        if (typeof db !== 'undefined' && db) {
            try {
                await db.collection('applications').doc(newApplication.id).set(newApplication);
                console.log('Application saved to Firestore:', newApplication.id);
            } catch (err) {
                console.warn('Firestore write warning (saved locally):', err);
            }
        }

        // 3. Render Success Screen
        document.getElementById('stepSection5').style.display = 'none';
        const actionsBar = document.querySelector('.apply-actions-bar');
        if (actionsBar) actionsBar.style.display = 'none';
        const tracker = document.getElementById('stepTracker');
        if (tracker) tracker.style.display = 'none';

        const successCard = document.getElementById('successScreenCard');
        if (successCard) {
            document.getElementById('successAppId').textContent = newApplication.id;
            document.getElementById('successAppDate').textContent = new Date().toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            successCard.style.display = 'block';
        }
    };

})();
