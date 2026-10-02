import json
import logging
import uuid
from typing import List, Dict, Any
from backend.app.schemas import ClusterIdeasResponse, SingleIdeaItem
from backend.app.services.llm import llm_service

logger = logging.getLogger(__name__)

def heuristic_generate_ideas_for_cluster(
    cluster_id: int,
    cluster_name: str,
    top_comments: List[Dict[str, Any]],
    demand_score: float
) -> List[Dict[str, Any]]:
    """
    Grounded Instagram-native idea generator providing:
    - format: reel | carousel | story
    - for reels: hook, suggested_length, on_screen_text
    - for carousels: slide-by-slide outline (5-8 slides)
    - for stories: poll/question-sticker text for validation
    - caption_draft + 5-8 hashtags
    - Story-mention caption with @tags
    """
    top_3_ids = [c["comment_id"] for c in top_comments[:3]]
    usernames = [c["username"] for c in top_comments[:3]]
    joined_users = ", ".join(usernames)
    comment_snippets = [c.get("clean_text") or c.get("text", "") for c in top_comments[:3]]
    joined_snippet = " & ".join(comment_snippets)

    lower = (cluster_name + " " + joined_snippet).lower()

    if "agent" in lower or "langgraph" in lower or "crewai" in lower:
        return [
            {
                "title": "LangGraph vs CrewAI: Which Multi-Agent Framework to Pick in 2026?",
                "format": "reel",
                "hook": "Stop building single-prompt LLM wrappers! Here is how real multi-agent systems work in production.",
                "suggested_length": "45s",
                "on_screen_text": "LangGraph vs CrewAI: Don't pick the WRONG framework ⚠️ (2026 Guide)",
                "slide_outline": None,
                "story_validation": {
                    "type": "poll",
                    "prompt": "Building AI agents in 2026: which framework are you using?",
                    "options": ["LangGraph 🤖", "CrewAI 🚀"],
                    "sticker_preview": "Poll: LangGraph 🤖 vs CrewAI 🚀"
                },
                "caption_draft": "Everyone talks about AI agents, but 90% of tutorials never show state persistence or human-in-the-loop validation.\n\nIn this Reel, I break down LangGraph vs CrewAI with architecture diagrams and when to use each for your SaaS.\n\n💬 Comment 'AGENTS' and I'll DM you the complete GitHub repo link!\n\nSave this for your next AI hackathon! 💾",
                "hashtags": ["#aiengineering", "#langgraph", "#python", "#crewai", "#machinelearning", "#buildinpublic", "#softwareengineer"],
                "story_mention_caption": f"Huge shoutout to {joined_users} whose comments inspired today's breakdown! Swipe up to watch the full Reel 🚀",
                "why_now": f"High demand from {len(top_comments)} commenters requesting clear multi-agent framework comparisons.",
                "supporting_comment_ids": top_3_ids
            },
            {
                "title": "3 Deadly Mistakes When Deploying Autonomous AI Agents",
                "format": "carousel",
                "hook": "Why your AI agent loops infinitely and drains your OpenAI API credits overnight.",
                "suggested_length": None,
                "on_screen_text": None,
                "slide_outline": [
                    {
                        "slide_number": 1,
                        "title": "Cover / Hook",
                        "visual": "Bold warning sign with glowing terminal showing infinite recursion loop",
                        "content": "Why 90% of AI Agents loop infinitely and burn $500 in API tokens in one night 👉"
                    },
                    {
                        "slide_number": 2,
                        "title": "Mistake 1: Stateless Execution",
                        "visual": "Diagram contrasting ephemeral state vs SQLite checkpointer",
                        "content": "Never rely on in-memory memory buffers. If your worker dies, the conversation context vanishes."
                    },
                    {
                        "slide_number": 3,
                        "title": "Mistake 2: Missing Circuit Breakers",
                        "visual": "Flowchart showing max_iterations guard and token limiter",
                        "content": "Hardcode max iteration limits (max_iterations=5). Without this, tool calls can loop forever."
                    },
                    {
                        "slide_number": 4,
                        "title": "Mistake 3: Zero Human-in-the-Loop",
                        "visual": "Code snippet showing interrupt_before=['action_execute']",
                        "content": "Before agents trigger database writes or email sends, pause execution for user confirmation."
                    },
                    {
                        "slide_number": 5,
                        "title": "Architecture Blueprint",
                        "visual": "Clean 4-box architecture diagram of production agent runtime",
                        "content": "User Request -> Supervisor Router -> Worker Agents -> Output Validator -> Database."
                    },
                    {
                        "slide_number": 6,
                        "title": "Summary & Action Checklist",
                        "visual": "Checklist icon with 3 golden rules",
                        "content": "1. Persist state. 2. Set strict circuit breakers. 3. Gate sensitive actions."
                    },
                    {
                        "slide_number": 7,
                        "title": "Call To Action",
                        "visual": "Profile bookmark button illustration",
                        "content": "Save this carousel before building your next agent! Drop a 🔥 for the code template."
                    }
                ],
                "story_validation": {
                    "type": "question",
                    "prompt": "What's the hardest part of building AI agents for you right now?",
                    "options": None,
                    "sticker_preview": "Question: What's your #1 blocker with AI agents?"
                },
                "caption_draft": "Building an autonomous agent looks easy in a 30-second reel until you hit infinite recursion loops, silent hallucinations, and rate limits in production.\n\nSwipe through for the 3 production guardrails you must implement before launch. 👉\n\n🔖 Bookmark this post for your next project!\n\nDrop your questions below 👇",
                "hashtags": ["#generativeai", "#llm", "#pythondev", "#aiagents", "#codingtips", "#techcreator", "#softwaredeveloper"],
                "story_mention_caption": f"Created this carousel for {joined_users} who asked about production agent pitfalls! Check it out in the feed 💡",
                "why_now": "Directly answers recurring pain points around testing external LLMs and token burn.",
                "supporting_comment_ids": top_3_ids
            }
        ]

    elif "fastapi" in lower or "celery" in lower or "websocket" in lower:
        return [
            {
                "title": "FastAPI Background Tasks vs Celery: The Truth Nobody Tells You",
                "format": "reel",
                "hook": "Did you know FastAPI's built-in BackgroundTasks can silently freeze your entire server under heavy traffic?",
                "suggested_length": "60s",
                "on_screen_text": "Stop using FastAPI BackgroundTasks for heavy tasks ❌ | Use THIS instead 👇",
                "slide_outline": None,
                "story_validation": {
                    "type": "poll",
                    "prompt": "Handling slow backend tasks: what's your go-to?",
                    "options": ["FastAPI Tasks ⚡", "Celery + Redis 🐘"],
                    "sticker_preview": "Poll: FastAPI Tasks vs Celery + Redis"
                },
                "caption_draft": "FastAPI is blazing fast, but relying on built-in BackgroundTasks for heavy LLM inference, PDF generation, or email queues will silently stall your event loop.\n\nHere is how to properly plug in Redis & Celery with retry policies and monitoring.\n\n💬 Drop a 🔥 in the comments if you want the starter docker-compose template!\n\n#fastapi #python #backenddeveloper #systemdesign #devops",
                "hashtags": ["#fastapi", "#python", "#backend", "#systemdesign", "#webdev", "#coding", "#redis"],
                "story_mention_caption": f"You guys asked! {joined_users} here is the exact breakdown of FastAPI vs Celery 🚀",
                "why_now": "Commenters actively debated whether lightweight background tasks suffice vs spinning up Redis Celery workers.",
                "supporting_comment_ids": top_3_ids
            }
        ]

    elif "next.js" in lower or "auth" in lower or "cookie" in lower or "jwt" in lower:
        return [
            {
                "title": "Stop Storing JWTs in localStorage: The Next.js 15 Cookie Pattern",
                "format": "reel",
                "hook": "If your auth tokens are stored in localStorage, any third-party script can steal your user sessions in 5 seconds.",
                "suggested_length": "45s",
                "on_screen_text": "JWT in localStorage is a HUGE Security Risk ❌ | Do THIS instead 🔒",
                "slide_outline": None,
                "story_validation": {
                    "type": "poll",
                    "prompt": "Where do you currently store auth tokens in your React/Next.js apps?",
                    "options": ["localStorage ⚠️", "httpOnly Cookies 🔒"],
                    "sticker_preview": "Poll: localStorage vs httpOnly Cookies"
                },
                "caption_draft": "Security 101: Why httpOnly cookies with refresh token rotation is the ONLY safe way to handle authentication in Next.js App Router.\n\nHere is the exact middleware and Server Action pattern to handle token rotation seamlessly.\n\nBookmark this before building your next project! 🔖",
                "hashtags": ["#nextjs", "#reactjs", "#cybersecurity", "#webdevelopment", "#javascript", "#codinglife", "#frontend"],
                "story_mention_caption": f"Answering the most requested auth question from {joined_users} in today's reel! 🔒",
                "why_now": "Repeated confusion in comments about token invalidation on logout and server component cookie access.",
                "supporting_comment_ids": top_3_ids
            }
        ]

    elif "postgres" in lower or "database" in lower or "sql" in lower or "index" in lower:
        return [
            {
                "title": "Postgres Indexes Explained in 60 Seconds: B-Tree, Composite & pgvector",
                "format": "carousel",
                "hook": "Your database queries are slow not because of PostgreSQL, but because you missed this one index rule.",
                "suggested_length": None,
                "on_screen_text": None,
                "slide_outline": [
                    {
                        "slide_number": 1,
                        "title": "Cover Slide",
                        "visual": "High-contrast visual of a slow query timer (4200ms -> 3ms)",
                        "content": "Why your PostgreSQL database is running at 100% CPU (and how 1 index fixes it) 👉"
                    },
                    {
                        "slide_number": 2,
                        "title": "The Golden Composite Index Rule",
                        "visual": "Diagram illustrating column order (user_id, created_at)",
                        "content": "Index on (user_id, created_at) DOES NOT speed up queries that only filter by created_at! Order matters."
                    },
                    {
                        "slide_number": 3,
                        "title": "EXPLAIN ANALYZE in Practice",
                        "visual": "Terminal snippet highlighting Seq Scan vs Index Scan",
                        "content": "If you see 'Seq Scan' on a table with 100k+ rows, you are killing server memory."
                    },
                    {
                        "slide_number": 4,
                        "title": "B-Tree vs GIN Index",
                        "visual": "Side-by-side comparison table",
                        "content": "Use B-Tree for equality and range filters. Use GIN for JSONB and full-text search."
                    },
                    {
                        "slide_number": 5,
                        "title": "What about pgvector?",
                        "visual": "Vector embedding search visualization with HNSW graph",
                        "content": "For AI embeddings, build an HNSW index with cosine distance for sub-5ms semantic queries."
                    },
                    {
                        "slide_number": 6,
                        "title": "Save & Share",
                        "visual": "Bookmark prompt with clean developer tips recap",
                        "content": "Save this carousel for your next database migration or backend interview! 💡"
                    }
                ],
                "story_validation": {
                    "type": "poll",
                    "prompt": "Do you use EXPLAIN ANALYZE to optimize slow queries in your projects?",
                    "options": ["Yes, always! 🚀", "Never tried it 🤔"],
                    "sticker_preview": "Poll: Do you use EXPLAIN ANALYZE?"
                },
                "caption_draft": "Composite indexes: why (user_id, created_at) DOES NOT index queries that only filter by created_at!\n\nSwipe to understand index order, EXPLAIN ANALYZE, and when to use pgvector for AI semantic search. 👉\n\nSave this for your next tech interview! 💡",
                "hashtags": ["#postgresql", "#sql", "#database", "#backendengineer", "#systemdesign", "#softwareengineering"],
                "story_mention_caption": f"Database deep dive inspired by questions from {joined_users}! Check the new carousel 👉",
                "why_now": "Directly requested by developers confused about composite indexing and serverless connection pooling.",
                "supporting_comment_ids": top_3_ids
            }
        ]

    else:
        first_comment = top_comments[0].get("clean_text") or top_comments[0].get("text", "Developer tips")
        return [
            {
                "title": f"Mastering {cluster_name}: The Complete Developer Guide",
                "format": "reel",
                "hook": f"You guys asked this repeatedly in the comments: here is how to master {cluster_name.split()[-1]} like a senior engineer.",
                "suggested_length": "45s",
                "on_screen_text": f"How to master {cluster_name.split()[-1]} (What they don't teach in bootcamps)",
                "slide_outline": None,
                "story_validation": {
                    "type": "poll",
                    "prompt": f"Want a full practical video breakdown on {cluster_name}?",
                    "options": ["Yes, please! 🔥", "Already good 👍"],
                    "sticker_preview": f"Poll: Full video on {cluster_name}?"
                },
                "caption_draft": f"Breaking down the top community questions on {cluster_name}.\n\nInspired by your comments: \"{first_comment[:70]}...\"\n\nLet me know your thoughts below! 👇",
                "hashtags": ["#coding", "#tech", "#engineering", "#programming", "#developer", "#webdev"],
                "story_mention_caption": f"Answering questions from {joined_users} in today's post! Check it out ✨",
                "why_now": f"Consistent demand across {len(top_comments)} commenters with high engagement.",
                "supporting_comment_ids": top_3_ids
            }
        ]


def generate_ideas_for_clusters(scored_clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates actionable, Instagram-native content ideas for top clusters based ONLY
    on the cluster's actual comments.
    """
    all_ideas = []

    for cluster in scored_clusters:
        cluster_id = cluster["cluster_id"]
        cluster_name = cluster["name"]
        demand_score = cluster["demand_score"]
        comments = cluster.get("comments", [])
        
        if not comments:
            continue

        def comment_rank(c):
            i_score = 3 if c.get("intent") in ["request", "question", "pain_point"] else 1
            has_mention = 2 if c.get("has_share_mention") else 1
            return (i_score, has_mention, c.get("likes", 0), c.get("reply_count", 0))

        sorted_comments = sorted(comments, key=comment_rank, reverse=True)
        top_evidence = sorted_comments[:6]
        evidence_ids = [c["comment_id"] for c in top_evidence]

        evidence_prompt_list = [
            {
                "comment_id": c["comment_id"],
                "username": c["username"],
                "intent": c.get("intent"),
                "likes": c.get("likes"),
                "reply_count": c.get("reply_count", 0),
                "text": c.get("clean_text") or c.get("text")
            }
            for c in top_evidence
        ]

        def fallback_fn():
            ideas_list = heuristic_generate_ideas_for_cluster(
                cluster_id, cluster_name, sorted_comments, demand_score
            )
            return {"ideas": ideas_list}

        system_prompt = (
            "You are a top-tier creative director and viral Instagram strategist for tech creators. "
            "You generate actionable, Instagram-native content ideas grounded STRICTLY and EXCLUSIVELY in the provided audience comments. "
            "Do NOT invent ungrounded topics. Every idea must address the specific questions, pain points, or requests in the comments.\n\n"
            "EVERY generated idea must include:\n"
            "- title: Engaging title\n"
            "- format: 'reel' | 'carousel' | 'story'\n"
            "- for reels: hook (first 3s), suggested_length (e.g. '30s', '45s', '60s'), on_screen_text (bold first frame text overlay idea)\n"
            "- for carousels: slide_outline (5 to 8 detailed slides with slide_number, title, visual description, text)\n"
            "- for stories: story_validation (poll or question-sticker text to validate the idea with the audience)\n"
            "- caption_draft: Ready-to-post Instagram caption\n"
            "- hashtags: 5 to 8 targeted, relevant hashtags\n"
            "- story_mention_caption: Story shoutout caption tagging commenters\n"
            "- why_now: Explicit audience demand rationale\n"
            "- supporting_comment_ids: Top 2-3 exact comment IDs."
        )

        user_prompt = (
            f"Cluster Theme: {cluster_name}\n"
            f"Demand Score: {demand_score}/100\n"
            f"Audience Comments:\n"
            f"{json.dumps(evidence_prompt_list, indent=2)}\n\n"
            f"Generate 1 or 2 high-leverage Instagram-native content ideas grounded ONLY in these comments. Return strictly valid JSON."
        )

        try:
            parsed: ClusterIdeasResponse = llm_service.generate_structured(
                task_type="idea_generation",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=ClusterIdeasResponse,
                fallback_fn=fallback_fn
            )
            raw_ideas = [i.model_dump() for i in parsed.ideas]
        except Exception as e:
            logger.warning(f"LLM idea generation failed for cluster {cluster_id}: {e}")
            raw_ideas = heuristic_generate_ideas_for_cluster(
                cluster_id, cluster_name, sorted_comments, demand_score
            )

        for idea_item in raw_ideas:
            sup_ids = [cid for cid in idea_item.get("supporting_comment_ids", []) if cid in evidence_ids]
            if not sup_ids:
                sup_ids = evidence_ids[:3]

            idea_id = f"idea_{uuid.uuid4().hex[:10]}"
            all_ideas.append({
                "id": idea_id,
                "cluster_id": cluster_id,
                "cluster_name": cluster_name,
                "title": idea_item.get("title"),
                "format": (idea_item.get("format") or "reel").lower(),
                "hook": idea_item.get("hook"),
                "suggested_length": idea_item.get("suggested_length"),
                "on_screen_text": idea_item.get("on_screen_text"),
                "slide_outline": idea_item.get("slide_outline"),
                "story_validation": idea_item.get("story_validation"),
                "caption_draft": idea_item.get("caption_draft"),
                "hashtags": idea_item.get("hashtags", []),
                "story_mention_caption": idea_item.get("story_mention_caption"),
                "why_now": idea_item.get("why_now"),
                "demand_score": demand_score,
                "status": "new",
                "supporting_comment_ids": sup_ids[:3]
            })

    all_ideas.sort(key=lambda x: x["demand_score"], reverse=True)
    return all_ideas
