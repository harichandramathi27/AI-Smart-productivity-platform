"""
Task Routes - Full CRUD with In-Memory Storage
GET    /api/tasks         - List all tasks (with filtering)
POST   /api/tasks         - Create task
GET    /api/tasks/{id}    - Get single task
PUT    /api/tasks/{id}    - Update task
DELETE /api/tasks/{id}    - Delete task
GET    /api/tasks/stats   - Get aggregate stats
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime

from schemas.task import Task, TaskCreate, TaskUpdate, TasksStatsResponse

router = APIRouter()

# ─── In-Memory Store ──────────────────────────────────────────────────────────
# Dictionary: { task_id: Task }  — scoped to this module, shared across requests
task_store: dict[str, Task] = {}


# ─── Helpers ─────────────────────────────────────────────────────────────────
def is_overdue(task: Task) -> bool:
    if not task.deadline or task.status == "completed":
        return False
    try:
        return datetime.fromisoformat(task.deadline) < datetime.now()
    except Exception:
        return False


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=TasksStatsResponse)
async def get_stats():
    """Return aggregate task statistics"""
    tasks = list(task_store.values())
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == "completed")
    pending = sum(1 for t in tasks if t.status == "pending")
    in_progress = sum(1 for t in tasks if t.status == "in-progress")
    overdue = sum(1 for t in tasks if is_overdue(t))
    return TasksStatsResponse(
        total=total,
        completed=completed,
        pending=pending,
        inProgress=in_progress,
        overdue=overdue,
        progress=round((completed / total) * 100, 1) if total > 0 else 0.0,
    )


@router.get("", response_model=list[Task])
async def list_tasks(
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in title/description"),
    sort_by: str = Query("createdAt", description="Sort field: createdAt | deadline | priority"),
):
    """List all tasks with optional filtering and sorting"""
    tasks = list(task_store.values())

    if status:
        tasks = [t for t in tasks if t.status == status]
    if priority:
        tasks = [t for t in tasks if t.priority == priority]
    if category:
        tasks = [t for t in tasks if t.category and t.category.lower() == category.lower()]
    if search:
        q = search.lower()
        tasks = [t for t in tasks if q in t.title.lower() or (t.description and q in t.description.lower())]

    priority_order = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    if sort_by == "priority":
        tasks.sort(key=lambda t: priority_order.get(t.priority, 0), reverse=True)
    elif sort_by == "deadline":
        tasks.sort(key=lambda t: t.deadline or "9999", reverse=False)
    else:
        tasks.sort(key=lambda t: t.createdAt, reverse=True)

    return tasks


@router.post("", response_model=Task, status_code=201)
async def create_task(payload: TaskCreate):
    """Create a new task and store in memory"""
    task = Task(**payload.model_dump())
    task_store[task.id] = task
    return task


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Fetch a single task by ID"""
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    return task_store[task_id]


@router.put("/{task_id}", response_model=Task)
async def update_task(task_id: str, payload: TaskUpdate):
    """Partially update a task (PATCH semantics via PUT)"""
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    existing = task_store[task_id]
    update_data = payload.model_dump(exclude_unset=True)
    updated = existing.model_copy(update={**update_data, "updatedAt": datetime.now().isoformat()})
    task_store[task_id] = updated
    return updated


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str):
    """Delete a task from in-memory store"""
    if task_id not in task_store:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
    del task_store[task_id]
