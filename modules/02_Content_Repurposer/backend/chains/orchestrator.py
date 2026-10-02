import asyncio
import re
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI

from schemas.models import ContentAnalysis, YouTubeOutput
from chains.content_analysis import get_content_analysis_chain
from chains.linkedin import get_linkedin_chain
from chains.instagram import get_instagram_chain
from chains.x import get_x_chain
from chains.youtube import get_youtube_chain

def clean_text_output(text: str) -> str:
    """
    Cleans unexpected markdown code block wrappers or leading/trailing formatting
    that may occasionally be added by LLMs.
    """
    if not isinstance(text, str):
        return str(text)
    
    cleaned = text.strip()
    # Strip markdown code blocks if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned)
    
    return cleaned.strip()

def validate_youtube_output(raw_output: Any) -> Dict[str, Any]:
    """
    Validates and normalizes YouTube structured output to ensure compatibility
    with frontend expectations: {title: str, description: str, tags: list, outline: str}.
    """
    if isinstance(raw_output, YouTubeOutput):
        data = raw_output.model_dump()
    elif isinstance(raw_output, dict):
        data = raw_output
    else:
        data = {}

    title = str(data.get("title") or "Untitled Video").strip()
    description = str(data.get("description") or "").strip()
    
    tags_raw = data.get("tags") or []
    if isinstance(tags_raw, list):
        tags = [str(t).strip() for t in tags_raw if str(t).strip()]
    elif isinstance(tags_raw, str):
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
    else:
        tags = []

    outline_raw = data.get("outline") or ""
    if isinstance(outline_raw, list):
        outline = "\n".join(str(o).strip() for o in outline_raw if str(o).strip())
    else:
        outline = str(outline_raw).strip()

    return {
        "title": title,
        "description": description,
        "tags": tags,
        "outline": outline
    }

async def repurpose_content(
    content: str,
    platforms: List[str],
    tone: str,
    api_key: str
) -> Dict[str, Any]:
    """
    Orchestrates the LangChain generation pipeline:
    1. Content Analysis Chain: Extracts core topic, audience, and key takeaways using structured output.
    2. Platform-Specific Chains: Runs dedicated LangChain chains only for the user-selected platforms.
    3. Output Validation: Ensures all outputs match the schema expected by the frontend.
    """
    # Initialize the LangChain Google GenAI model layer
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.1-flash-lite",
        google_api_key=api_key,
        max_retries=3,
        temperature=0.7
    )

    # 1. Content Analysis Chain
    analysis_chain = get_content_analysis_chain(llm)
    analysis_raw = await analysis_chain.ainvoke({
        "content": content,
        "tone": tone
    })

    if isinstance(analysis_raw, ContentAnalysis):
        analysis = analysis_raw
    else:
        analysis = ContentAnalysis(
            topic="General Topic",
            target_audience="General Audience",
            content_type="Insight",
            key_points=[content[:100]],
            core_message=content[:100],
            call_to_action="Learn more"
        )

    formatted_key_points = "\n".join(f"- {kp}" for kp in analysis.key_points)
    
    chain_input = {
        "content": content,
        "topic": analysis.topic,
        "target_audience": analysis.target_audience,
        "core_message": analysis.core_message,
        "key_points": formatted_key_points,
        "call_to_action": analysis.call_to_action,
        "tone": tone
    }

    # 2. Execute ONLY the selected platform chains
    selected_set = set(platforms)
    tasks = {}

    if "linkedin" in selected_set:
        tasks["linkedin"] = get_linkedin_chain(llm).ainvoke(chain_input)
    
    if "instagram" in selected_set:
        tasks["instagram"] = get_instagram_chain(llm).ainvoke(chain_input)

    if "x" in selected_set:
        tasks["x"] = get_x_chain(llm).ainvoke(chain_input)

    if "youtube" in selected_set:
        tasks["youtube"] = get_youtube_chain(llm).ainvoke(chain_input)

    # Run platform chains concurrently
    task_keys = list(tasks.keys())
    task_coroutines = [tasks[k] for k in task_keys]
    results_list = await asyncio.gather(*task_coroutines)

    raw_results = dict(zip(task_keys, results_list))

    # 3. Output Validation & Formatting
    final_results: Dict[str, Any] = {}

    for platform in task_keys:
        val = raw_results[platform]
        if platform == "youtube":
            final_results["youtube"] = validate_youtube_output(val)
        else:
            final_results[platform] = clean_text_output(val)

    return final_results
