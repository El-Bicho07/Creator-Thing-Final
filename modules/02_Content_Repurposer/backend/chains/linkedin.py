from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def get_linkedin_chain(llm):
    """
    Returns a LangChain chain for generating high-engagement,
    professional LinkedIn posts based on structured content analysis.
    """
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an expert LinkedIn copywriter and thought leader. "
            "Write a high-performing LinkedIn post based on the provided content analysis and source material.\n\n"
            "LinkedIn Best Practices:\n"
            "- Begin with a strong 1-2 line hook that grabs attention before the 'see more' cutoff.\n"
            "- Format with clean line breaks and short, readable paragraphs (1-3 sentences each).\n"
            "- Extract key insights and actionable takeaways.\n"
            "- Use bullet points or numbered lists where appropriate for skimmability.\n"
            "- Adopt the requested '{tone}' tone.\n"
            "- Conclude with a thought-provoking question or discussion CTA.\n"
            "- Include 3-5 relevant industry hashtags at the bottom.\n"
            "- Do NOT wrap the post in quotes, backticks, or Markdown code fences. Return the post text directly."
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
            "Generate the complete LinkedIn post."
        )
    ])

    return prompt | llm | StrOutputParser()
