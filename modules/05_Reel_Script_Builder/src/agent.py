import os
import json
import re
from langsmith import traceable


class ReelScriptAgent:
    """
    Agentic Reel Script Builder.
    Uses LangChain + LangSmith for traced LLM calls.
    Falls back to a local generator when no API key is set.
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        self.llm = None
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-3.8-flash",
                    google_api_key=api_key,
                    temperature=0.7,
                )
            except Exception:
                self.llm = None

    @traceable(name="reel-script-generation", run_type="chain", metadata={"content_type": "reel script"})
    def generate_script(self, topic, tone="engaging", duration="30-60"):
        """
        Run the agent loop:
        1. Analyze the request
        2. Plan the script structure
        3. Call the LLM via LangChain (traced by LangSmith)
        4. Parse and return structured output
        """
        thoughts = []

        # Step 1 - Analyze
        thoughts.append(f"Received request: topic='{topic}', tone='{tone}', duration='{duration}s'")
        thoughts.append("Analyzing topic for content angles and audience fit...")

        # Step 2 - Plan
        thoughts.append("Planning script structure: Hook (0-5s) / Body (5-50s) / CTA (50-60s)")
        thoughts.append(f"Selecting tone profile: {tone}")

        # Step 3 - Generate
        if self.llm:
            thoughts.append("Calling Gemini via LangChain (traced by LangSmith)...")
            try:
                result = self._call_llm(topic, tone, duration)
                thoughts.append("LLM response received. Parsing structured output...")
                return {"agent": "reel_script_agent", "thoughts": thoughts, "result": result}
            except Exception as e:
                thoughts.append(f"LLM call failed: {e}")
                thoughts.append("Falling back to local template generator.")
                result = self._local_fallback(topic, tone)
                return {"agent": "reel_script_agent", "thoughts": thoughts, "result": result}
        else:
            thoughts.append("No API key configured. Using local template generator.")
            result = self._local_fallback(topic, tone)
            return {"agent": "reel_script_agent", "thoughts": thoughts, "result": result}

    @traceable(name="call_gemini", run_type="llm")
    def _call_llm(self, topic, tone, duration):
        prompt = (
            f"You are a short-form video scriptwriter. "
            f"Write a {duration} second reel script about: {topic}. "
            f"Tone: {tone}. "
            f"Return ONLY a JSON object with exactly three keys: "
            f'"hook" (the opening 3-5 seconds to grab attention), '
            f'"body" (the main content, 20-40 seconds, delivering clear value), '
            f'"cta" (a closing call to action, 5-10 seconds). '
            f"No markdown. No explanation. Just the JSON object."
        )
        response = self.llm.invoke(prompt)
        text = response.content.strip()

        # Try to extract JSON from the response
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)

    @traceable(name="local_fallback", run_type="tool")
    def _local_fallback(self, topic, tone):
        hooks = {
            "engaging": f"Wait -- you have been doing {topic} wrong this entire time.",
            "educational": f"Here is a breakdown of {topic} that most people miss.",
            "storytelling": f"I spent 6 months studying {topic}. Here is what I found.",
            "funny": f"POV: You just discovered {topic} for the first time.",
            "controversial": f"Unpopular opinion: everything you know about {topic} is backwards.",
        }
        bodies = {
            "engaging": f"There are three things that separate beginners from experts in {topic}. First, experts focus on fundamentals before anything flashy. Second, they track their progress weekly, not daily. Third, they build systems instead of relying on motivation. This alone changed my results completely.",
            "educational": f"Let me walk you through {topic} step by step. The core concept is simpler than it looks. Start with the foundation -- understand why it matters, not just how it works. Then layer on the practical details. Most tutorials skip the 'why' and that is exactly where people get stuck.",
            "storytelling": f"When I first tried {topic}, I failed. Badly. I almost gave up. But then I found one small shift that changed everything. Instead of trying to be perfect, I focused on being consistent. That single change took me from stuck to making real progress every single week.",
            "funny": f"So apparently {topic} is a whole thing. Like, people dedicate their lives to this. And here I am, just finding out about it from a reel. But honestly? After diving in, I get it. It is actually fascinating once you stop pretending you already know everything.",
            "controversial": f"Everyone says {topic} works one way. But the data says otherwise. The popular advice is outdated and most creators are just repeating what they heard without testing it. I actually ran the numbers and the results were the opposite of what you would expect.",
        }
        ctas = {
            "engaging": "Follow for more breakdowns like this. Save it. Share it with someone who needs to hear it.",
            "educational": "Drop a comment if you want a deeper dive. Follow for more clear explanations.",
            "storytelling": "If this resonated, share it with someone on the same path. Follow for the full story.",
            "funny": "Like this if you felt personally attacked. Follow for more of whatever this was.",
            "controversial": "Agree or disagree? Tell me in the comments. Follow if you want takes that actually hold up.",
        }
        return {
            "hook": hooks.get(tone, hooks["engaging"]),
            "body": bodies.get(tone, bodies["engaging"]),
            "cta": ctas.get(tone, ctas["engaging"]),
        }
