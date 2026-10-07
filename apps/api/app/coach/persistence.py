"""Persistence layer for Coach & Learning domain (Phase 6).

All database operations execute against the RLS-scoped AsyncSession provided by
the caller. No queries bypass RLS.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.coach.contracts import (
    CoachFeedbackResponse,
    CoachGoalCreate,
    CoachGoalResponse,
    CoachGoalUpdate,
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
    SessionStatus,
    StructuredFeedback,
)


class CoachRepository:
    def __init__(self, db: AsyncSession, user_id: UUID):
        self.db = db
        self.user_id = user_id

    # --- Goals -------------------------------------------------------------- #

    async def create_goal(self, req: CoachGoalCreate) -> CoachGoalResponse:
        sql = text("""
            INSERT INTO coach_goals
                (user_id, title, description, category, target_date, status, progress_status)
            VALUES
                (:user_id, :title, :description, :category, :target_date, 'active', 'insufficient_evidence')
            RETURNING id, user_id, title, description, category, target_date,
                      status, progress_status, progress_evidence, created_at, updated_at
        """)
        row = (await self.db.execute(sql, {
            "user_id": str(self.user_id),
            "title": req.title,
            "description": req.description,
            "category": req.category.value,
            "target_date": req.target_date,
        })).mappings().one()
        await self.db.commit()
        return self._to_goal_response(row)

    async def get_goal(self, goal_id: UUID) -> Optional[CoachGoalResponse]:
        sql = text("""
            SELECT id, user_id, title, description, category, target_date,
                   status, progress_status, progress_evidence, created_at, updated_at
            FROM coach_goals
            WHERE id = :goal_id
        """)
        res = (await self.db.execute(sql, {"goal_id": str(goal_id)})).mappings().first()
        return self._to_goal_response(res) if res else None

    async def list_goals(self, status: Optional[GoalStatus] = None) -> List[CoachGoalResponse]:
        query = "SELECT id, user_id, title, description, category, target_date, status, progress_status, progress_evidence, created_at, updated_at FROM coach_goals"
        params: Dict[str, Any] = {}
        if status:
            query += " WHERE status = :status"
            params["status"] = status.value
        query += " ORDER BY created_at DESC"

        rows = (await self.db.execute(text(query), params)).mappings().all()
        return [self._to_goal_response(r) for r in rows]

    async def update_goal(self, goal_id: UUID, req: CoachGoalUpdate) -> Optional[CoachGoalResponse]:
        fields: List[str] = ["updated_at = NOW()"]
        params: Dict[str, Any] = {"goal_id": str(goal_id)}

        if req.title is not None:
            fields.append("title = :title")
            params["title"] = req.title
        if req.description is not None:
            fields.append("description = :description")
            params["description"] = req.description
        if req.category is not None:
            fields.append("category = :category")
            params["category"] = req.category.value
        if req.target_date is not None:
            fields.append("target_date = :target_date")
            params["target_date"] = req.target_date
        if req.status is not None:
            fields.append("status = :status")
            params["status"] = req.status.value
        if req.progress_status is not None:
            fields.append("progress_status = :progress_status")
            params["progress_status"] = req.progress_status.value
        if req.progress_evidence is not None:
            fields.append("progress_evidence = CAST(:progress_evidence AS jsonb)")
            params["progress_evidence"] = json.dumps(req.progress_evidence)

        sql = text(f"""
            UPDATE coach_goals
            SET {', '.join(fields)}
            WHERE id = :goal_id
            RETURNING id, user_id, title, description, category, target_date,
                      status, progress_status, progress_evidence, created_at, updated_at
        """)
        res = (await self.db.execute(sql, params)).mappings().first()
        if res:
            await self.db.commit()
            return self._to_goal_response(res)
        return None

    # --- Sessions & Feedback ------------------------------------------------ #

    async def create_session(self, req: CoachSessionCreate) -> CoachSessionResponse:
        sql = text("""
            INSERT INTO coach_sessions
                (user_id, goal_id, topic, context_snapshot, status)
            VALUES
                (:user_id, :goal_id, :topic, CAST(:context_snapshot AS jsonb), 'active')
            RETURNING id, user_id, goal_id, topic, context_snapshot, status, created_at, updated_at
        """)
        row = (await self.db.execute(sql, {
            "user_id": str(self.user_id),
            "goal_id": str(req.goal_id) if req.goal_id else None,
            "topic": req.topic,
            "context_snapshot": json.dumps(req.context_snapshot),
        })).mappings().one()
        await self.db.commit()
        return self._to_session_response(row)

    async def get_session(self, session_id: UUID) -> Optional[CoachSessionResponse]:
        sql = text("""
            SELECT id, user_id, goal_id, topic, context_snapshot, status, created_at, updated_at
            FROM coach_sessions
            WHERE id = :session_id
        """)
        res = (await self.db.execute(sql, {"session_id": str(session_id)})).mappings().first()
        return self._to_session_response(res) if res else None

    async def save_feedback(self, session_id: UUID, feedback: StructuredFeedback) -> CoachFeedbackResponse:
        sql = text("""
            INSERT INTO coach_feedback
                (session_id, user_id, observation, why_it_matters, what_to_improve, how_to_practice, what_to_try_next, evidence)
            VALUES
                (:session_id, :user_id, :obs, :why, :what, :how, :next, CAST(:evidence AS jsonb))
            RETURNING id, session_id, user_id, observation, why_it_matters, what_to_improve,
                      how_to_practice, what_to_try_next, evidence, created_at
        """)
        row = (await self.db.execute(sql, {
            "session_id": str(session_id),
            "user_id": str(self.user_id),
            "obs": feedback.observation,
            "why": feedback.why_it_matters,
            "what": feedback.what_to_improve,
            "how": feedback.how_to_practice,
            "next": feedback.what_to_try_next,
            "evidence": json.dumps(feedback.evidence),
        })).mappings().one()
        await self.db.commit()
        return self._to_feedback_response(row)

    async def list_feedback_for_session(self, session_id: UUID) -> List[CoachFeedbackResponse]:
        sql = text("""
            SELECT id, session_id, user_id, observation, why_it_matters, what_to_improve,
                   how_to_practice, what_to_try_next, evidence, created_at
            FROM coach_feedback
            WHERE session_id = :session_id
            ORDER BY created_at DESC
        """)
        rows = (await self.db.execute(sql, {"session_id": str(session_id)})).mappings().all()
        return [self._to_feedback_response(r) for r in rows]

    # --- Learning Records --------------------------------------------------- #

    async def create_learning(self, req: LearningRecordCreate) -> LearningRecordResponse:
        sql = text("""
            INSERT INTO learning_records
                (user_id, category, summary, detail, confidence, confidence_reasons,
                 source_type, source_id, status, is_explicit)
            VALUES
                (:user_id, :category, :summary, :detail, :confidence, CAST(:reasons AS jsonb),
                 :source_type, :source_id, :status, :is_explicit)
            RETURNING id, user_id, category, summary, detail, confidence, confidence_reasons,
                      source_type, source_id, status, is_explicit, created_at, updated_at
        """)
        row = (await self.db.execute(sql, {
            "user_id": str(self.user_id),
            "category": req.category.value,
            "summary": req.summary,
            "detail": req.detail,
            "confidence": req.confidence,
            "reasons": json.dumps(req.confidence_reasons),
            "source_type": req.source_type.value,
            "source_id": req.source_id,
            "status": req.status.value,
            "is_explicit": req.is_explicit,
        })).mappings().one()
        await self.db.commit()
        return self._to_learning_response(row)

    async def get_learning(self, learning_id: UUID) -> Optional[LearningRecordResponse]:
        sql = text("""
            SELECT id, user_id, category, summary, detail, confidence, confidence_reasons,
                   source_type, source_id, status, is_explicit, created_at, updated_at
            FROM learning_records
            WHERE id = :id
        """)
        res = (await self.db.execute(sql, {"id": str(learning_id)})).mappings().first()
        return self._to_learning_response(res) if res else None

    async def list_learnings(
        self, category: Optional[LearningCategory] = None, status: Optional[LearningStatus] = None
    ) -> List[LearningRecordResponse]:
        conditions = []
        params: Dict[str, Any] = {}
        if category:
            conditions.append("category = :category")
            params["category"] = category.value
        if status:
            conditions.append("status = :status")
            params["status"] = status.value

        query = "SELECT id, user_id, category, summary, detail, confidence, confidence_reasons, source_type, source_id, status, is_explicit, created_at, updated_at FROM learning_records"
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY created_at DESC"

        rows = (await self.db.execute(text(query), params)).mappings().all()
        return [self._to_learning_response(r) for r in rows]

    async def update_learning(self, learning_id: UUID, req: LearningRecordUpdate) -> Optional[LearningRecordResponse]:
        fields: List[str] = ["updated_at = NOW()"]
        params: Dict[str, Any] = {"id": str(learning_id)}

        if req.summary is not None:
            fields.append("summary = :summary")
            params["summary"] = req.summary
        if req.detail is not None:
            fields.append("detail = :detail")
            params["detail"] = req.detail
        if req.confidence is not None:
            fields.append("confidence = :confidence")
            params["confidence"] = req.confidence
        if req.status is not None:
            fields.append("status = :status")
            params["status"] = req.status.value
        if req.is_explicit is not None:
            fields.append("is_explicit = :is_explicit")
            params["is_explicit"] = req.is_explicit

        sql = text(f"""
            UPDATE learning_records
            SET {', '.join(fields)}
            WHERE id = :id
            RETURNING id, user_id, category, summary, detail, confidence, confidence_reasons,
                      source_type, source_id, status, is_explicit, created_at, updated_at
        """)
        res = (await self.db.execute(sql, params)).mappings().first()
        if res:
            await self.db.commit()
            return self._to_learning_response(res)
        return None

    async def apply_correction(self, req: CreatorCorrectionRequest) -> Optional[LearningRecordResponse]:
        sql = text("""
            UPDATE learning_records
            SET summary = :summary,
                detail = :detail,
                is_explicit = :is_explicit,
                confidence = 1.0,
                status = 'confirmed',
                updated_at = NOW()
            WHERE id = :id
            RETURNING id, user_id, category, summary, detail, confidence, confidence_reasons,
                      source_type, source_id, status, is_explicit, created_at, updated_at
        """)
        res = (await self.db.execute(sql, {
            "id": str(req.learning_id),
            "summary": req.corrected_summary,
            "detail": req.detail,
            "is_explicit": req.is_explicit,
        })).mappings().first()
        if res:
            await self.db.commit()
            return self._to_learning_response(res)
        return None

    # --- Mapping Helpers ----------------------------------------------------- #

    def _to_goal_response(self, r: Any) -> CoachGoalResponse:
        evidence = r["progress_evidence"]
        if isinstance(evidence, str):
            evidence = json.loads(evidence)
        return CoachGoalResponse(
            id=UUID(str(r["id"])),
            user_id=UUID(str(r["user_id"])),
            title=r["title"],
            description=r["description"],
            category=GoalCategory(r["category"]),
            target_date=r["target_date"],
            status=GoalStatus(r["status"]),
            progress_status=ProgressStatus(r["progress_status"]),
            progress_evidence=evidence or [],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    def _to_session_response(self, r: Any) -> CoachSessionResponse:
        snapshot = r["context_snapshot"]
        if isinstance(snapshot, str):
            snapshot = json.loads(snapshot)
        return CoachSessionResponse(
            id=UUID(str(r["id"])),
            user_id=UUID(str(r["user_id"])),
            goal_id=UUID(str(r["goal_id"])) if r["goal_id"] else None,
            topic=r["topic"],
            context_snapshot=snapshot or {},
            status=SessionStatus(r["status"]),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )

    def _to_feedback_response(self, r: Any) -> CoachFeedbackResponse:
        ev = r["evidence"]
        if isinstance(ev, str):
            ev = json.loads(ev)
        return CoachFeedbackResponse(
            id=UUID(str(r["id"])),
            session_id=UUID(str(r["session_id"])),
            user_id=UUID(str(r["user_id"])),
            observation=r["observation"],
            why_it_matters=r["why_it_matters"],
            what_to_improve=r["what_to_improve"],
            how_to_practice=r["how_to_practice"],
            what_to_try_next=r["what_to_try_next"],
            evidence=ev or {},
            created_at=r["created_at"],
        )

    def _to_learning_response(self, r: Any) -> LearningRecordResponse:
        reasons = r["confidence_reasons"]
        if isinstance(reasons, str):
            reasons = json.loads(reasons)
        return LearningRecordResponse(
            id=UUID(str(r["id"])),
            user_id=UUID(str(r["user_id"])),
            category=LearningCategory(r["category"]),
            summary=r["summary"],
            detail=r["detail"],
            confidence=float(r["confidence"]),
            confidence_reasons=reasons or [],
            source_type=LearningSource(r["source_type"]),
            source_id=r["source_id"],
            status=LearningStatus(r["status"]),
            is_explicit=bool(r["is_explicit"]),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
