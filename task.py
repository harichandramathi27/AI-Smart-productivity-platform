"""
Pydantic models for the AI Smart Productivity Platform
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid


PriorityType = Literal["critical", "high", "medium", "low"]
StatusType = Literal["pending", "in-progress", "completed", "overdue"]


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Task title")
    description: Optional[str] = Field(None, max_length=2000, description="Detailed description")
    deadline: Optional[str] = Field(None, description="ISO 8601 datetime string")
    priority: PriorityType = Field("medium", description="Task priority level")
    status: StatusType = Field("pending", description="Current task status")
    category: Optional[str] = Field(None, max_length=100, description="Task category (e.g., Engineering, Marketing)")
    estimatedHours: Optional[float] = Field(None, ge=0.5, le=100, description="Estimated hours to complete")


class TaskCreate(TaskBase):
    """Schema for creating a new task"""
    pass

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Implement OAuth2 Authentication",
                "description": "Add OAuth2 flow with JWT tokens and refresh mechanism",
                "deadline": "2025-12-31T17:00:00",
                "priority": "high",
                "status": "pending",
                "category": "Engineering",
                "estimatedHours": 4.5
            }
        }


class TaskUpdate(BaseModel):
    """Schema for partial task updates — all fields optional"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    deadline: Optional[str] = None
    priority: Optional[PriorityType] = None
    status: Optional[StatusType] = None
    category: Optional[str] = Field(None, max_length=100)
    estimatedHours: Optional[float] = Field(None, ge=0.5, le=100)


class Task(TaskBase):
    """Full task schema including server-generated fields"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: str = Field(default_factory=lambda: datetime.now().isoformat())
    updatedAt: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "title": "Implement OAuth2 Authentication",
                "description": "Add OAuth2 flow with JWT tokens",
                "deadline": "2025-12-31T17:00:00",
                "priority": "high",
                "status": "in-progress",
                "category": "Engineering",
                "estimatedHours": 4.5,
                "createdAt": "2025-01-15T10:30:00",
                "updatedAt": "2025-01-15T11:00:00"
            }
        }


class AIPriorityRequest(BaseModel):
    tasks: list[Task]

    class Config:
        json_schema_extra = {"example": {"tasks": []}}


class AIRecommendation(BaseModel):
    taskId: str
    taskTitle: str
    rank: int
    reason: str
    suggestedTime: str


class AIPriorityResponse(BaseModel):
    recommendations: list[AIRecommendation]
    insight: str
    generatedAt: str = Field(default_factory=lambda: datetime.now().isoformat())


class AITimeBlock(BaseModel):
    startTime: str
    endTime: str
    task: str
    taskId: str
    label: str
    emoji: str
    tip: str


class AIDailyPlanResponse(BaseModel):
    timeBlocks: list[AITimeBlock]
    totalFocusHours: float
    productivityTips: list[str]
    generatedAt: str = Field(default_factory=lambda: datetime.now().isoformat())


class AISuggestRequest(BaseModel):
    title: str
    description: Optional[str] = ""


class AISuggestResponse(BaseModel):
    priority: PriorityType
    estimatedHours: float
    tip: str
    confidence: float = Field(0.85, ge=0, le=1)


class TasksStatsResponse(BaseModel):
    total: int
    completed: int
    pending: int
    inProgress: int
    overdue: int
    progress: float
