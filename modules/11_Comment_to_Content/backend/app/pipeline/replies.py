import logging
import uuid
from typing import List, Dict, Any
from backend.app.schemas import ClusterRepliesResponse
from backend.app.services.llm import llm_service

logger = logging.getLogger(__name__)

def template_reply(username: str, comment_text: str, idea_title: str, format_type: str) -> str:
    clean_user = username if username.startswith("@") else f"@{username}"
    return (
        f"Hey {clean_user}! You asked about this in the comments — "
        f"I just dropped a full {format_type.lower()} breaking down \"{idea_title}\"! "
        f"Check it out on my profile and let me know if it helps! 🙌🚀"
    )

def draft_replies_for_ideas(
    ideas: List[Dict[str, Any]],
    comments_by_id: Dict[str, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Drafts friendly "You asked, I made it" replies addressed to the commenters
    whose requests inspired each idea.
    """
    all_replies = []

    for idea in ideas:
        idea_id = idea["id"]
        idea_title = idea["title"]
        idea_format = idea.get("format", "Reel")
        supporting_ids = idea.get("supporting_comment_ids", [])

        supporting_comments = [comments_by_id[cid] for cid in supporting_ids if cid in comments_by_id]
        if not supporting_comments:
            continue

        def fallback_fn():
            items = []
            for c in supporting_comments:
                items.append({
                    "comment_id": c["comment_id"],
                    "username": c["username"],
                    "reply_text": template_reply(
                        c["username"],
                        c.get("clean_text") or c.get("text", ""),
                        idea_title,
                        idea_format
                    )
                })
            return {"replies": items}

        system_prompt = (
            "You are a friendly, humble tech creator responding directly to followers on Instagram. "
            "Draft short, engaging, personalized 'You asked, I made it' replies for each commenter "
            "who inspired this new content. Keep it casual, friendly, and appreciative."
        )

        user_prompt = (
            f"Content Idea: {idea_title} ({idea_format})\n"
            f"Commenters who inspired it:\n"
            f"{[{'comment_id': c['comment_id'], 'username': c['username'], 'text': c.get('clean_text') or c.get('text')} for c in supporting_comments]}\n\n"
            f"Draft a warm, personalized reply for each commenter."
        )

        try:
            parsed: ClusterRepliesResponse = llm_service.generate_structured(
                task_type="reply_drafting",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=ClusterRepliesResponse,
                fallback_fn=fallback_fn
            )
            raw_replies = [r.model_dump() for r in parsed.replies]
        except Exception as e:
            logger.warning(f"Reply generation failed for idea {idea_id}: {e}")
            raw_replies = fallback_fn()["replies"]

        for rep in raw_replies:
            all_replies.append({
                "id": f"rep_{uuid.uuid4().hex[:10]}",
                "idea_id": idea_id,
                "comment_id": rep.get("comment_id"),
                "username": rep.get("username"),
                "reply_text": rep.get("reply_text")
            })

    return all_replies
