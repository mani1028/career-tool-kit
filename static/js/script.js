document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const tabs = document.querySelectorAll('.tab-btn');
    let activeTab = 'generate';
    let generatedTextContent = {}; // Store content for each tab

    const loadTabContent = (tabId) => {
        activeTab = tabId;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        
        if (tabId === 'tracker') {
            mainContent.innerHTML = getTrackerView();
            initializeJobTracker();
        } else if (tabId === 'skill-gap') {
            mainContent.innerHTML = getSkillGapView();
        } else if (tabId === 'star-coach') {
            mainContent.innerHTML = getStarCoachView();
        } else {
            mainContent.innerHTML = getGeneratorView();
            initializeGenerator();
        }
        updateFeatureOptions();
        setUiState('idle');
    };

    const getGeneratorView = () => `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
                <form id="generator-form">
                    <div id="input-fields" class="space-y-6">
                        <div>
                            <label class="block text-lg font-semibold text-gray-800 mb-2">1. Job Description</label>
                            <textarea id="job-description" name="jobDescription" rows="8" class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" placeholder="Paste the full job description here..."></textarea>
                        </div>
                        <div>
                            <label class="block text-lg font-semibold text-gray-800 mb-2">2. Upload Your Document (PDF)</label>
                            <label for="resume-upload" class="w-full flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-indigo-500 hover:bg-gray-50">
                                <div class="text-center">
                                    <i data-lucide="upload-cloud" class="mx-auto h-10 w-10 text-gray-400"></i>
                                    <p id="file-name" class="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                                </div>
                                <input type="file" id="resume-upload" name="resume" accept=".pdf" class="hidden">
                            </label>
                        </div>
                    </div>
                    <div id="feature-options" class="space-y-6"></div>
                    <button type="submit" id="main-action-btn" class="w-full btn-primary mt-4">
                        <i data-lucide="sparkles" class="h-5 w-5"></i>
                        <span id="action-btn-text"></span>
                    </button>
                </form>
            </div>
            <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm h-[85vh] flex flex-col">
                <h2 id="output-title" class="text-2xl font-bold text-gray-900 mb-4"></h2>
                <div id="output-display" class="flex-grow relative"></div>
            </div>
        </div>
    `;

    const getTrackerView = () => `
        <div class="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-bold text-gray-900">Job Application Tracker</h2>
                <button id="add-job-btn" class="btn-primary"><i data-lucide="plus-circle" class="h-5 w-5"></i> Add New Application</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left" id="jobs-table">
                    <thead>
                        <tr class="border-b">
                            <th class="p-2">Company</th><th class="p-2">Role</th>
                            <th class="p-2">Date Applied</th><th class="p-2">Status</th><th class="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

    const getSkillGapView = () => `
        <div class="card">
            <h2 class="text-2xl font-bold mb-4">Skill Gap Analysis</h2>
            <label class="font-medium">Paste Job Description</label>
            <textarea id="skill-gap-job-description" rows="5"></textarea>
            <label class="font-medium">Paste Your Resume</label>
            <textarea id="skill-gap-resume" rows="5"></textarea>
            <button id="analyze-skill-gap-btn" class="btn-primary w-full">Analyze</button>
            <div id="skill-gap-results" class="mt-4"></div>
        </div>
    `;

    const getStarCoachView = () => `
        <div class="card">
            <h2 class="text-2xl font-bold mb-4">STAR Method Coach</h2>
            <label class="font-medium">Describe a situation from your experience</label>
            <textarea id="star-situation" rows="5"></textarea>
            <button id="coach-star-btn" class="btn-primary w-full">Get STAR Feedback</button>
            <div id="star-feedback" class="mt-4"></div>
        </div>
    `;

    const updateFeatureOptions = () => {
        const featureOptionsContainer = document.getElementById('feature-options');
        if (!featureOptionsContainer) return;

        featureOptionsContainer.innerHTML = '';
        const btnText = document.getElementById('action-btn-text');
        const outputTitle = document.getElementById('output-title');

        if (activeTab === 'generate') {
            featureOptionsContainer.innerHTML = `
                <div class="input-card">
                    <label class="card-header"><i data-lucide="file-check-2" class="h-6 w-6 text-indigo-600"></i><span>3. Select Document Type</span></label>
                    <div id="doc-type-selector" class="flex space-x-4">
                        <button type="button" data-type="Resume" class="doc-type-btn active">Resume</button>
                        <button type="button" data-type="CV" class="doc-type-btn">CV</button>
                        <input type="hidden" id="doc-type-input" name="docType" value="Resume">
                    </div>
                </div>
                <div class="input-card">
                    <label class="card-header"><i data-lucide="layout-grid" class="h-6 w-6 text-indigo-600"></i><span>4. Choose a Template Style</span></label>
                    <div id="template-style-container" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <p>Loading styles...</p>
                    </div>
                    <input type="hidden" id="template-name-input" name="templateName" value="">
                </div>
            `;
            const loadGenerateStyles = async () => {
                const container = document.getElementById('template-style-container');
                const input = document.getElementById('template-name-input');
                try {
                    const response = await fetch('/api/get-templates');
                    const templates = await response.json();
                    
                    container.innerHTML = templates.map((template, index) => `
                        <div class="template-card ${index === 0 ? 'selected' : ''}" data-name="${template.name}">
                            <h3>${template.name}</h3>
                            <p>${template.description}</p>
                        </div>
                    `).join('');
                    
                    if (templates.length > 0) {
                        input.value = templates[0].name; // Set default value
                    }
                } catch (error) {
                    container.innerHTML = '<p class="text-red-500">Error loading styles.</p>';
                }
            };
            loadGenerateStyles();
        } else if (activeTab === 'templates') {
             featureOptionsContainer.innerHTML = `
                <div class="input-card">
                    <label class="card-header"><i data-lucide="layout-template" class="h-6 w-6 text-indigo-600"></i><span>3. Choose an ATS Template</span></label>
                    <div id="ats-template-gallery" class="grid grid-cols-1 sm:grid-cols-2 gap-4">Loading templates...</div>
                    <input type="hidden" id="template-content-input" name="templateContent" value="">
                </div>
            `;
            loadAtsTemplates();
        }

        if(btnText) btnText.textContent = 'Generate';
        if(outputTitle) outputTitle.textContent = 'Output';
        
        lucide.createIcons();
    };

    const setUiState = (state, message = '') => {
        const btn = document.getElementById('main-action-btn');
        const outputDisplay = document.getElementById('output-display');
        if (!btn || !outputDisplay) return;

        switch (state) {
            case 'loading':
                btn.disabled = true;
                outputDisplay.innerHTML = `<div class="state-container"><i data-lucide="loader-2" class="animate-spin h-12 w-12 text-indigo-600"></i><p class="mt-4">AI is working...</p></div>`;
                break;
            case 'error':
                btn.disabled = false;
                outputDisplay.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert"><strong class="font-bold">Error: </strong><span>${message}</span></div>`;
                break;
            case 'success':
                 btn.disabled = false;
                 generatedTextContent[activeTab] = message;
                 const htmlContent = marked.parse(message);
                 outputDisplay.innerHTML = `
                    <div class="h-full flex flex-col">
                        <div class="flex justify-end space-x-2 mb-4">
                             <button id="preview-btn" class="btn-secondary"><i data-lucide="eye" class="h-4 w-4"></i><span>Preview</span></button>
                            <button id="copy-btn" class="btn-secondary"><i data-lucide="copy" class="h-4 w-4"></i><span>Copy</span></button>
                            <button id="download-md-btn" class="btn-secondary"><i data-lucide="download" class="h-4 w-4"></i><span>.md</span></button>
                            <button id="download-docx-btn" class="btn-secondary"><i data-lucide="file-text" class="h-4 w-4"></i><span>.docx</span></button>
                            <button id="download-pdf-btn" class="btn-secondary"><i data-lucide="file" class="h-4 w-4"></i><span>.pdf</span></button>
                        </div>
                        <div class="output-content flex-grow">${htmlContent}</div>
                    </div>`;
                document.getElementById('copy-btn').addEventListener('click', handleCopy);
                document.getElementById('download-md-btn').addEventListener('click', () => handleDownload('md'));
                document.getElementById('download-docx-btn').addEventListener('click', () => handleDownload('docx'));
                document.getElementById('download-pdf-btn').addEventListener('click', () => handleDownload('pdf'));
                document.getElementById('preview-btn').addEventListener('click', handlePreview);
                break;
            case 'idle':
            default:
                btn.disabled = false;
                 outputDisplay.innerHTML = `<div class="state-container text-gray-500"><i data-lucide="file-text" class="h-16 w-16 text-gray-400"></i><p class="mt-4">Your result will appear here.</p></div>`;
        }
        lucide.createIcons();
    };

    function initializeGenerator() {
        const form = document.getElementById('generator-form');
        const resumeUploadInput = document.getElementById('resume-upload');

        if(form) form.addEventListener('submit', handleFormSubmit);
        if(resumeUploadInput) resumeUploadInput.addEventListener('change', () => {
            const fileNameDisplay = document.getElementById('file-name');
            fileNameDisplay.textContent = resumeUploadInput.files.length > 0 ? resumeUploadInput.files[0].name : 'Click to upload or drag and drop';
        });
    }
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        setUiState('loading');
        const form = document.getElementById('generator-form');
        const formData = new FormData(form);

        const endpoint = activeTab === 'templates' ? '/api/fill-template' : `/api/${activeTab}`;
        
        try {
            if (activeTab !== 'templates' && !formData.get('jobDescription').trim()) {
                throw new Error("Job Description cannot be empty.");
            }
            if (!formData.has('resume') || formData.get('resume').size === 0) {
                 throw new Error("Please upload your resume PDF.");
            }

            const response = await fetch(endpoint, { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            setUiState('success', result.content);
        } catch (error) {
            setUiState('error', error.message);
        }
    }

    const handlePreview = () => {
        sessionStorage.setItem('resumePreviewContent', generatedTextContent[activeTab]);
        window.open('/preview', '_blank');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedTextContent[activeTab]).then(() => {
            const btn = document.getElementById('copy-btn');
            if (btn) {
                btn.querySelector('span').textContent = 'Copied!';
                setTimeout(() => { if(btn) btn.querySelector('span').textContent = 'Copy'; }, 2000);
            }
        });
    };

    const handleDownload = async (format) => {
        const content = generatedTextContent[activeTab];
        if (format === 'md') {
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeTab}_result.md`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'docx') {
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: [
                        new docx.Paragraph({
                            children: [
                                new docx.TextRun(content)
                            ],
                        }),
                    ],
                }],
            });
            const blob = await docx.Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeTab}_result.docx`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
            const pdfDoc = await PDFLib.PDFDocument.create();
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
            page.drawText(content, {
                x: 50,
                y: height - 50,
                font: font,
                size: 12,
            });
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeTab}_result.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const loadAtsTemplates = async () => {
        const gallery = document.getElementById('ats-template-gallery');
        try {
            const response = await fetch('/api/get-templates');
            const templates = await response.json();
            gallery.innerHTML = '';
            templates.forEach((template, index) => {
                const card = document.createElement('div');
                card.className = `template-card ${index === 0 ? 'selected' : ''}`;
                card.dataset.content = template.content;
                card.innerHTML = `<h3>${template.name}</h3><p>${template.description}</p>`;
                gallery.appendChild(card);
            });
            document.getElementById('template-content-input').value = templates[0].content;
        } catch (error) {
            gallery.innerHTML = 'Error loading templates.';
        }
    };
    
    document.body.addEventListener('click', (e) => {
        const card = e.target.closest('.template-card');
        if (!card) return;
    
        const parentId = card.parentElement.id;
        if (parentId === 'template-style-container') {
            document.getElementById('template-name-input').value = card.dataset.name;
        } else if (parentId === 'ats-template-gallery') {
            document.getElementById('template-content-input').value = card.dataset.content;
        } else {
            return;
        }
        card.parentElement.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
    });
     document.body.addEventListener('click', (e) => {
        if (e.target.matches('.doc-type-btn')) {
             document.getElementById('doc-type-input').value = e.target.dataset.type;
             document.getElementById('doc-type-selector').querySelectorAll('.doc-type-btn').forEach(btn => btn.classList.remove('active'));
             e.target.classList.add('active');
        }
    });

    // --- Job Tracker Functions ---
    function initializeJobTracker() {
        loadJobs();
        document.getElementById('add-job-btn').addEventListener('click', () => openJobModal());
    }
    
    async function loadJobs() {
        try {
            const response = await fetch('/api/jobs');
            if (!response.ok) throw new Error('Failed to load jobs.');
            const jobs = await response.json();
            const tbody = document.querySelector('#jobs-table tbody');
            tbody.innerHTML = '';
            jobs.forEach(job => {
                const row = document.createElement('tr');
                row.className = 'border-b';
                row.innerHTML = `
                    <td class="p-2">${job.company}</td>
                    <td class="p-2">${job.role}</td>
                    <td class="p-2">${job.date_applied || 'N/A'}</td>
                    <td class="p-2"><span class="status-badge status-${job.status.toLowerCase()}">${job.status}</span></td>
                    <td class="p-2 flex space-x-2">
                        <button class="btn-icon edit-job-btn" data-id="${job.id}"><i data-lucide="edit"></i></button>
                        <button class="btn-icon delete-job-btn" data-id="${job.id}"><i data-lucide="trash-2"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
             tbody.querySelectorAll('.edit-job-btn').forEach(btn => btn.addEventListener('click', (e) => editJob(e.currentTarget.dataset.id)));
             tbody.querySelectorAll('.delete-job-btn').forEach(btn => btn.addEventListener('click', (e) => deleteJob(e.currentTarget.dataset.id)));
        } catch (error) {
            console.error(error);
            document.querySelector('#jobs-table tbody').innerHTML = '<tr><td colspan="5">Error loading applications.</td></tr>';
        }
        lucide.createIcons();
    }
    
    function openJobModal (job = null) {
        const modal = document.getElementById('job-tracker-modal');
        const backdrop = document.getElementById('modal-backdrop');
        const today = new Date().toISOString().split('T')[0];
        modal.innerHTML = `
            <h2 class="text-xl font-bold mb-4">${job ? 'Edit' : 'Add'} Job Application</h2>
            <form id="job-form">
                <input type="hidden" name="id" value="${job?.id || ''}">
                <div class="space-y-4">
                    <div><label>Company</label><input type="text" name="company" value="${job?.company || ''}" class="w-full p-2 border rounded" required></div>
                    <div><label>Role</label><input type="text" name="role" value="${job?.role || ''}" class="w-full p-2 border rounded" required></div>
                    <div><label>Date Applied</label><input type="date" name="date_applied" value="${job?.date_applied || today}" class="w-full p-2 border rounded"></div>
                    <div><label>Status</label><select name="status" class="w-full p-2 border rounded">
                        <option ${job?.status === 'Applied' ? 'selected' : ''}>Applied</option>
                        <option ${job?.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
                        <option ${job?.status === 'Offer' ? 'selected' : ''}>Offer</option>
                        <option ${job?.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select></div>
                </div>
                <div class="flex justify-end space-x-2 mt-6">
                    <button type="button" id="cancel-job-btn" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Save</button>
                </div>
            </form>
        `;
        modal.classList.remove('hidden');
        backdrop.classList.remove('hidden');

        document.getElementById('job-form').addEventListener('submit', saveJob);
        document.getElementById('cancel-job-btn').addEventListener('click', closeJobModal);
        backdrop.addEventListener('click', closeJobModal);
    };

    function closeJobModal() {
        document.getElementById('job-tracker-modal').classList.add('hidden');
        document.getElementById('modal-backdrop').classList.add('hidden');
    };

    async function saveJob(e) {
        e.preventDefault();
        const form = e.target;
        const id = form.id.value;
        const jobData = {
            company: form.company.value, role: form.role.value,
            date_applied: form.date_applied.value, status: form.status.value,
        };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/jobs/${id}` : '/api/jobs';
        
        await fetch(url, {
            method: method, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobData),
        });
        
        closeJobModal();
        loadJobs();
    }

    async function editJob(id) {
        const response = await fetch('/api/jobs');
        const jobs = await response.json();
        const job = jobs.find(j => j.id == id);
        if(job) openJobModal(job);
    };

    async function deleteJob(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
            loadJobs();
        }
    };
    
    // --- Initial Load ---
    tabs.forEach(tab => tab.addEventListener('click', () => loadTabContent(tab.dataset.tab)));
    loadTabContent('generate');
});
