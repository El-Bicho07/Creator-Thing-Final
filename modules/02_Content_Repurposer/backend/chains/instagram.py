from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def get_instagram_chain(llm):
    """
    Returns a LangChain chain for crafting engaging Instagram captions
    tailored to the requested tone and based on content analysis.
    """
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an expert Instagram content creator and social media manager. "
            "Write a compelling Instagram caption based on the provided content analysis and source material.\n\n"
            "Instagram Best Practices:\n"
            "- Start with an eye-catching first line that immediately hooks the viewer.\n"
            "- Use clean formatting with spaced short paragraphs and strategic emojis to create visual rhythm.\n"
            "- Keep the voice conversational, relatable, and authentic to the requested '{tone}' tone.\n"
            "- Include an engaging call-to-action (e.g. 'Drop a comment', 'Save this for later', 'Share with a friend').\n"
            "- Add 5 to 10 relevant, targeted hashtags at the bottom.\n"
            "- Do NOT wrap the caption in quotes, backticks, or Markdown code fences. Return the caption text directly."
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
            "Generate the complete Instagram caption."
        )
    ])

    return prompt | llm | StrOutputParser()
