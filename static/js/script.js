document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const tabs = document.querySelectorAll('.tab-btn');
    
    // --- Shared State to Prevent Losing Work ---
    let sharedState = {
        jobDescription: '',
        resumeFile: null,
        resumeFileName: 'Click to upload or drag and drop',
        generatedContent: {} // Store generated content for each tab
    };

    const loadTabContent = (tabId) => {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        
        // --- Preserve the output container if it exists, otherwise create it ---
        let outputContainer = document.getElementById('output-container');
        if (tabId === 'portfolio') {
             mainContent.innerHTML = getPortfolioGeneratorView();
        } else {
            mainContent.innerHTML = getGeneratorView(tabId);
            if (!outputContainer) {
                mainContent.querySelector('.grid').insertAdjacentHTML('beforeend', '<div id="output-container" class="glass-card h-[85vh] flex flex-col"></div>');
                outputContainer = document.getElementById('output-container');
            } else {
                 mainContent.querySelector('.grid').appendChild(outputContainer);
            }
        }
        
        initializeActiveTab(tabId, outputContainer);
    };

    const getGeneratorView = (tabId) => `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="glass-card">
                <form id="generator-form" class="space-y-6">
                    <div>
                        <label class="block text-lg font-semibold text-slate-800 mb-2">1. Job Description</label>
                        <textarea id="job-description" name="jobDescription" rows="8" class="w-full" placeholder="Paste the full job description here...">${sharedState.jobDescription}</textarea>
                    </div>
                    <div>
                        <label class="block text-lg font-semibold text-slate-800 mb-2">2. Upload Your Resume (PDF)</label>
                        <label for="resume-upload" class="w-full flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-md cursor-pointer hover:border-violet-500 hover:bg-slate-50">
                            <div class="text-center">
                                <i data-lucide="upload-cloud" class="mx-auto h-10 w-10 text-slate-400"></i>
                                <p id="file-name" class="mt-2 text-sm text-slate-600">${sharedState.resumeFileName}</p>
                            </div>
                            <input type="file" id="resume-upload" name="resume" accept=".pdf" class="hidden">
                        </label>
                    </div>
                    <div id="feature-options" class="space-y-4"></div>
                    <button type="submit" id="main-action-btn" class="w-full btn-primary mt-4">
                        <i data-lucide="sparkles" class="h-5 w-5"></i>
                        <span id="action-btn-text">Generate</span>
                    </button>
                </form>
            </div>
        </div>
    `;
    
    const getPortfolioGeneratorView = () => `
        <div class="glass-card text-center">
            <h2 class="text-2xl font-bold mb-2">Create a Professional Portfolio Website</h2>
            <p class="mb-6 text-slate-600">Upload your resume, and our AI will instantly generate a beautiful, single-page portfolio website for you.</p>
            <form id="portfolio-form">
                 <div>
                    <label for="portfolio-resume-upload" class="w-full max-w-md mx-auto flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-md cursor-pointer hover:border-violet-500 hover:bg-slate-50">
                        <div class="text-center">
                            <i data-lucide="upload-cloud" class="mx-auto h-10 w-10 text-slate-400"></i>
                            <p id="portfolio-file-name" class="mt-2 text-sm text-slate-600">${sharedState.resumeFileName}</p>
                        </div>
                        <input type="file" id="portfolio-resume-upload" name="resume" accept=".pdf" class="hidden">
                    </label>
                </div>
                <button type="submit" id="generate-portfolio-btn" class="btn-primary mt-6">
                    <i data-lucide="layout-dashboard" class="h-5 w-5"></i>
                    <span>Generate My Portfolio</span>
                </button>
            </form>
        </div>
    `;

    const initializeActiveTab = (tabId, outputContainer) => {
        updateFeatureOptions(tabId);

        // --- Restore or set initial state for the output display ---
        if (outputContainer) {
            if (sharedState.generatedContent[tabId]) {
                setUiState('success', tabId, sharedState.generatedContent[tabId]);
            } else {
                setUiState('idle', tabId, 'Your result will appear here.');
            }
        }
        
        // --- Attach event listeners to preserve input state ---
        const jobDescTextarea = document.getElementById('job-description');
        if (jobDescTextarea) {
            jobDescTextarea.addEventListener('input', (e) => {
                sharedState.jobDescription = e.target.value;
            });
        }
        
        const resumeUploadInput = document.getElementById('resume-upload');
        if (resumeUploadInput) {
            resumeUploadInput.addEventListener('change', handleFileSelect);
        }
        
        const portfolioResumeUpload = document.getElementById('portfolio-resume-upload');
        if(portfolioResumeUpload) {
            portfolioResumeUpload.addEventListener('change', handleFileSelect);
        }

        const generatorForm = document.getElementById('generator-form');
        if (generatorForm) {
            generatorForm.addEventListener('submit', (e) => handleFormSubmit(e, tabId));
        }
        
        const portfolioForm = document.getElementById('portfolio-form');
        if (portfolioForm) {
            portfolioForm.addEventListener('submit', (e) => handleFormSubmit(e, 'generate-portfolio'));
        }
    };
    
    const handleFileSelect = (e) => {
        const fileInput = e.target;
        if (fileInput.files.length > 0) {
            sharedState.resumeFile = fileInput.files[0];
            sharedState.resumeFileName = sharedState.resumeFile.name;
        } else {
            sharedState.resumeFile = null;
            sharedState.resumeFileName = 'Click to upload or drag and drop';
        }
        // Update file name display on all relevant inputs
        const fileNameDisplays = document.querySelectorAll('#file-name, #portfolio-file-name');
        fileNameDisplays.forEach(el => el.textContent = sharedState.resumeFileName);
    };

    const updateFeatureOptions = (tabId) => {
        const featureOptionsContainer = document.getElementById('feature-options');
        if (!featureOptionsContainer) return;

        featureOptionsContainer.innerHTML = '';
        const btnText = document.getElementById('action-btn-text');
        
        const tabInfo = {
            'generate': { btn: 'Generate Document', options: getGenerateOptionsHTML },
            'score': { btn: 'Score My Resume' },
            'cover-letter': { btn: 'Write Cover Letter' },
            'interview-prep': { btn: 'Get Interview Questions' },
            'linkedin': { btn: 'Optimize LinkedIn Profile' },
            'templates': { btn: 'Fill Selected Template', options: getTemplateOptionsHTML },
        };

        if (tabInfo[tabId]) {
            if (btnText) btnText.textContent = tabInfo[tabId].btn;
            if (tabInfo[tabId].options) {
                featureOptionsContainer.innerHTML = tabInfo[tabId].options();
                if (tabId === 'generate') loadExperienceLevels();
                if (tabId === 'templates') loadAtsTemplates();
            }
        }
        lucide.createIcons();
    };
    
    const getGenerateOptionsHTML = () => `
        <div>
            <label class="block text-md font-semibold text-slate-700 mb-2">3. Select Experience Level</label>
            <div id="experience-level-container" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                 <p class="text-sm text-slate-500 col-span-full">Loading styles...</p>
            </div>
            <input type="hidden" id="experience-level-input" name="experienceLevel" value="">
        </div>
    `;

    const getTemplateOptionsHTML = () => `
         <div>
            <label class="block text-md font-semibold text-slate-700 mb-2">3. Choose an ATS Template</label>
            <div id="ats-template-gallery" class="grid grid-cols-1 sm:grid-cols-2 gap-4 h-48 overflow-y-auto p-2 bg-slate-50 rounded-md">
                <p class="text-sm text-slate-500">Loading templates...</p>
            </div>
            <input type="hidden" id="template-content-input" name="templateContent" value="">
        </div>
    `;

    const loadExperienceLevels = async () => {
        const container = document.getElementById('experience-level-container');
        const input = document.getElementById('experience-level-input');
        try {
            const response = await fetch('/api/get-templates');
            if (!response.ok) throw new Error('Failed to fetch templates');
            const templates = await response.json();
            
            container.innerHTML = templates.map((template, index) => `
                <button type="button" class="template-card text-left ${index === 0 ? 'selected' : ''}" data-name="${template.name}">
                    <h3 class="font-semibold text-sm text-slate-800">${template.name}</h3>
                    <p class="text-xs text-slate-500">${template.description}</p>
                </button>
            `).join('');
            
            if (templates.length > 0) {
                input.value = templates[0].name; // Set default
            }
        } catch (error) {
            container.innerHTML = `<p class="text-red-500 text-sm col-span-full">Error: ${error.message}</p>`;
        }
    };

    const loadAtsTemplates = async () => {
        const gallery = document.getElementById('ats-template-gallery');
        const input = document.getElementById('template-content-input');
        try {
            const response = await fetch('/api/get-templates');
            const templates = await response.json();
            gallery.innerHTML = templates.map((template, index) => `
                <div class="template-card text-left ${index === 0 ? 'selected' : ''}" data-name="${template.name}" data-content="${escape(template.content)}">
                    <h3 class="font-semibold text-sm text-slate-800">${template.name}</h3>
                    <p class="text-xs text-slate-500">${template.description}</p>
                </div>
            `).join('');
            if (templates.length > 0) {
                input.value = templates[0].content;
            }
        } catch (error) {
            gallery.innerHTML = `<p class="text-red-500 text-sm">Error loading templates.</p>`;
        }
    };

    const setUiState = (state, tabId, message = '') => {
        const btn = document.getElementById('main-action-btn') || document.getElementById('generate-portfolio-btn');
        const outputDisplay = document.getElementById('output-container');
        if (!outputDisplay && tabId !== 'portfolio') return;

        let contentHTML = '';
        switch (state) {
            case 'loading':
                if(btn) btn.disabled = true;
                contentHTML = `<div class="flex flex-col items-center justify-center h-full text-center text-slate-500">
                                   <i data-lucide="loader-2" class="animate-spin h-12 w-12 text-violet-600"></i>
                                   <p class="mt-4 font-semibold">AI is working its magic...</p>
                                   <p class="text-sm mt-1">This can take up to 30 seconds.</p>
                               </div>`;
                break;
            case 'error':
                 if(btn) btn.disabled = false;
                contentHTML = `<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                                   <p class="font-bold">An Error Occurred</p>
                                   <p>${message}</p>
                               </div>`;
                break;
            case 'success':
                if(btn) btn.disabled = false;
                sharedState.generatedContent[tabId] = message;
                const htmlContent = marked.parse(message);
                contentHTML = `
                    <div class="h-full flex flex-col">
                        <div class="flex justify-between items-center pb-2 border-b mb-2">
                             <h2 class="text-xl font-bold text-slate-800 capitalize">${tabId.replace('-', ' ')} Result</h2>
                             <div class="flex space-x-2">
                                <button data-action="preview" class="btn-secondary !p-2 h-9 w-9"><i data-lucide="eye" class="h-4 w-4"></i></button>
                                <button data-action="copy" class="btn-secondary !p-2 h-9 w-9"><i data-lucide="copy" class="h-4 w-4"></i></button>
                             </div>
                        </div>
                        <div class="output-content flex-grow overflow-y-auto">${htmlContent}</div>
                    </div>`;
                break;
            case 'idle':
            default:
                if(btn) btn.disabled = false;
                contentHTML = `<div class="flex flex-col items-center justify-center h-full text-center text-slate-400">
                                   <i data-lucide="file-text" class="h-16 w-16 mb-4"></i>
                                   <p class="font-semibold text-slate-500">Your result will appear here.</p>
                                   <p class="text-sm mt-1">Fill in the details and click generate.</p>
                               </div>`;
        }
        
        if (outputDisplay) {
            outputDisplay.innerHTML = contentHTML;
             // Add event listeners for new buttons
            outputDisplay.querySelector('[data-action="preview"]')?.addEventListener('click', () => handlePreview(tabId));
            outputDisplay.querySelector('[data-action="copy"]')?.addEventListener('click', (e) => handleCopy(e, tabId));
        }
        lucide.createIcons();
    };
    
    async function handleFormSubmit(e, tabId) {
        e.preventDefault();
        setUiState('loading', tabId);

        const formData = new FormData();
        // Append shared state data
        formData.append('jobDescription', sharedState.jobDescription);
        if (sharedState.resumeFile) {
            formData.append('resume', sharedState.resumeFile);
        }

        // Append form-specific data
        const form = e.target;
        if(form.id === 'generator-form') {
            const experienceLevel = form.querySelector('#experience-level-input')?.value;
            if(experienceLevel) formData.append('experienceLevel', experienceLevel);
        }
        if (form.id === 'portfolio-form' && !sharedState.resumeFile) {
            setUiState('error', 'portfolio', 'Please upload a resume to generate a portfolio.');
            return;
        }
        
        const endpoint = `/api/${tabId}`;
        
        try {
            if (tabId !== 'generate-portfolio' && !sharedState.jobDescription.trim()) {
                throw new Error("Job Description cannot be empty.");
            }
            if (!sharedState.resumeFile) {
                 throw new Error("Please upload your resume PDF.");
            }

            const response = await fetch(endpoint, { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'An unknown error occurred.');
            
            if (tabId === 'generate-portfolio') {
                sessionStorage.setItem('portfolioHTML', result.content);
                window.open('/portfolio-preview', '_blank');
                // Don't change the main UI state for portfolio
            } else {
                setUiState('success', tabId, result.content);
            }
        } catch (error) {
            setUiState('error', tabId, error.message);
        }
    }

    const handlePreview = (tabId) => {
        const content = sharedState.generatedContent[tabId];
        if(content) {
            sessionStorage.setItem('resumePreviewContent', content);
            window.open('/preview', '_blank');
        }
    };

    const handleCopy = (e, tabId) => {
        const content = sharedState.generatedContent[tabId];
        if(content) {
            navigator.clipboard.writeText(content).then(() => {
                const btn = e.currentTarget;
                const originalIcon = btn.innerHTML;
                btn.innerHTML = `<i data-lucide="check" class="h-4 w-4 text-green-500"></i>`;
                lucide.createIcons();
                setTimeout(() => { btn.innerHTML = originalIcon; lucide.createIcons(); }, 2000);
            });
        }
    };
    
    // --- Dynamic Event Delegation for Template Selection ---
    document.body.addEventListener('click', (e) => {
        const card = e.target.closest('.template-card');
        if (!card) return;
    
        const parentContainer = card.parentElement;
        parentContainer.querySelectorAll('.template-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (parentContainer.id === 'experience-level-container') {
            document.getElementById('experience-level-input').value = card.dataset.name;
        } else if (parentContainer.id === 'ats-template-gallery') {
            document.getElementById('template-content-input').value = unescape(card.dataset.content);
        }
    });

    // --- Initial Load ---
    tabs.forEach(tab => tab.addEventListener('click', () => loadTabContent(tab.dataset.tab)));
    loadTabContent('generate');
});

