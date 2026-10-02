"""Runs a specialist agent: a ReAct tool loop that ends by calling `submit_answer` with a typed result.

Groq rejects LangChain's built-in structured-output strategies when tools are bound (forced tool choice,
or JSON mode + tools), so the final schema is exposed as one more tool. If the model stops without
submitting — e.g. it hit the call limit — one JSON-schema call extracts the answer from its work so far.
"""

import logging
from collections.abc import Sequence

from langchain.agents import create_agent
from langchain.tools import ToolRuntime
from langchain_core.messages import AIMessage, ToolMessage
from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel

from agents.context import AgentContext
from agents.llm import as_app_error, chat_model, guardrails

log = logging.getLogger("agents")

FINISH = "\n\nWhen you are done, call `submit_answer` exactly once with your final result. Do not reply in plain text."


def _submit_tool(schema: type[BaseModel]) -> BaseTool:
    def submit_answer(runtime: ToolRuntime[AgentContext], **fields) -> str:
        runtime.context.scratch["submitted"] = schema.model_validate(fields)
        return "Submitted."

    return StructuredTool.from_function(
        submit_answer,
        name="submit_answer",
        description="Submit your final result. Call this once, at the end.",
        args_schema=schema,
        return_direct=True,  # ends the loop — no extra model call after submitting
    )


def _transcript(messages: list) -> str:
    out = []
    for m in messages[1:]:
        if isinstance(m, ToolMessage):
            out.append(f"[tool result]\n{str(m.content)[:3000]}")
        elif isinstance(m, AIMessage) and m.content:
            out.append(f"[you]\n{m.content}")
    return "\n\n".join(out)


_agents: dict[tuple, object] = {}


def run_specialist(
    *,
    name: str,
    system: str,
    tools: Sequence[BaseTool],
    schema: type[BaseModel],
    prompt: str,
    ctx: AgentContext,
    fast: bool = False,
    model_calls: int = 6,
    tool_calls: int = 8,
) -> BaseModel:
    key = (name, schema, fast, model_calls, tool_calls)
    if key not in _agents:
        _agents[key] = create_agent(
            chat_model(fast),
            [*tools, _submit_tool(schema)],
            system_prompt=system + FINISH,
            context_schema=AgentContext,
            middleware=guardrails(model_calls, tool_calls),
            checkpointer=False,  # stateless; the supervisor's thread holds the conversation
            name=name,
        )
    ctx.agent = name
    ctx.scratch.pop("submitted", None)
    try:
        result = _agents[key].invoke(
            {"messages": [{"role": "user", "content": prompt}]},
            context=ctx,
            # middleware hooks add graph steps per iteration; ModelCallLimitMiddleware is the real stop
            config={"recursion_limit": 8 * model_calls + 10},
        )
        if (submitted := ctx.scratch.get("submitted")) is not None:
            return submitted
        log.info("%s stopped without submitting — extracting the answer", name)
        ctx.step("finalise")
        extractor = chat_model(fast).with_structured_output(schema, method="json_schema")
        return extractor.invoke(
            [
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": f"{prompt}\n\nYour research so far:\n{_transcript(result['messages'])}\n\n"
                    "Now give the final result as JSON.",
                },
            ]
        )
    except Exception as e:  # noqa: BLE001 — re-raised as the app's LLM errors when it's a Groq failure
        err = as_app_error(e)
        if err is e:
            raise
        raise err from e
