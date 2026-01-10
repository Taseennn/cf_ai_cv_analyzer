# cf_ai_cv_analyzer
# AI-Powered ATS CV Analyzer

An intelligent Applicant Tracking System (ATS) CV analyzer built entirely on Cloudflare's edge platform. This application evaluates CVs against job descriptions, provides ATS compatibility scores, identifies missing keywords, and offers actionable improvement suggestions through an interactive chat interface.

## 🎯 Project Overview

This system demonstrates a production-ready application architecture using Cloudflare's serverless technologies:
- **Workers AI (Llama 3.1)** for intelligent CV analysis and conversational follow-ups
- **Cloudflare Workers** for API orchestration and request handling
- **Durable Objects** for stateful session management and chat history
- **Static HTML/CSS/JS Frontend** for user interaction

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │
│  (HTML/CSS/JS)  │
│  Port 8000      │
└────────┬────────┘
         │ HTTP Requests
         ↓
┌─────────────────────────────────────┐
│   Cloudflare Worker (Port 8787)     │
│  ┌───────────────────────────────┐  │
│  │  /analyze - CV Analysis       │  │
│  │  /sessions - Retrieve Results │  │
│  │  /chat - Follow-up Questions  │  │
│  └───────────────────────────────┘  │
│              ↓                       │
│     ┌────────────────┐              │
│     │  Workers AI    │              │
│     │  (Llama 3.1)   │              │
│     └────────────────┘              │
│              ↓                       │
│  ┌──────────────────────────────┐  │
│  │    Durable Objects           │  │
│  │  • Session Storage           │  │
│  │  • CV & Job Description      │  │
│  │  • Analysis Results          │  │
│  │  • Chat History              │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🧠 Memory & State Design (Durable Objects)

### Why Durable Objects?

Durable Objects provide **strong consistency** and **stateful sessions**, essential for:

1. **Persistent CV Analysis**: Store original CV, job description, and analysis results
2. **Chat Continuity**: Maintain conversation context across multiple questions
3. **Session Isolation**: Each user gets their own isolated state
4. **Real-time Updates**: Instant reads/writes without propagation delays

### What Gets Stored

Each session (identified by UUID) stores:
```json
{
  "cv": "Original CV text",
  "job_desc": "Job description text",
  "analysis": {
    "summary": "...",
    "pass": true/false,
    "atsScore": 92,
    "strengths": [...],
    "weaknesses": [...],
    "improvements": [...]
  },
  "timestamp": 1234567890,
  "chat_history": [
    {
      "question": "Why is my score low?",
      "answer": "Your score is 92/100...",
      "timestamp": 1234567890
    }
  ]
}
```

### Session Lifecycle

1. User submits CV + Job Description → New session created
2. Analysis stored in Durable Object with unique session ID
3. User can retrieve analysis anytime using session ID
4. Chat questions reference session context from Durable Object
5. All chat exchanges appended to session's chat_history

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Cloudflare account (for deployment)
- Wrangler CLI
- Python 3 (for local frontend server)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd ai-ats-cv-analyzer
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Wrangler**

Ensure `wrangler.jsonc` has Workers AI and Durable Objects bindings:
```json
{
  "name": "cvanalyzer",
  "main": "src/index.ts",
  "compatibility_date": "2025-09-27",
  "ai": {
    "binding": "AI"
  },
  "durable_objects": {
    "bindings": [
      {
        "name": "DURABLE_OBJECTS",
        "class_name": "DURABLE_OBJECTS"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["DURABLE_OBJECTS"]
    }
  ]
}
```

### Running Locally

**Terminal 1 - Start the Worker (Backend API):**
```bash
npm run dev
# or
wrangler dev

# Worker will run at http://localhost:8787
```

**Terminal 2 - Start the Frontend:**
```bash
cd frontend
python3 -m http.server 8000

# Frontend will run at http://localhost:8000
```

**Access the Application:**
Open your browser to `http://localhost:8000`

## 📡 API Endpoints

### POST `/analyze`
Analyzes a CV against a job description.

**Request:**
```json
{
  "cv": "Full CV text...",
  "job_desc": "Job description text..."
}
```

**Response:**
```json
{
  "session_id": "uuid-here",
  "summary": "Overview of candidate fit...",
  "pass": true,
  "atsScore": 92,
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "improvements": ["Improvement 1", "Improvement 2"]
}
```

### GET `/sessions?session_id=<uuid>`
Retrieves stored analysis for a session.

**Response:**
```json
{
  "cv": "...",
  "job_desc": "...",
  "analysis": { ... },
  "timestamp": 1234567890,
  "chat_history": [...]
}
```

### POST `/chat`
Ask follow-up questions about your analysis.

**Request:**
```json
{
  "session_id": "uuid-here",
  "question": "Why is my ATS score low?"
}
```

**Response:**
```json
{
  "answer": "Your ATS score of 75/100 is below the 80+ threshold..."
}
```

## 🎨 Features

### ✅ Core Features
- **ATS Score Calculation**: 0-100 score based on keyword matching, formatting, and qualification alignment
- **Detailed Analysis**: Strengths, weaknesses, and actionable improvements
- **Visual Dashboard**: Circular score meter, pass/fail badge, organized results
- **Session Persistence**: Resume analysis anytime with session ID
- **Interactive Chat**: Ask questions about your results with AI-powered responses

### 🎯 ATS Scoring Methodology
- **Keyword Match (40 points)**: Percentage of job description keywords found in CV
- **Format Optimization (20 points)**: ATS-friendly formatting assessment
- **Qualification Alignment (25 points)**: Experience level, skills, education match
- **Content Quality (15 points)**: Achievement quantification, action verbs, clarity

**Pass Threshold**: 80+ indicates strong likelihood of passing ATS

## 🛠️ Technology Stack

### Backend
- **Cloudflare Workers**: Serverless compute platform
- **Workers AI**: LLM inference (Llama 3.1 8B)
- **Durable Objects**: Stateful storage and session management
- **TypeScript**: Type-safe development

### Frontend
- **HTML5/CSS3**: Semantic markup and modern styling
- **Vanilla JavaScript**: No framework dependencies
- **Fetch API**: RESTful communication

### Infrastructure
- **Wrangler**: Cloudflare development and deployment CLI
- **Git**: Version control

## 📁 Project Structure

```
ai-ats-cv-analyzer/
├── src/
│   └── index.ts              # Worker + Durable Object logic
├── frontend/
│   ├── index.html            # UI structure
│   ├── style.css             # Dark/green theme styling
│   └── script.js             # API calls and interactions
├── wrangler.jsonc            # Cloudflare configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🚢 Deployment

### Deploy Worker
```bash
wrangler deploy
```

### Deploy Frontend (Cloudflare Pages)
```bash
wrangler pages deploy frontend
```

Update `API_URL` in `frontend/script.js` to your deployed Worker URL.

## 🔒 Security Considerations

- CORS headers configured for cross-origin requests
- No sensitive data stored (CVs are temporary, session-based)
- Session IDs are cryptographically random UUIDs
- Input validation on all endpoints

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ **LLM Integration**: Prompt engineering and response parsing
- ✅ **Stateful Serverless**: Using Durable Objects for persistent state
- ✅ **Multi-step Orchestration**: Coordinating AI, storage, and API responses
- ✅ **Full-stack Development**: Backend APIs and frontend integration
- ✅ **Edge Computing**: Cloudflare Workers at Internet scale

## 📊 Future Enhancements

- [ ] PDF/DOCX file upload support
- [ ] Export analysis as PDF report
- [ ] CV version comparison
- [ ] ATS keyword heatmap visualization
- [ ] Streaming AI responses
- [ ] Multi-language support
- [ ] Authentication for saved analyses

## 🤝 Contributing

This is a learning project built as part of a 1-day development challenge. Feedback and suggestions are welcome!

## 📄 License

MIT License - feel free to use this project for learning and reference.

## 👤 Author

**Taseen Awan**
- GitHub: [@Taseennn](https://github.com/Taseennn)
- Email: taseenawan90@gmail.com

## 🙏 Acknowledgments

- Cloudflare for the Workers AI and Durable Objects platform
- Anthropic's Claude for architectural guidance and development support

---

**Built with ☁️ Cloudflare Workers, 🤖 Workers AI, and 💾 Durable Objects**
