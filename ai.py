"""
AI Routes - Intelligent Task Analysis & Planning
POST /api/ai/priorities  - Analyze and rank task priorities
POST /api/ai/daily-plan  - Generate optimized daily schedule
POST /api/ai/suggest     - Auto-suggest priority and time for a task

Uses OpenAI GPT API when OPENAI_API_KEY is set,
otherwise falls back to deterministic rule-based logic.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import os
import math

from schemas.task import (
    Task, AIPriorityRequest, AIPriorityResponse, AIRecommendation,
    AIDailyPlanResponse, AITimeBlock, AISuggestRequest, AISuggestResponse
)

router = APIRouter()


# ─── Utility ─────────────────────────────────────────────────────────────────

PRIORITY_SCORE = {"critical": 100, "high": 75, "medium": 50, "low": 25}

def urgency_score(task: Task) -> float:
    if not task.deadline:
        return PRIORITY_SCORE.get(task.priority, 0)
    try:
        diff_hours = (datetime.fromisoformat(task.deadline) - datetime.now()).total_seconds() / 3600
        if diff_hours < 0:
            time_score = 200
        elif diff_hours < 24:
            time_score = 150
        elif diff_hours < 72:
            time_score = 100
        elif diff_hours < 168:
            time_score = 50
        else:
            time_score = 10
        return PRIORITY_SCORE.get(task.priority, 0) + time_score
    except Exception:
        return PRIORITY_SCORE.get(task.priority, 0)


def format_deadline(task: Task) -> str:
    if not task.deadline:
        return "no deadline"
    try:
        d = datetime.fromisoformat(task.deadline)
        diff = d - datetime.now()
        hours = int(diff.total_seconds() / 3600)
        if hours < 0:
            return f"overdue by {abs(hours//24)}d"
        if hours < 24:
            return f"{hours}h left"
        days = hours // 24
        return f"{days}d left" if days <= 7 else d.strftime("%b %d")
    except Exception:
        return task.deadline


# ─── Fallback Rule-Based AI ───────────────────────────────────────────────────

def rule_based_priorities(tasks: list[Task]) -> AIPriorityResponse:
    active = [t for t in tasks if t.status != "completed"]
    sorted_tasks = sorted(active, key=urgency_score, reverse=True)

    reasons = [
        "🔥 Highest urgency: {p} priority with deadline {d}. Clear your schedule and start now.",
        "⚡ Second priority: Significant impact on project timeline. Schedule immediately after task #1.",
        "📋 Third priority: Important but manageable. Block time this afternoon.",
    ]
    suggestions = ["9:00 AM – 11:00 AM", "11:30 AM – 1:00 PM", "2:00 PM – 4:00 PM"]

    recs = [
        AIRecommendation(
            taskId=t.id,
            taskTitle=t.title,
            rank=i + 1,
            reason=reasons[i].format(p=t.priority, d=format_deadline(t)),
            suggestedTime=suggestions[i],
        )
        for i, t in enumerate(sorted_tasks[:3])
    ]

    critical_count = sum(1 for t in active if t.priority == "critical")
    total_hours = sum(t.estimatedHours or 2 for t in active)

    return AIPriorityResponse(
        recommendations=recs,
        insight=(
            f"You have {len(active)} active tasks with {critical_count} marked critical. "
            f"Estimated {total_hours:.1f}h of focused work. "
            f"I recommend addressing the top 3 priorities before 4 PM today."
        ),
    )


def rule_based_daily_plan(tasks: list[Task]) -> AIDailyPlanResponse:
    active = sorted(
        [t for t in tasks if t.status != "completed"],
        key=urgency_score, reverse=True
    )

    block_templates = [
        {"label": "Deep Work Block", "emoji": "🧠", "tip": "Silence all notifications. Use 90-min focus sprints with 10-min breaks."},
        {"label": "Collaborative Focus", "emoji": "🤝", "tip": "Schedule any needed syncs at the start. Batch async updates after."},
        {"label": "Creative Session", "emoji": "✨", "tip": "Start with a 5-min freewrite. Suspend self-editing until a complete draft exists."},
        {"label": "Review & Polish", "emoji": "🔍", "tip": "Work through a checklist. Document progress for tomorrow's handoff."},
    ]

    time_blocks = []
    current_hour = 9.0

    for i, task in enumerate(active[:4]):
        dur = task.estimatedHours or 2
        start_h = int(current_hour)
        start_m = int((current_hour % 1) * 60)
        end_hour = current_hour + dur
        end_h = int(end_hour)
        end_m = int((end_hour % 1) * 60)

        tpl = block_templates[i % len(block_templates)]
        time_blocks.append(AITimeBlock(
            startTime=f"{start_h}:{start_m:02d}",
            endTime=f"{end_h}:{end_m:02d}",
            task=task.title,
            taskId=task.id,
            **tpl,
        ))
        current_hour += math.ceil(dur) + (0.5 if i == 1 else 0)  # lunch break

    total_hours = sum(t.estimatedHours or 2 for t in active[:4])

    return AIDailyPlanResponse(
        timeBlocks=time_blocks,
        totalFocusHours=round(total_hours, 1),
        productivityTips=[
            "🌅 Your peak cognitive performance occurs 9–11 AM. Front-load your most demanding task.",
            "⏰ Apply the 2-minute rule: tasks under 2 minutes get done immediately, not scheduled.",
            "🎯 Limit daily MIT (Most Important Tasks) to exactly 3 for maximum execution clarity.",
            "🔋 Insert a 15-min walk at 3 PM to counteract the post-lunch circadian energy dip.",
            "📵 Batch communications (Slack, email) to 3 fixed windows: 10 AM, 1 PM, and 4 PM.",
            "📝 End each day with a 5-min 'shutdown ritual': clear tomorrow's top 3 tasks the night before.",
        ],
    )


def rule_based_suggest(title: str, description: str) -> AISuggestResponse:
    text = (title + " " + (description or "")).lower()

    rules = [
        (["finance", "budget", "invoice", "payroll", "audit"], "critical", 4.0, "Gather all data sources before starting. Book 2h uninterrupted blocks.", 0.92),
        (["security", "vulnerability", "breach", "incident"], "critical", 3.0, "Escalate immediately. Loop in stakeholders before diving into solutions.", 0.95),
        (["engineer", "architecture", "code", "system", "deploy", "infra"], "high", 3.0, "Break into vertical slices. Time-box at 90-min intervals.", 0.88),
        (["deadline", "urgent", "asap", "critical", "launch"], "high", 2.5, "Clarify scope before starting. Identify blockers in the first 15 minutes.", 0.90),
        (["market", "campaign", "content", "brand", "seo"], "medium", 2.5, "Review competitor analysis first. Batch similar tasks for flow state.", 0.85),
        (["meeting", "sync", "review", "interview", "1:1"], "medium", 1.5, "Prepare a clear agenda. Time-box strictly with a timer.", 0.80),
        (["document", "readme", "wiki", "report", "analysis"], "medium", 2.0, "Start with an outline before writing. Use headers to structure thinking.", 0.82),
        (["research", "explore", "investigate", "spike"], "low", 3.0, "Time-box research to avoid rabbit holes. Set a clear output goal.", 0.78),
    ]

    for keywords, priority, hours, tip, confidence in rules:
        if any(kw in text for kw in keywords):
            return AISuggestResponse(priority=priority, estimatedHours=hours, tip=tip, confidence=confidence)

    return AISuggestResponse(
        priority="medium",
        estimatedHours=2.0,
        tip="Define a clear 'done' criteria before starting. Schedule a checkpoint at the halfway mark.",
        confidence=0.70,
    )


# ─── OpenAI Integration (optional) ───────────────────────────────────────────

async def openai_priorities(tasks: list[Task]) -> AIPriorityResponse:
    """Live OpenAI call — falls back to rule-based if API key not set"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return rule_based_priorities(tasks)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)

        task_summary = "\n".join([
            f"- ID:{t.id} | Title:{t.title} | Priority:{t.priority} | "
            f"Deadline:{t.deadline or 'none'} | Status:{t.status} | Hours:{t.estimatedHours or 2}"
            for t in tasks if t.status != "completed"
        ])

        response = await client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {"role": "system", "content": "You are an expert productivity coach. Analyze tasks and provide concise, actionable priority recommendations. Always respond in JSON."},
                {"role": "user", "content": f"Analyze these tasks and rank the top 3 by urgency:\n{task_summary}\n\nReturn JSON: {{recommendations: [{{taskId, taskTitle, rank, reason, suggestedTime}}], insight: string}}"}
            ],
            temperature=0.3,
            max_tokens=800,
        )

        import json
        data = json.loads(response.choices[0].message.content)
        recs = [AIRecommendation(**r) for r in data["recommendations"]]
        return AIPriorityResponse(recommendations=recs, insight=data["insight"])

    except Exception as e:
        print(f"OpenAI error, falling back to rule-based: {e}")
        return rule_based_priorities(tasks)


# ─── Route Handlers ──────────────────────────────────────────────────────────

@router.post("/priorities", response_model=AIPriorityResponse)
async def analyze_priorities(request: AIPriorityRequest):
    """
    Analyze task list and return AI-powered priority rankings.
    Uses OpenAI GPT if OPENAI_API_KEY is set, otherwise rule-based logic.
    """
    if not request.tasks:
        raise HTTPException(status_code=400, detail="Task list cannot be empty")

    use_openai = bool(os.getenv("OPENAI_API_KEY"))
    if use_openai:
        return await openai_priorities(request.tasks)
    return rule_based_priorities(request.tasks)


@router.post("/daily-plan", response_model=AIDailyPlanResponse)
async def generate_daily_plan(request: AIPriorityRequest):
    """
    Generate an optimized daily schedule based on active tasks.
    Includes time blocks, focus strategies, and productivity tips.
    """
    if not request.tasks:
        raise HTTPException(status_code=400, detail="Task list cannot be empty")
    return rule_based_daily_plan(request.tasks)


@router.post("/suggest", response_model=AISuggestResponse)
async def suggest_task_config(request: AISuggestRequest):
    """
    Given a task title and description, suggest optimal priority
    level and time estimate using AI pattern matching.
    """
    if not request.title.strip():
        raise HTTPException(status_code=400, detail="Task title is required")
    return rule_based_suggest(request.title, request.description or "")
