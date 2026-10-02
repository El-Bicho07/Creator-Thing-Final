from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def get_x_chain(llm):
    """
    Returns a LangChain chain for creating concise, high-impact posts
    or short threads for X (formerly Twitter).
    """
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an expert X (Twitter) ghostwriter and strategist. "
            "Craft high-impact X content based on the provided content analysis and source material.\n\n"
            "X Best Practices:\n"
            "- Start with a sharp, punchy hook that stops the scroll.\n"
            "- Maximize clarity and cut unnecessary filler.\n"
            "- If the core message fits cleanly into a single punchy post (under 280 characters), write a single post.\n"
            "- If the content contains multiple valuable points that require depth, create a concise numbered thread (e.g. 1/3, 2/3, 3/3).\n"
            "- Adopt the requested '{tone}' tone.\n"
            "- Limit to 1-2 relevant hashtags maximum (or none if natural).\n"
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
            "Generate the X post or thread."
        )
    ])

    return prompt | llm | StrOutputParser()
