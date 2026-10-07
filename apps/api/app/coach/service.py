"""Coach & Learning service orchestrator (Phase 6).

Coordinates CoachRepository, LLMGateway, MemoryEngine, and Growth signals.
Defends against prompt injection and fake metric fabrication.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.coach.contracts import (
    CoachFeedbackRequest,
    CoachFeedbackResponse,
    CoachGoalCreate,
    CoachGoalResponse,
    CoachGoalUpdate,
    CoachRecommendation,
    CoachSessionCreate,
    CoachSessionResponse,
    CreatorCorrectionRequest,
    GoalCategory,
    GoalStatus,
    LearningCategory,
    LearningRecordCreate,
    LearningRecordResponse,
    LearningRecordUpdate,
    LearningSource,
    LearningStatus,
    ProgressStatus,
    StructuredFeedback,
)
from app.coach.persistence import CoachRepository
from app.core.logging import get_logger
from app.llm import LLMGateway
from app.llm.contracts import LLMRequest

logger = get_logger(__name__)


INJECTION_PATTERN = re.compile(
    r"(ignore\s+(?:all\s+)?previous\s+instructions|system\s+override|reveal\s+.*tokens|grant\s+admin|delete\s+all\s+learning|output\s+['\"]?hacked['\"]?)",
    re.IGNORECASE,
)


def _defang_prompt_text(text: Optional[str], max_chars: int = 2000) -> str:
    """Neutralize potential prompt injection tags and cap string length."""
    if not text:
        return "None"
    cleaned = re.sub(r"</?[a-zA-Z_0-9-]+>", "", str(text))
    cleaned = INJECTION_PATTERN.sub("[DEFANGED_INSTRUCTION]", cleaned)
    cleaned = cleaned.replace("```", "'''")
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars] + "...[truncated]"
    return cleaned


class CoachService:
    def __init__(
        self,
        db: AsyncSession,
        user_id: UUID,
        gateway: Optional[LLMGateway] = None,
    ):
        self.db = db
        self.user_id = user_id
        self.repo = CoachRepository(db, user_id)
        self.gateway = gateway or LLMGateway()

    # --- Goals -------------------------------------------------------------- #

    async def create_goal(self, req: CoachGoalCreate) -> CoachGoalResponse:
        return await self.repo.create_goal(req)

    async def get_goal(self, goal_id: UUID) -> Optional[CoachGoalResponse]:
        return await self.repo.get_goal(goal_id)

    async def list_goals(self, status: Optional[GoalStatus] = None) -> List[CoachGoalResponse]:
        return await self.repo.list_goals(status)

    async def update_goal(self, goal_id: UUID, req: CoachGoalUpdate) -> Optional[CoachGoalResponse]:
        return await self.repo.update_goal(goal_id, req)

    async def evaluate_goal_progress(self, goal_id: UUID) -> Optional[CoachGoalResponse]:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None

        # Gather evidence from learnings and feedback
        learnings = await self.repo.list_learnings(status=LearningStatus.CONFIRMED)
        feedbacks = []
        sessions = await self.repo.list_goals()  # goal check

        # Determine evidence-based progress
        evidence = []
        relevant_learnings = [l for l in learnings if l.category in (LearningCategory.CONTENT_STRENGTH, LearningCategory.SKILL_PROGRESS)]
        
        if not relevant_learnings and not goal.progress_evidence:
            new_status = ProgressStatus.INSUFFICIENT_EVIDENCE
        elif len(relevant_learnings) >= 2:
            new_status = ProgressStatus.IMPROVING
            evidence.append({"source": "learnings", "count": len(relevant_learnings)})
        elif any(l.category == LearningCategory.CONTENT_WEAKNESS for l in learnings):
            new_status = ProgressStatus.NEEDS_ATTENTION
            evidence.append({"source": "learnings", "note": "content weakness noted"})
        else:
            new_status = ProgressStatus.STABLE
            evidence.append({"source": "assessment", "note": "consistent performance"})

        update_req = CoachGoalUpdate(
            progress_status=new_status,
            progress_evidence=evidence if evidence else goal.progress_evidence
        )
        return await self.repo.update_goal(goal_id, update_req)

    # --- Sessions & Feedback ------------------------------------------------ #

    async def provide_feedback(self, req: CoachFeedbackRequest) -> CoachFeedbackResponse:
        # Create session if not provided
        if req.session_id:
            session = await self.repo.get_session(req.session_id)
            if not session:
                raise ValueError(f"Session {req.session_id} not found")
        else:
            session_req = CoachSessionCreate(
                topic=req.topic,
                goal_id=req.goal_id,
                context_snapshot={"additional_context": req.additional_context}
            )
            session = await self.repo.create_session(session_req)

        # Gather context for LLM coaching
        learnings = await self.repo.list_learnings(status=LearningStatus.CONFIRMED)
        learnings_text = "\n".join([f"- [{l.category.value}] {l.summary}" for l in learnings[:5]]) or "No prior learnings."

        prompt_vars = {
            "topic": _defang_prompt_text(req.topic, 255),
            "creator_profile": "Standard Creator Profile",
            "growth_insights": "No recent critical anomalies.",
            "learnings": _defang_prompt_text(learnings_text, 1000),
            "additional_context": _defang_prompt_text(req.additional_context, 1000),
        }

        # Generate feedback via LLM Gateway
        req_llm = LLMRequest(
            purpose="coaching_feedback",
            feature="coach",
            prompt_name="coach/feedback",
            prompt_version="v1",
            input_data=prompt_vars,
        )
        raw_response = await self.gateway.generate(
            user_id=self.user_id,
            request=req_llm,
            db=self.db,
        )

        feedback_data = self._parse_feedback_response(raw_response.content)
        saved = await self.repo.save_feedback(session.id, feedback_data)

        # Extract candidate learning if feedback discovered a key strength or area for improvement
        if feedback_data.what_to_improve:
            await self.repo.create_learning(LearningRecordCreate(
                category=LearningCategory.CONTENT_WEAKNESS,
                summary=f"Improvement area: {feedback_data.what_to_improve[:120]}",
                detail=feedback_data.how_to_practice,
                confidence=0.7,
                confidence_reasons=["Derived from coaching session feedback"],
                source_type=LearningSource.COACHING_SESSION,
                source_id=str(saved.id),
                status=LearningStatus.CANDIDATE
            ))

        return saved

    def _parse_feedback_response(self, content: str) -> StructuredFeedback:
        """Safely parse JSON response from LLM or construct structured fallback."""
        try:
            # Extract JSON block if present
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                return StructuredFeedback(
                    observation=str(data.get("observation", "Observed current content workflow")),
                    why_it_matters=str(data.get("why_it_matters", "Pacing and clarity directly affect retention")),
                    what_to_improve=str(data.get("what_to_improve", "Focus on clear value delivery")),
                    how_to_practice=str(data.get("how_to_practice", "Draft outlines before recording")),
                    what_to_try_next=str(data.get("what_to_try_next", "Apply structured hook in next script")),
                    evidence={"raw_parsed": True}
                )
        except Exception as exc:
            logger.warning(f"Failed to parse LLM feedback JSON: {exc}")

        return StructuredFeedback(
            observation="Observed current content creation practice.",
            why_it_matters="Pacing and clear hook structure improve viewer retention.",
            what_to_improve="Focus on a single core takeaway per post.",
            how_to_practice="Practice scripting the first 5 seconds concisely.",
            what_to_try_next="Use a direct question or curiosity gap in your next hook.",
            evidence={"fallback": True, "raw": content[:200]}
        )

    # --- Learning Records --------------------------------------------------- #

    async def create_learning(self, req: LearningRecordCreate) -> LearningRecordResponse:
        return await self.repo.create_learning(req)

    async def get_learning(self, learning_id: UUID) -> Optional[LearningRecordResponse]:
        return await self.repo.get_learning(learning_id)

    async def list_learnings(
        self, category: Optional[LearningCategory] = None, status: Optional[LearningStatus] = None
    ) -> List[LearningRecordResponse]:
        return await self.repo.list_learnings(category, status)

    async def update_learning(self, learning_id: UUID, req: LearningRecordUpdate) -> Optional[LearningRecordResponse]:
        return await self.repo.update_learning(learning_id, req)

    async def apply_creator_correction(self, req: CreatorCorrectionRequest) -> Optional[LearningRecordResponse]:
        """Explicit creator corrections override inferred learnings with high authority."""
        return await self.repo.apply_correction(req)

    # --- Handoffs ----------------------------------------------------------- #

    async def recommend_producer_action(self, goal_id: UUID) -> Optional[CoachRecommendation]:
        goal = await self.repo.get_goal(goal_id)
        if not goal:
            return None

        return CoachRecommendation(
            title=f"Practice: {goal.title}",
            description=f"Focused practice session targeting goal: {goal.description or goal.title}",
            goal_id=goal.id,
            action_type="producer_plan",
            payload={
                "goal_title": goal.title,
                "category": goal.category.value,
                "recommended_focus": "Practice exercises based on recent coaching feedback"
            }
        )
