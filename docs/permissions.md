# Code Reuse Permissions & License Audit — Creator SaaS Platform

*Completed during Phase 0 Audit. Audits open source licenses, copyright notices, and code reuse permissions for imported donor modules.*

---

## 1. Provenance & Source Repository Context

- **Source Repository:** `https://github.com/Rishi-ZAiFi/ASADI_Protosem01`
- **Import Location:** `modules/` (24 prototype directories)
- **Cohort Authorship:** Student prototypes created during the ASADI Protosem AI Product Development Sprint.

---

## 2. Donor Module License Inventory

| Module Directory | Student Contributor | Declared License | Status |
|:---|:---|:---|:---|
| `01_Content_Idea_Generator` | Kavi Priya CA | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `02_Content_Repurposer` | Jaishanth L | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `03_Hook_Generator` | Mithra Ravi | MIT License | Cleared for production reuse |
| `04_Daily_Content_Planner` | Theeran P | MIT License | Cleared for production reuse |
| `05_Reel_Script_Builder` | PRAVEEN.A | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `06_Clip_Finder` | Manoj M | MIT License | Cleared for production reuse |
| `07_Thumbnail_Ideator` | Sanadhani | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `08_Caption_Assistant` | Tejaswi K | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `09_CTA_Generator` | Malligaarjunan AVK | MIT License | Cleared for production reuse |
| `10_Comment_Analyzer` | Poornaa Shree Praveenraj | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `11_Comment_to_Content` | Satheesh | MIT License | Cleared for production reuse |
| `12_Creator_Research_Assistant` | Sudhiksha | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `13_Voice_Replicator` | Suryakumar J S | MIT License | Cleared for production reuse |
| `14_Podcast_Assistant` | Priyadharshini B | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `15_Creator_Workspace` | Aatif F | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `16_Content_Recycler` | Archana C | MIT License | Cleared for production reuse |
| `17_Brand_Pitch_Builder` | Prinetha kannan | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `18_AI_Content_Director` | Sri Jananii S | MIT License | Cleared for production reuse |
| `18_AI_Content_Director_Guruvelah` | Sri Jananii S & Cohort Team | MIT License | Cleared for production reuse |
| `19_Creator_Second_Brain` | Karthik Aravind M | MIT License | Cleared for production reuse |
| `20_AI_Screenplay_Workspace` | SaiSanjay R | Unspecified (Cohort internal donor) | Safe for internal SaaS porting |
| `21_Autonomous_Content_Pipeline` | Sudharshan R | MIT License | Cleared for production reuse |
| `22_AI_Creative_Producer` | Udhayan K | Spec only | N/A (Rebuilt fresh) |
| `26_Creator_Collaboration_Finder` | Cohort Contributor | Unspecified | Parked |

---

## 3. Policy & Discipline Rules for Code Porting

To maintain legal integrity and attribution standards, all code ported from `modules/` MUST strictly adhere to the following rules:

1. **READ-ONLY Donor Protection (Rule 2):** Files inside `modules/` must remain completely untouched. No direct edits or modifications are made within `modules/`.
2. **Provenance Tracking in `docs/porting-log.md` (Rule 25):** Every ported file or extracted function MUST log its original source path and modifications. Example header:
   ```python
   # Ported from: modules/13_Voice_Replicator/backend/app/services/content_analyzer.py
   # Purpose: Core voice style feature extraction & profile synthesis
   # Modifications: Adapted to FastAPI async architecture, added user_id multi-tenant context, integrated with unified pgvector memory.
   ```
3. **Third-Party Dependency Compliance:** Standard open-source libraries used across modules (`FastAPI`, `Next.js`, `SQLAlchemy`, `pgvector`, `@google/genai`, `Anthropic SDK`, `Framer Motion`) operate under permissive MIT, Apache 2.0, or BSD licenses.
