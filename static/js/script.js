document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const tabs = document.querySelectorAll('.tab-btn');
    let activeTab = 'generate';
    let generatedTextContent = {}; // Store content for each tab

    // --- Functions to load template styles dynamically ---
    const loadGenerateStyles = async () => {
        const container = document.getElementById('template-style-container');
        const input = document.getElementById('experience-level-input');
        if (!container || !input) return;
        try {
            const response = await fetch('/api/get-templates');
            if (!response.ok) throw new Error('Failed to fetch templates.');
            const templates = await response.json();
            
            container.innerHTML = templates.map((template, index) => `
                <button type="button" data-name="${template.name}" class="doc-type-btn ${index === 0 ? 'active' : ''}">
                    ${template.name}
                </button>
            `).join('');
            
            if (templates.length > 0) {
                input.value = templates[0].name; // Set default value
            }
        } catch (error) {
            console.error("Error loading styles:", error);
            container.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    };

    const loadAtsTemplates = async () => {
        const gallery = document.getElementById('ats-template-gallery');
        if (!gallery) return;
        try {
            const response = await fetch('/api/get-templates');
            if (!response.ok) throw new Error('Failed to fetch templates.');
            const templates = await response.json();

            gallery.innerHTML = templates.map((template, index) => {
                const card = document.createElement('div');
                card.className = `template-card ${index === 0 ? 'selected' : ''}`;
                card.dataset.content = template.content;
                card.innerHTML = `<h3>${template.name}</h3><p>${template.description}</p>`;
                return card.outerHTML;
            }).join('');
            
            if (templates.length > 0) {
                const input = document.getElementById('template-content-input');
                if(input) input.value = templates[0].content;
            }
        } catch (error) {
            console.error("Error loading ATS templates:", error);
            gallery.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    };


    // --- Tab & Content Loading ---
    const loadTabContent = (tabId) => {
        activeTab = tabId;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        
        const views = {
            'portfolio': getPortfolioView,
        };
        mainContent.innerHTML = (views[tabId] || getGeneratorView)();
        
        initializeGenerator();
        updateFeatureOptions();
        setUiState('idle');
    };

    const getGeneratorView = () => `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="glass-card space-y-6">
                <form id="generator-form">
                    <div id="input-fields" class="space-y-6"></div>
                    <div id="feature-options" class="space-y-6"></div>
                    <button type="submit" id="main-action-btn" class="w-full btn-primary mt-4">
                        <i data-lucide="sparkles" class="h-5 w-5"></i>
                        <span id="action-btn-text">Generate</span>
                    </button>
                </form>
            </div>
            <div class="glass-card h-[85vh] flex flex-col">
                <h2 id="output-title" class="text-2xl font-bold mb-4">Output</h2>
                <div id="output-display" class="flex-grow relative"></div>
            </div>
        </div>
    `;
    
    const getPortfolioView = () => `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="glass-card space-y-6">
                <form id="generator-form">
                    <div id="input-fields" class="space-y-6">
                       <h2 class="text-2xl font-bold">✨ AI Portfolio Generator</h2>
                       <p class="text-slate-600">Upload your resume, and our AI will generate a complete, professional portfolio website for you in seconds.</p>
                    </div>
                    <div id="feature-options"></div>
                    <button type="submit" id="main-action-btn" class="w-full btn-primary mt-4">
                        <i data-lucide="wand-2" class="h-5 w-5"></i>
                        <span id="action-btn-text">Generate My Portfolio</span>
                    </button>
                </form>
            </div>
            <div class="glass-card h-[85vh] flex flex-col">
                <h2 id="output-title" class="text-2xl font-bold mb-4">Generated HTML</h2>
                <div id="output-display" class="flex-grow relative"></div>
            </div>
        </div>
    `;

    const commonInputs = {
        jobDescription: `
            <div>
                <label class="block font-semibold mb-2">1. Job Description</label>
                <textarea id="job-description" name="jobDescription" rows="8" class="w-full p-3 rounded-md" placeholder="Paste the full job description here..."></textarea>
            </div>`,
        resumeUpload: `
            <div>
                <label class="block font-semibold mb-2">2. Upload Your Resume (PDF)</label>
                <label for="resume-upload" class="w-full flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-md cursor-pointer hover:border-violet-500 hover:bg-slate-200/50 transition-colors">
                    <div class="text-center text-slate-500">
                        <i data-lucide="upload-cloud" class="mx-auto h-10 w-10"></i>
                        <p id="file-name" class="mt-2 text-sm">Click to upload or drag and drop</p>
                    </div>
                    <input type="file" id="resume-upload" name="resume" accept=".pdf" class="hidden">
                </label>
            </div>`
    };

    const updateFeatureOptions = () => {
        const inputContainer = document.getElementById('input-fields');
        const featureOptionsContainer = document.getElementById('feature-options');
        if (!inputContainer || !featureOptionsContainer) return;

        inputContainer.innerHTML = '';
        featureOptionsContainer.innerHTML = '';
        
        switch(activeTab) {
            case 'generate':
            case 'score':
            case 'cover-letter':
            case 'interview-prep':
            case 'linkedin':
                inputContainer.innerHTML = commonInputs.jobDescription + commonInputs.resumeUpload;
                break;
            case 'templates':
                inputContainer.innerHTML = commonInputs.resumeUpload;
                break;
            case 'portfolio':
                featureOptionsContainer.innerHTML = commonInputs.resumeUpload;
                break;
        }

        if (activeTab === 'generate') {
            featureOptionsContainer.innerHTML += `
                <div>
                    <label class="block font-semibold mb-2">3. Select Document Type</label>
                    <div id="doc-type-selector" class="flex flex-wrap gap-2">
                        <button type="button" data-type="Resume" class="doc-type-btn active">Resume</button>
                        <button type="button" data-type="CV" class="doc-type-btn">CV</button>
                        <input type="hidden" id="doc-type-input" name="docType" value="Resume">
                    </div>
                </div>
                <div>
                    <label class="block font-semibold mb-2 mt-4">4. Select Experience Level</label>
                    <div id="template-style-container" class="flex flex-wrap gap-2"><p>Loading styles...</p></div>
                    <input type="hidden" id="experience-level-input" name="experienceLevel" value="">
                </div>`;
            loadGenerateStyles();
        } else if (activeTab === 'templates') {
             featureOptionsContainer.innerHTML += `
                <div>
                    <label class="block font-semibold mb-2">Choose an ATS Template</label>
                    <div id="ats-template-gallery" class="grid grid-cols-1 sm:grid-cols-2 gap-4">Loading templates...</div>
                    <input type="hidden" id="template-content-input" name="templateContent" value="">
                </div>`;
            loadAtsTemplates();
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    const setUiState = (state, message = '') => {
        const btn = document.getElementById('main-action-btn');
        const outputDisplay = document.getElementById('output-display');
        if (!outputDisplay) return;

        if (btn) btn.disabled = state === 'loading';

        switch (state) {
            case 'loading':
                outputDisplay.innerHTML = `<div class="flex items-center justify-center h-full"><div class="text-center"><i data-lucide="loader-2" class="animate-spin h-12 w-12 text-violet-500 mx-auto"></i><p class="mt-4 text-slate-500">AI is working its magic...</p></div></div>`;
                break;
            case 'error':
                outputDisplay.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 p-4 rounded-md" role="alert"><strong class="font-bold">Error: </strong><span>${message}</span></div>`;
                break;
            case 'success':
                 generatedTextContent[activeTab] = message;
                 const isHtml = /<[a-z][\s\S]*>/i.test(message) && activeTab === 'portfolio';
                 const outputContent = isHtml ? `<pre class="whitespace-pre-wrap text-sm p-4 bg-slate-100 rounded-lg"><code>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>` : marked.parse(message);

                 let buttons = `<button id="copy-btn" class="btn-secondary"><i data-lucide="copy" class="h-4 w-4"></i><span>Copy</span></button>`;
                
                if (activeTab === 'portfolio') {
                    buttons += `<button id="preview-portfolio-btn" class="btn-secondary"><i data-lucide="eye" class="h-4 w-4"></i><span>Preview</span></button>`;
                } else if (!isHtml) {
                    buttons += `<button id="preview-btn" class="btn-secondary"><i data-lucide="eye" class="h-4 w-4"></i><span>Preview</span></button>`;
                }

                 outputDisplay.innerHTML = `
                    <div class="h-full flex flex-col">
                        <div class="flex justify-end space-x-2 mb-4">
                            ${buttons}
                        </div>
                        <div class="output-content flex-grow">${outputContent}</div>
                    </div>`;
                
                document.getElementById('copy-btn').addEventListener('click', handleCopy);

                if (document.getElementById('preview-btn')) document.getElementById('preview-btn').addEventListener('click', handlePreview);
                if (document.getElementById('preview-portfolio-btn')) document.getElementById('preview-portfolio-btn').addEventListener('click', handlePortfolioPreview);
                break;
            case 'idle':
            default:
                 outputDisplay.innerHTML = `<div class="flex items-center justify-center h-full text-slate-500"><div class="text-center"><i data-lucide="file-text" class="h-16 w-16 mx-auto"></i><p class="mt-4">Your result will appear here.</p></div></div>`;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    // --- Event Handlers & Initializers ---
    function initializeGenerator() {
        const form = document.getElementById('generator-form');
        if(form) form.addEventListener('submit', handleFormSubmit);
        
        document.body.addEventListener('change', (e) => {
            if (e.target.matches('#resume-upload')) {
                const fileNameDisplay = document.getElementById('file-name');
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = e.target.files.length > 0 ? e.target.files[0].name : 'Click to upload or drag and drop';
                }
            }
        });
    }
    
    async function handleFormSubmit(e) {
        e.preventDefault();
        setUiState('loading');
        const form = document.getElementById('generator-form');
        const formData = new FormData(form);

        const endpointMap = {
            'generate': '/api/generate',
            'templates': '/api/fill-template',
            'score': '/api/score',
            'cover-letter': '/api/cover-letter',
            'interview-prep': '/api/interview-prep',
            'linkedin': '/api/linkedin',
            'portfolio': '/api/generate-portfolio'
        };
        const endpoint = endpointMap[activeTab];
        
        try {
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

    const handlePortfolioPreview = () => {
        sessionStorage.setItem('portfolioHtmlContent', generatedTextContent[activeTab]);
        window.open('/portfolio-preview', '_blank');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedTextContent[activeTab]).then(() => {
            const btn = document.getElementById('copy-btn');
            if (btn) {
                const span = btn.querySelector('span');
                if (span) {
                    span.textContent = 'Copied!';
                    setTimeout(() => { 
                        if (span) span.textContent = 'Copy'; 
                    }, 2000);
                }
            }
        });
    };
    
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.template-card');
        const docTypeBtn = target.closest('.doc-type-btn');

        if (card) {
            const parentId = card.parentElement.id;
            if (parentId === 'ats-template-gallery') {
                const input = document.getElementById('template-content-input');
                if (input) input.value = card.dataset.content;
                card.parentElement.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            }
        } else if (docTypeBtn) {
            const parentContainer = docTypeBtn.parentElement;
            if (!parentContainer) return;

            if (parentContainer.id === 'doc-type-selector') {
                const input = document.getElementById('doc-type-input');
                if (input) input.value = docTypeBtn.dataset.type;
            } else if (parentContainer.id === 'template-style-container') {
                const input = document.getElementById('experience-level-input');
                if (input) input.value = docTypeBtn.dataset.name;
            }
            
            parentContainer.querySelectorAll('.doc-type-btn').forEach(btn => btn.classList.remove('active'));
            docTypeBtn.classList.add('active');
        }
    });
    
    // --- Initial Load ---
    tabs.forEach(tab => tab.addEventListener('click', () => loadTabContent(tab.dataset.tab)));
    loadTabContent('generate');
});

