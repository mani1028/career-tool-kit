import os
import fitz  # PyMuPDF
import requests
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
# --- Database Setup for Job Tracker ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///job_tracker.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class JobApplication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    company = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='Applied')
    date_applied = db.Column(db.String(50))
    job_description = db.Column(db.Text)
    generated_resume = db.Column(db.Text)
    generated_cover_letter = db.Column(db.Text)

with app.app_context():
    db.create_all()

# --- PROMPT ENGINEERING ---

def build_generate_prompt(job_description, document_text, doc_type, template_name):
    """Constructs the prompt for generating a new Resume or CV."""
    return f"""
You are an expert career consultant and typesetter, creating a professional resume that mimics the style of a classic, compact LaTeX resume. Your output MUST be clean, ATS-friendly Markdown with proper spacing.

**CRITICAL FORMATTING INSTRUCTIONS:**
1.  **Overall Layout:** The layout MUST be single-column. DO NOT use tables or complex HTML.
2.  **Name:** The full name MUST be the first line, formatted as a Markdown `<h1>`.
3.  **Contact Info:** Immediately following the name, provide the contact information in TWO separate lines, like this:
    - Line 1: `+91 8919816641 | Warangal, Telangana, IN`
    - Line 2 (with links): `[chelamalla.manikanta28@gmail.com](mailto:chelamalla.manikanta28@gmail.com) | [linkedin.com/in/mani1028](https://linkedin.com/in/mani1028) | [mani28.vercel.app](https://mani28.vercel.app)`
4.  **Sections:** Use `<h2>` for main section titles (e.g., `## PROFESSIONAL SUMMARY`). All section titles MUST be in ALL CAPS. Ensure a blank line follows every section title.
5.  **Skills Section:** For the `## SKILLS` section, you MUST use a bulleted list. Each category MUST be its own list item. For example:
    * **Languages & Libraries:** Python, Pandas, NumPy, Scikit-learn, SQL
    * **Frameworks & Tools:** Flask, FastAPI, Streamlit, Git
6.  **Entry Titles & Dates:**
    - For `EXPERIENCE` and `PROJECTS`, the title **MUST be bold** inside the `<h3>`. For example: `### **AI-Powered Nutrition Analyzer (Python, Flask, XGBoost, SQL)**` or `### **Data Specialist (Virtual Internship) at Forage (Accenture, Quantium)** *December 2024*`.
    - For `EDUCATION`, the title **MUST NOT be bold**. For example: `### Bachelor of Computer Science, Vaagdevi Engineering College *2021 - 2025*`.
    - For `EXPERIENCE` and `EDUCATION` entries, place the date at the very end of the `<h3>` title line, wrapped in italics.
    - For `PROJECTS` entries, you MUST NOT include a date.
    - Use bullet points (`-`) for descriptions under each entry.
7.  **Relevance:** Include "Certifications" and "Extra-Curricular Activities" sections ONLY IF they are relevant to the target job description. Omit them otherwise.
8.  **Final Output:** Provide ONLY the complete, rewritten {doc_type} in the specified Markdown format. Ensure proper newlines between all elements. Do not add any commentary.

---
**JOB DESCRIPTION:**
---
{job_description}
---
**CURRENT DOCUMENT TEXT (to be rewritten):**
---
{document_text}
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

def build_skill_gap_prompt(job_description, document_text):
    """Constructs the prompt for skill gap analysis."""
    return f"""
You are a career development expert. Analyze the provided job description and resume to identify skill gaps.

**Instructions:**
1.  **Identify Required Skills:** List the key skills from the job description.
2.  **Identify User's Skills:** List the skills evident in the user's resume.
3.  **Analyze the Gap:** Identify skills present in the job description but missing from the resume.
4.  **Suggest Learning Resources:** For each missing skill, suggest a free learning resource (e.g., a Coursera course, a YouTube tutorial, or a documentation page).
5.  **Output:** Provide the analysis in a clean Markdown format.

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

def build_star_coach_prompt(situation):
    """Constructs the prompt for the STAR Method Coach."""
    return f"""
You are a career coach specializing in interview preparation. A user has provided a situation from their experience. Your task is to help them structure their response using the STAR method (Situation, Task, Action, Result).

**Instructions:**
1.  **Analyze the Situation:** Understand the context provided by the user.
2.  **Guide the User:** Ask clarifying questions to help the user elaborate on the Task, Action, and Result.
3.  **Provide a Model Answer:** Based on the user's input and your guidance, construct a model answer that follows the STAR format.
4.  **Output:** Provide the guidance and model answer in a clean Markdown format.

---
**USER'S SITUATION:**
---
{situation}
---
"""

# --- API Call Logic ---
def call_gemini_api(prompt):
    """A centralized function to call the Google Gemini API."""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("Server is not configured with a Gemini API key.")

    API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    response = requests.post(API_URL, headers=headers, json=payload)
    response.raise_for_status()

    response_data = response.json()
    if not response_data.get('candidates'):
        raise ValueError('API returned no content. The prompt may have been blocked.')
    
    return response_data['candidates'][0]['content']['parts'][0]['text']

# --- Flask Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview')
def preview():
    return render_template('preview.html')

@app.route('/portfolio')
def portfolio():
    return render_template('portfolio.html')

def process_api_request(request, prompt_builder_func):
    """Generic handler for API requests to reduce code duplication."""
    try:
        data = request.form
        files = request.files
        if 'resume' not in files:
            return jsonify({'error': 'No resume file provided.'}), 400

        job_description = data.get('jobDescription')
        document_text = ""
        with fitz.open(stream=files['resume'].read(), filetype="pdf") as doc:
            document_text = "".join(page.get_text() for page in doc)

        if prompt_builder_func == build_generate_prompt:
            doc_type = data.get('docType')
            template_name = data.get('templateName')
            prompt = prompt_builder_func(job_description, document_text, doc_type, template_name)
        elif prompt_builder_func == build_template_filler_prompt:
            template_content = data.get('templateContent')
            prompt = prompt_builder_func(template_content, document_text)
        elif prompt_builder_func == build_skill_gap_prompt:
            prompt = prompt_builder_func(job_description, document_text)
        elif prompt_builder_func == build_star_coach_prompt:
            situation = data.get('situation')
            prompt = prompt_builder_func(situation)
        else:
            prompt = prompt_builder_func(job_description, document_text)
        
        generated_content = call_gemini_api(prompt)
        return jsonify({'content': generated_content})

    except Exception as e:
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

@app.route('/api/get-templates', methods=['GET'])
def get_templates():
    try:
        with open('templates.json', 'r') as f:
            templates = json.load(f)
        return jsonify(templates)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fill-template', methods=['POST'])
def fill_template():
    return process_api_request(request, build_template_filler_prompt)

@app.route('/api/skill-gap', methods=['POST'])
def skill_gap_analysis():
    return process_api_request(request, build_skill_gap_prompt)

@app.route('/api/star-coach', methods=['POST'])
def star_coach():
    return process_api_request(request, build_star_coach_prompt)

# --- Job Tracker API Routes ---
@app.route('/api/jobs', methods=['GET'])
def get_jobs():
    jobs = JobApplication.query.all()
    return jsonify([{
        'id': job.id, 'company': job.company, 'role': job.role,
        'status': job.status, 'date_applied': job.date_applied
    } for job in jobs])

@app.route('/api/jobs', methods=['POST'])
def add_job():
    data = request.json
    new_job = JobApplication(
        company=data['company'], role=data['role'], status=data.get('status', 'Applied'),
        date_applied=data.get('date_applied'), job_description=data.get('job_description'),
        generated_resume=data.get('generated_resume'), generated_cover_letter=data.get('generated_cover_letter')
    )
    db.session.add(new_job)
    db.session.commit()
    return jsonify({'id': new_job.id}), 201

@app.route('/api/jobs/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    job = db.session.get(JobApplication, job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    data = request.json
    job.company = data.get('company', job.company)
    job.role = data.get('role', job.role)
    job.status = data.get('status', job.status)
    db.session.commit()
    return jsonify({'message': 'Job updated successfully'})

@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    job = db.session.get(JobApplication, job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    db.session.delete(job)
    db.session.commit()
    return jsonify({'message': 'Job deleted successfully'})

if __name__ == '__main__':
    app.run(debug=True)

