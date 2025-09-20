AI Career Toolkit Pro
This is a full-stack web application designed to be a comprehensive toolkit for job seekers. It leverages the power of the Google Gemini API to provide a suite of tools that help users tailor their resumes, prepare for interviews, and track their applications.

Features
📄 Document Generator: Rewrites a user's resume/CV to be perfectly tailored for a specific job description using various professional styles.

** ATS Templates:** Allows users to select a professional, ATS-friendly resume template and uses AI to intelligently populate it with their information.

📊 Resume Scorer: Analyzes a resume against a job description and provides a score out of 100 with detailed feedback.

✉️ Cover Letter Writer: Automatically generates a professional cover letter based on the user's resume and the target job.

💬 Interview Prep: Generates a list of likely interview questions (technical, behavioral, situational) based on the job and the user's background.

🔗 LinkedIn Optimizer: Writes a compelling, keyword-rich "About" section for the user's LinkedIn profile.

** C Job Application Tracker:** A full-featured tool to save and track job applications, including company, role, status, and the generated documents.

Tech Stack
Backend: Python (Flask) with SQLAlchemy for the database.

Frontend: HTML, Tailwind CSS, JavaScript.

AI: Google Gemini Pro API.

PDF Parsing: PyMuPDF.

Setup and Installation
1. Prerequisites
Python 3.7+

pip (Python package installer)

2. Clone the Repository (or download the files)
If this were a git repository, you would clone it. For now, ensure all the provided files are in a single project folder with the correct structure.

3. Folder Structure
Your project folder should look like this:

/ai-career-toolkit-pro/
|-- static/
|   |-- css/
|   |   |-- style.css
|   |   |-- preview.css
|   |-- js/
|   |   |-- script.js
|-- templates/
|   |-- index.html
|   |-- preview.html
|-- .env
|-- app.py
|-- requirements.txt
|-- templates.json
|-- job_tracker.db  <-- This will be created automatically

4. Install Dependencies
Open your terminal in the project root directory and run:

pip install -r requirements.txt

5. Set Up Environment Variables
Create a file named .env in the root of your project folder. This file is crucial for keeping your API key secret.

Add the following line to the .env file, replacing your_google_ai_studio_api_key_here with your actual key:

GEMINI_API_KEY=your_google_ai_studio_api_key_here

How to get a key: Visit Google AI Studio, sign in, and click "Get API Key".

6. Run the Application
Once the setup is complete, run the Flask application from your terminal:

python app.py

The application will start and be available at http://127.0.0.1:5000 in your web browser.