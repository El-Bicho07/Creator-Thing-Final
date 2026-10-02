from langchain_core.prompts import ChatPromptTemplate
from schemas.models import ContentAnalysis

def get_content_analysis_chain(llm):
    """
    Returns a LangChain chain that analyzes the original source content
    and extracts core topics, audience, key points, and messaging
    using structured output.
    """
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are an expert editorial strategist and social media content analyst. "
            "Your job is to thoroughly analyze the user's source content to prepare it for "
            "repurposing across social platforms in a {tone} tone.\n\n"
            "CRITICAL RULES:\n"
            "1. Strictly preserve all facts, numbers, and data points from the original content.\n"
            "2. Do NOT invent claims, features, or facts not present in the original text.\n"
            "3. Identify the core message, target audience, and primary takeaways."
        ),
        (
            "user",
            "Original Content:\n\"\"\"\n{content}\n\"\"\"\n\n"
            "Target Tone: {tone}\n\n"
            "Analyze the content and provide the structured breakdown."
        )
    ])
    
    return prompt | llm.with_structured_output(ContentAnalysis)
