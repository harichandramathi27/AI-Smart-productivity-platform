# ⚡ AI Smart Productivity Platform

A full-stack AI-powered productivity application built with **React** + **FastAPI**, featuring intelligent task management, priority analysis, and smart daily planning — no database required.

---

## 🗂 Project Structure

```
smart-productivity-platform/
├── frontend/
│   └── src/
│       ├── components/          # Reusable UI components
│       ├── pages/               # Dashboard, Tasks, AI, Settings
│       ├── services/
│       │   └── api.js           # Axios service layer
│       ├── hooks/               # useTasks custom hook
│       ├── utils/               # Formatters, helpers
│       └── App.jsx              # Root component (or use SmartProductivityPlatform.jsx)
└── backend/
    ├── main.py                  # FastAPI app entry point
    ├── requirements.txt
    ├── .env                     # API keys (never commit!)
    ├── routes/
    │   ├── tasks.py             # CRUD routes + in-memory store
    │   └── ai.py                # AI analysis endpoints
    └── schemas/
        └── task.py              # Pydantic models
```

---

## 🚀 Quick Start

### Backend (FastAPI)

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and add your OpenAI API key

# 4. Start the server
uvicorn main:app --reload --port 8000

# ✅ API running at: http://localhost:8000
# 📚 Swagger docs:   http://localhost:8000/docs
```

### Frontend (React + Vite)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# ✅ App running at: http://localhost:5173
```

---

## 🔑 Environment Variables

Create `backend/.env`:

```env
# Required for live AI features (optional — falls back to rule-based AI)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o

# Optional: Gemini support (future)
# GEMINI_API_KEY=AIza...
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks (supports filtering) |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/stats` | Aggregate statistics |
| GET | `/api/tasks/{id}` | Get task by ID |
| PUT | `/api/tasks/{id}` | Update task (partial) |
| DELETE | `/api/tasks/{id}` | Delete task |
| POST | `/api/ai/priorities` | AI priority analysis |
| POST | `/api/ai/daily-plan` | Generate daily schedule |
| POST | `/api/ai/suggest` | Auto-suggest priority + hours |

### Query Parameters for GET /api/tasks

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter: `pending`, `in-progress`, `completed` |
| `priority` | string | Filter: `critical`, `high`, `medium`, `low` |
| `category` | string | Filter by category name |
| `search` | string | Full-text search in title/description |
| `sort_by` | string | `createdAt` (default), `deadline`, `priority` |

---

## 🧠 AI Features

### Without API Key (Default)
- Rule-based priority scoring using deadline urgency + priority weight
- Pattern-matched task suggestions for common categories
- Deterministic daily plan generation

### With OpenAI API Key
- GPT-4o powered priority reasoning with natural language explanations
- Context-aware scheduling suggestions
- Intelligent time estimates based on task complexity

---

## 💾 Storage Strategy

| Layer | Storage | Persistence |
|-------|---------|-------------|
| Frontend | `localStorage` | Persists across browser sessions |
| Backend | Python `dict` in memory | Resets on server restart |

**To sync frontend ↔ backend:** The `services/api.js` layer handles all HTTP calls. Tasks are always sourced from localStorage in the UI and optionally synced to the FastAPI backend.

---

## 🎨 Core Features

- **Task Management** — CRUD with title, description, deadline, priority, status, category, estimated hours
- **AI Priority Assistant** — Analyzes deadlines + priority to rank your next actions
- **Smart Daily Planner** — Time-blocked schedule with focus tips
- **Productivity Dashboard** — Progress ring, category breakdown, top priority tasks
- **Smart Notifications** — Overdue alerts and deadline warnings in the UI
- **Settings Panel** — API key config, model selection, backend URL

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Axios |
| Backend | FastAPI, Pydantic v2, Uvicorn |
| AI | OpenAI GPT-4o (optional), Rule-based fallback |
| Storage | localStorage (frontend), dict (backend) |
| State | React hooks (useState, useEffect, useMemo, useCallback) |

---

## 📦 Frontend Dependencies

```json
{
  "react": "^18.0.0",
  "axios": "^1.6.0"
}
```

> **Note:** The `SmartProductivityPlatform.jsx` file is a self-contained single-file version that runs without any additional npm packages beyond React.

---

## 🔧 Customization

### Adding a Real AI Provider

In `backend/routes/ai.py`, replace `rule_based_priorities()` with your API call:

```python
# OpenAI
from openai import AsyncOpenAI
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Gemini
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
```

### Connecting Frontend to Backend

In `SmartProductivityPlatform.jsx`, replace the `AIService` object methods to call your FastAPI endpoints via `fetch()` or `axios`.

---

## 📄 License

MIT — build whatever you want with this.
