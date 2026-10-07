# Phase 6 Donor Adaptation — Coach & Learning

## 1. Overview

Phase 6 implements the **Coach & Learning** domain for the Creator Platform SaaS.
This document audits donor capabilities across `modules/` and specifies how they are ported, adapted, rebuilt, created, or parked into the platform's unified architecture.

---

## 2. Donor Capability Audit & Classification

| Donor Module | Capability / Feature | Strategy | Implementation in Platform |
|---|---|---|---|
| **Module 22** (Creative Producer) | Goal alignment & strategy feedback | **ADAPT** | Adapted into `coach_goals` and `CoachService.recommend_goal_actions()` |
| **Module 15** (Creator Workspace) | Goal tracking & skill reflection | **PORT** | Ported into `coach_goals` & `coach_sessions` persistence layer |
| **Module 11** (Comment to Content) | Feedback signal extraction & creator lessons | **ADAPT** | Adapted into `learning_records` with provenance from comments & performance |
| **Module 19** (Second Brain) | Persistent creator facts & workflow reflection | **REBUILD** | Rebuilt into `learning_records` backed by `MemoryEngine` search |
| **Module 22** (Creative Producer) | Unvalidated numerical skill scores (e.g., 82/100) | **PARK** | **PARKED** — Replaced with evidence-backed qualitative progress (`improving`, `stable`, `needs_attention`, `insufficient_evidence`) |
| Platform Native | Creator explicit corrections (overriding inferred patterns) | **NEW** | Added `is_explicit` flag & precedence rules in `LearningService` |
| Platform Native | Structured 5-part Feedback (Observation, Why it matters, What to improve, How to practice, What to try next) | **NEW** | Formalized in `coach_feedback` schema and LLM response contracts |
| Platform Native | Coach → Producer → Today → Studio handoff chain | **NEW** | Integrated into existing Producer and Today execution flows |

---

## 3. Strict Architectural Rules Applied

1. **Read-only `modules/`**: No donor code or files modified.
2. **Single Shared Primitives**: All LLM calls use `LLMGateway`; all vector search uses `EmbeddingService` + `MemoryEngine`; all background jobs use `JobService`.
3. **Database Security**: All user-owned Coach/Learning tables are protected by PostgreSQL Row Level Security (RLS) with cascading deletion on `user_id`.
4. **Anti-Fabrication**: Progress status is derived strictly from evidence records; fake numerical scores are prohibited.
