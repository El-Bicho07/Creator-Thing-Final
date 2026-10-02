from langchain_core.prompts import ChatPromptTemplate
from schemas.models import YouTubeOutput

def get_youtube_chain(llm):
    """
    Returns a LangChain chain for designing a complete YouTube video concept
    (title, description, tags, outline) with structured output.
    """
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a top YouTube content producer, strategist, and script consultant. "
            "Transform the provided content analysis and source material into an optimized YouTube video package in a {tone} tone.\n\n"
            "Requirements:\n"
            "- title: Highly clickable, intriguing, yet accurate video title.\n"
            "- description: Well-written, comprehensive YouTube description summarizing key takeaways and timestamps/sections.\n"
            "- tags: 5 to 10 relevant SEO video discovery tags as a list of strings.\n"
            "- outline: Clear, actionable step-by-step video outline (Intro / Hook, Core Points, Examples, Conclusion & Call-to-Action)."
        ),
        (
            "user",
            "Source Content:\n\"\"\"\n{content}\n\"\"\"\n\n"
            "Editorial Analysis:\n"
            "- Topic: {topic}\n"
            "- Target Audience: {target_audience}\n"
            "- Core Message: {core_message}\n"
            "- Key Points:\n{key_points}\n"
            "- Call to Action: {call_to_action}\n"
            "- Requested Tone: {tone}\n\n"
            "Produce the structured YouTube video package."
        )
    ])

    return prompt | llm.with_structured_output(YouTubeOutput)
