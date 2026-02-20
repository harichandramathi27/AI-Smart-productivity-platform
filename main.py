"""
AI Smart Productivity Platform - FastAPI Backend
================================================
Install:  pip install fastapi uvicorn openai pydantic python-dotenv
Run:      uvicorn main:app --reload --port 8000
Docs:     http://localhost:8000/docs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routes.tasks import router as tasks_router, task_store
from routes.ai import router as ai_router
import uvicorn
from datetime import datetime


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Seed demo data on startup"""
    from schemas.task import Task
    import uuid

    demo_tasks = [
        Task(id=str(uuid.uuid4()), title="Design System Architecture",
             description="Plan microservices and API gateway patterns",
             deadline=datetime.now().replace(hour=17, minute=0).isoformat(),
             priority="critical", status="in-progress", category="Engineering", estimatedHours=4),
        Task(id=str(uuid.uuid4()), title="Q4 Marketing Report",
             description="Compile analytics for board presentation",
             deadline=datetime.now().replace(hour=12, minute=0).isoformat(),
             priority="high", status="pending", category="Marketing", estimatedHours=3),
        Task(id=str(uuid.uuid4()), title="Budget Planning FY2025",
             description="Departmental budget proposals and resource allocation",
             deadline=datetime.now().replace(hour=16, minute=0).isoformat(),
             priority="critical", status="pending", category="Finance", estimatedHours=6),
    ]
    for t in demo_tasks:
        task_store[t.id] = t

    print("✅ Demo tasks seeded")
    yield
    print("🛑 Shutting down...")


app = FastAPI(
    title="AI Smart Productivity Platform",
    description="FastAPI backend with in-memory storage + AI-powered task intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Assistant"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "AI Smart Productivity Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "tasks": "/api/tasks",
            "ai_priorities": "/api/ai/priorities",
            "ai_daily_plan": "/api/ai/daily-plan",
            "ai_suggest": "/api/ai/suggest",
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat(), "tasks_in_memory": len(task_store)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
