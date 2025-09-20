import os
import fitz  # PyMuPDF
import requests
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- PROMPT ENGINEERING ---

def build_generate_prompt(job_description, document_text, template_content):
    """Constructs the prompt for generating a new Resume or CV by filling a template."""
    return f"""
You are an expert career consultant and resume writer. Your absolute highest priority is to rewrite the user's resume to be a concise, professional, single-page document perfectly tailored for a specific job description.

**CRITICAL, NON-NEGOTIABLE INSTRUCTIONS:**
1.  **SINGLE-PAGE CONSTRAINT:** The final resume MUST fit onto a single A4 page. This is the most important rule. To achieve this, you MUST aggressively summarize experience and project descriptions. Be ruthless in cutting down text to ensure everything fits. If the user's text is too long, shorten it. Do not let the content overflow.
2.  **Analyze User's Document:** Carefully read the `CURRENT DOCUMENT TEXT` to extract all relevant information: name, contact details, summary, experience, projects, education, skills, etc.
3.  **Tailor Content:** Rewrite the summary, experience, and project descriptions to highlight the skills and achievements most relevant to the `JOB DESCRIPTION`. Use strong action verbs and quantify results where possible.
4.  **CRITICAL EDUCATION FORMATTING:** You MUST extract and list ALL educational entries. For each entry, the degree/qualification and the institution name MUST be on the SAME LINE, separated by a comma. Do NOT add a line break between them.
    -   **CORRECT EXAMPLE:** `### Bachelor of Computer Science, Vaagdevi Engineering College *2021-2025*`
5.  **Contact Info Formatting:** Ensure the contact info is split into two separate, centered paragraphs (with a blank line between them in Markdown).
6.  **Omissions:** If the user's document lacks information for a section (e.g., "Extra-Curricular Activities"), omit that section.
7.  **Final Output:** Provide ONLY the completed, tailored resume in clean Markdown. Do not add any extra text or comments.

---
**JOB DESCRIPTION:**
---
{job_description}
---
**CURRENT DOCUMENT TEXT (to be rewritten):**
---
{document_text}
---
**RESUME TEMPLATE (use this structure):**
---
{template_content}
---
"""

def build_score_prompt(job_description, document_text):
    """Constructs the prompt for scoring a Resume or CV."""
    return f"""
You are a senior technical recruiter analyzing a candidate's resume against a job description. Your task is to provide a detailed evaluation.

**Instructions:**
1.  **Analyze Alignment:** Compare the resume against the job description, focusing on skills, experience, and keywords.
2.  **Provide a Score:** Give an overall score out of 100. The score should primarily reflect the alignment between the resume and the explicit requirements of the job description.
3.  **Give Detailed Feedback:** Structure your feedback in the following Markdown format:
    -   `### Overall Score: [Score]/100`
    -   `### Strengths` (List 2-3 key areas where the candidate is a strong match)
    -   `### Areas for Improvement` (List 2-3 specific, actionable suggestions to make the resume stronger for this specific role)
    -   `### Final Verdict` (A brief, one-sentence summary of the candidate's fit)

---
**JOB DESCRIPTION:**
---
{job_description}
---
**CANDIDATE'S RESUME TEXT:**
---
{document_text}
---
"""

def build_cover_letter_prompt(job_description, document_text):
    """Constructs the prompt for generating a cover letter."""
    return f"""
You are a professional career coach writing a concise and compelling cover letter for a client.

**Instructions:**
1.  **Use Provided Context:** Base the letter entirely on the user's resume and the target job description.
2.  **Structure:** Write a standard 3-4 paragraph cover letter.
    -   **Introduction:** State the position being applied for.
    -   **Body Paragraph(s):** Highlight 2-3 key qualifications or experiences from the user's resume that directly match the most important requirements in the job description.
    -   **Conclusion:** Reiterate interest and include a call to action.
3.  **Tone:** Maintain a professional and enthusiastic tone.
4.  **Output:** Provide only the text of the cover letter in clean Markdown. Do not add any commentary.

---
**JOB DESCRIPTION:**
---
{job_description}
---
**USER'S RESUME TEXT:**
---
{document_text}
---
"""

def build_interview_prep_prompt(job_description, document_text):
    """Constructs the prompt for generating interview questions."""
    return f"""
You are an experienced hiring manager preparing for an interview. Your task is to generate a list of likely interview questions based on a candidate's resume and the job description for the role they are applying for.

**Instructions:**
1.  **Analyze Documents:** Review the job description to understand the key requirements and the candidate's resume to understand their background.
2.  **Generate Questions:** Create a list of 8-10 questions that probe the candidate's fitness for the role.
3.  **Categorize Questions:** Structure the output in Markdown with the following categories:
    -   `### Behavioral Questions` (2-3 questions to assess soft skills and cultural fit, e.g., "Tell me about a time...")
    -   `### Technical Questions` (3-4 questions to test specific technical skills mentioned in the JD and resume, e.g., "Explain how you used Python Pandas to...")
    -   `### Situational Questions` (2-3 questions to understand how the candidate might handle job-specific scenarios, e.g., "Imagine you have to debug...")
4.  **Output:** Provide only the categorized list of questions in Markdown.

---
**JOB DESCRIPTION:**
---
{job_description}
---
**CANDIDATE'S RESUME TEXT:**
---
{document_text}
---
"""

def build_linkedin_prompt(job_description, document_text):
    """Constructs the prompt for optimizing a LinkedIn 'About' section."""
    return f"""
You are a LinkedIn branding expert and copywriter. Your task is to write a compelling, keyword-rich 'About' section for a professional's LinkedIn profile, tailored to a specific job they are targeting.

**Instructions:**
1.  **Analyze Context:** Use the provided resume to understand the professional's skills and experience, and the job description to identify target keywords.
2.  **Write the 'About' Section:** Create a 3-4 paragraph summary.
    -   **Opening:** Start with a strong headline that summarizes their professional identity (e.g., "Results-oriented Full-Stack Developer...").
    -   **Body:** Detail their key areas of expertise, incorporating keywords from the job description naturally. Highlight 2-3 major accomplishments from their resume.
    -   **Closing:** End with a statement about their career goals and what they are looking for in their next role.
3.  **Tone:** Professional, confident, and approachable.
4.  **Output:** Provide only the text for the LinkedIn 'About' section in clean Markdown.

---
**JOB DESCRIPTION:**
---
{job_description}
---
**USER'S RESUME TEXT:**
---
{document_text}
---
"""

def build_template_filler_prompt(template_content, document_text):
    """Constructs the prompt for filling a chosen ATS template."""
    return f"""
You are an expert resume writer. Your task is to populate a given resume template with information extracted from the user's provided document text.

**Instructions:**
1.  **Analyze the User's Document:** Carefully read the provided text to understand the user's skills, experience, projects, and education.
2.  **Understand the Template:** The provided template uses placeholders like `[Your Name]`, `[City, State]`, `[Phone Number]`, `[Email Address]`, `[LinkedIn Profile URL]`, `[Portfolio/Website URL]`, `[A concise, powerful summary...]`, etc.
3.  **Fill the Template:** Replace all placeholders in the template with the corresponding information from the user's document.
4.  **Be Intelligent:** If the user's document doesn't explicitly contain a piece of information (e.g., a portfolio URL), omit that line from the final output. For sections like "Experience" or "Projects," intelligently summarize the user's information to fit the template's structure.
5.  **Output:** Provide only the filled-in template in clean Markdown. Do not add any extra text, comments, or apologies.

---
**RESUME TEMPLATE TO FILL:**
---
{template_content}
---
**USER'S DOCUMENT TEXT:**
---
{document_text}
---
"""

def build_portfolio_prompt(document_text):
    """Constructs the prompt for generating a portfolio website."""
    return f"""
You are an expert frontend developer who creates beautiful, single-file portfolio websites using HTML and Tailwind CSS. Your task is to generate a complete, professional portfolio based on the provided resume text.

**CRITICAL INSTRUCTIONS:**
1.  **Single File Output:** The entire output MUST be a single HTML file. All CSS must be included using Tailwind CSS classes directly on the HTML elements.
2.  **Frameworks:**
    -   Use Tailwind CSS for all styling. Load it from the CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
    -   Use the 'Inter' Google Font.
    -   Use the `lucide-react` icon library for icons, loaded from a CDN: `<script src="https://unpkg.com/lucide@latest"></script>` followed by `<script>lucide.createIcons();</script>`.
3.  **Structure and Content:**
    -   **Parse the Resume:** Intelligently extract the user's name, title/role, professional summary, projects, skills, and contact information (email, LinkedIn, etc.) from the resume text.
    -   **Header:** Create a header with the user's name and title.
    -   **About Section:** Use the professional summary for an "About Me" section.
    -   **Projects Section:** Create cards for each major project mentioned. Each card should have the project title, a brief description, and technologies used.
    -   **Skills Section:** Create a section listing their key skills, perhaps grouped by category (e.g., Languages, Frameworks, Tools).
    -   **Contact Section:** Add a section with links for email and LinkedIn.
4.  **Aesthetics:**
    -   The design must be modern, clean, and fully responsive.
    -   Use a professional color palette (e.g., dark mode with grays, whites, and a single accent color like blue or purple).
    -   Use cards with rounded corners and subtle shadows for projects.
    -   Ensure good typography and spacing.
5.  **Final Output:** Provide ONLY the complete, runnable HTML code. Do not include any commentary, explanations, or markdown formatting like ```html.

---
**USER'S RESUME TEXT:**
---
{document_text}
---
"""


# --- API Call Logic ---
def call_gemini_api(prompt):
    """A centralized function to call the Google Gemini API."""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("Server is not configured with a Gemini API key.")

    API_URL = f"[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=){api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        response_data = response.json()
    except requests.exceptions.RequestException as e:
        # For debugging, print the full error
        print(f"API Request Error: {e}")
        # Also print response body if available
        if e.response is not None:
            print(f"API Response Body: {e.response.text}")
        raise ValueError(f"API request failed: {e}")

    if 'candidates' not in response_data or not response_data['candidates']:
        # Check for safety blocks
        if 'promptFeedback' in response_data and 'blockReason' in response_data['promptFeedback']:
            reason = response_data['promptFeedback']['blockReason']
            raise ValueError(f"Prompt was blocked by the API for safety reasons: {reason}. Please modify your input.")
        # For debugging, print the whole response
        print(f"Unexpected API Response: {response_data}")
        raise ValueError('API returned no content. The prompt may have been blocked for other reasons.')
    
    return response_data['candidates'][0]['content']['parts'][0]['text']

# --- Flask Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview')
def preview():
    return render_template('preview.html')

@app.route('/portfolio-preview')
def portfolio_preview():
    return render_template('portfolio_preview.html')

@app.route('/privacy-policy')
def privacy_policy():
    return render_template('privacy_policy.html')


def process_api_request(request, prompt_builder_func):
    """Generic handler for API requests to reduce code duplication."""
    try:
        data = request.form
        files = request.files
        
        document_text = ""
        # Some features might not require a resume
        if 'resume' in files and files['resume'].filename != '':
             with fitz.open(stream=files['resume'].read(), filetype="pdf") as doc:
                document_text = "".join(page.get_text() for page in doc)
        elif 'resumeText' in data and data['resumeText']:
            document_text = data['resumeText']

        # Build prompt based on function
        if prompt_builder_func == build_generate_prompt:
            job_description = data.get('jobDescription')
            experience_level = data.get('experienceLevel')
            
            if not job_description:
                 return jsonify({'error': 'Job Description is required for this feature.'}), 400
            if not document_text:
                 return jsonify({'error': 'A resume (uploaded or pasted) is required for this feature.'}), 400

            # Load templates to find the right one
            with open('templates.json', 'r') as f:
                templates = json.load(f)
            
            template_content = ""
            for t in templates:
                if t['name'] == experience_level:
                    template_content = t['content']
                    break
            
            if not template_content:
                return jsonify({'error': f'Template for experience level "{experience_level}" not found.'}), 404
            
            prompt = build_generate_prompt(job_description, document_text, template_content)

        elif prompt_builder_func in [build_score_prompt, build_cover_letter_prompt, build_interview_prep_prompt, build_linkedin_prompt]:
             job_description = data.get('jobDescription')
             if not job_description:
                 return jsonify({'error': 'Job Description is required for this feature.'}), 400
             if not document_text:
                 return jsonify({'error': 'A resume (uploaded or pasted) is required for this feature.'}), 400
             prompt = prompt_builder_func(job_description, document_text)

        elif prompt_builder_func == build_template_filler_prompt:
            if not document_text:
                return jsonify({'error': 'A resume is required to fill a template.'}), 400
            prompt = prompt_builder_func(data.get('templateContent'), document_text)
        
        elif prompt_builder_func == build_portfolio_prompt:
            if not document_text:
                return jsonify({'error': 'A resume is required to generate a portfolio.'}), 400
            prompt = prompt_builder_func(document_text)
        
        else:
            # This case was causing the 400 error. The prompt was not being built.
            # We should handle this more gracefully. Let's assume 'generate' if no other matches.
            return jsonify({'error': 'Invalid API function specified.'}), 400

        generated_content = call_gemini_api(prompt)
        return jsonify({'content': generated_content})

    except Exception as e:
        print(f"Error in process_api_request: {e}") # Added for better server-side logging
        return jsonify({'error': str(e)}), 500

# --- Feature API Routes ---
@app.route('/api/generate', methods=['POST'])
def generate_document():
    return process_api_request(request, build_generate_prompt)

@app.route('/api/score', methods=['POST'])
def score_document():
    return process_api_request(request, build_score_prompt)

@app.route('/api/cover-letter', methods=['POST'])
def generate_cover_letter():
    return process_api_request(request, build_cover_letter_prompt)

@app.route('/api/interview-prep', methods=['POST'])
def generate_interview_questions():
    return process_api_request(request, build_interview_prep_prompt)

@app.route('/api/linkedin', methods=['POST'])
def optimize_linkedin_profile():
    return process_api_request(request, build_linkedin_prompt)

@app.route('/api/fill-template', methods=['POST'])
def fill_template():
    return process_api_request(request, build_template_filler_prompt)
    
@app.route('/api/generate-portfolio', methods=['POST'])
def generate_portfolio():
    return process_api_request(request, build_portfolio_prompt)

@app.route('/api/get-templates', methods=['GET'])
def get_templates():
    try:
        with open('templates.json', 'r') as f:
            templates = json.load(f)
        return jsonify(templates)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

