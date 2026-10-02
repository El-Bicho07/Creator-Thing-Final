"""Run the Brain for one chat turn and turn LangGraph's stream into UI events; read threads back."""

import logging
import queue
import threading
from collections.abc import Iterator

from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage, RemoveMessage, ToolMessage

from agents.context import AgentContext
from agents.llm import as_app_error
from agents.supervisor import brain, checkpointer
from ai.llm import LLMConfigError, LLMError

log = logging.getLogger("agents.chat")

_DONE = object()


def _text(content) -> str:
    if isinstance(content, str):
        return content
    return "".join(p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text")


def _config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}, "recursion_limit": 30}


def stream_chat(channel_id: str, thread_id: str, message: str) -> Iterator[dict]:
    """Yield events: step (an agent is working), token (reply text), card (a specialist's result),
    final (the complete reply) or error. The graph runs on its own thread; events cross via a queue."""
    events: queue.Queue = queue.Queue()

    def run() -> None:
        try:
            graph = brain()
            for mode, payload in graph.stream(
                {"messages": [HumanMessage(message)]},
                config=_config(thread_id),
                context=AgentContext(channel_id, agent="brain"),
                stream_mode=["messages", "custom"],
            ):
                if mode == "custom":
                    events.put(payload)
                    continue
                chunk, meta = payload
                # only the Brain's own reply tokens — specialists' LLM calls stream through here too
                if (
                    isinstance(chunk, AIMessageChunk)
                    and meta.get("lc_agent_name") == "brain"
                    and meta.get("langgraph_node") == "model"
                    and (text := _text(chunk.content))
                ):
                    events.put({"type": "token", "text": text})
            last = graph.get_state(_config(thread_id)).values["messages"][-1]
            events.put({"type": "final", "thread_id": thread_id, "message": _text(last.content)})
        except Exception as e:  # noqa: BLE001 — reported to the client as an error event
            err = as_app_error(e)
            if not isinstance(err, (LLMConfigError, LLMError)):
                log.exception("chat turn failed")
            events.put({"type": "error", "message": str(err) or err.__class__.__name__})
        finally:
            events.put(_DONE)

    threading.Thread(target=run, daemon=True, name=f"brain-{thread_id[:8]}").start()
    while (event := events.get()) is not _DONE:
        yield event


def history(thread_id: str) -> list[dict]:
    """The thread as the UI shows it: user and assistant turns, each assistant turn with its cards and steps."""
    state = brain().get_state(_config(thread_id))
    messages = state.values.get("messages", []) if state and state.values else []
    turns: list[dict] = []
    cards: list[dict] = []
    steps: list[dict] = []
    for m in messages:
        if isinstance(m, RemoveMessage):
            continue
        if isinstance(m, HumanMessage):
            if m.additional_kwargs.get("lc_source") == "summarization":
                continue
            turns.append({"role": "user", "content": _text(m.content)})
            cards, steps = [], []
        elif isinstance(m, ToolMessage):
            if m.artifact:
                cards.append(m.artifact)
        elif isinstance(m, AIMessage):
            for call in m.tool_calls:
                args = call.get("args", {})
                detail = next((str(v) for v in args.values() if isinstance(v, str)), "")
                steps.append({"agent": "brain", "tool": call["name"].removeprefix("ask_"), "detail": detail[:200]})
            if not m.tool_calls and (text := _text(m.content)):
                turns.append({"role": "assistant", "content": text, "cards": cards, "steps": steps})
                cards, steps = [], []
    return turns


def delete_thread(thread_id: str) -> None:
    checkpointer().delete_thread(thread_id)
