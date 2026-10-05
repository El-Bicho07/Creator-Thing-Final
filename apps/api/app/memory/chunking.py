"""Text chunking for long-term memory.

Design note
-----------
Chunk boundaries are chosen on **token counts** from the EmbeddingService's
tokenizer, not characters or words, because E5 truncates at `max_seq_length`
(512). Chunking in characters would produce chunks that silently lose their
tails, and a silent tail loss corrupts retrieval quality in a way that is very
hard to detect later.

Paragraph boundaries are preferred over arbitrary token windows, so a chunk is
usually a coherent idea.
"""
from __future__ import annotations

import re
from typing import Callable, Sequence

_PARAGRAPH_SPLIT = re.compile(r"\n\s*\n")
_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
#: Leave headroom below E5's 512 so special tokens and prefix do not force a cut.
DEFAULT_TOKEN_LIMIT = 480


def _normalise(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _blocks(text: str) -> list[str]:
    """Paragraphs, further split into sentences when a paragraph is oversized."""
    blocks: list[str] = []
    for para in _PARAGRAPH_SPLIT.split(text):
        para = para.strip()
        if para:
            blocks.append(para)
    return blocks


def _split_long_block(block: str, token_counter: Callable[[str], int],
                     limit: int) -> list[str]:
    """Split an oversized block on sentence boundaries, then hard-wrap if needed."""
    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(block) if s.strip()]
    pieces: list[str] = []
    current = ""
    for sentence in sentences or [block]:
        candidate = f"{current} {sentence}".strip() if current else sentence
        if token_counter(candidate) <= limit or not current:
            current = candidate
        else:
            pieces.append(current)
            current = sentence
    if current:
        pieces.append(current)

    # A single sentence longer than the limit still has to be broken.
    out: list[str] = []
    for piece in pieces:
        if token_counter(piece) <= limit:
            out.append(piece)
            continue
        words = piece.split()
        window: list[str] = []
        for word in words:
            trial = " ".join([*window, word])
            if token_counter(trial) > limit and window:
                out.append(" ".join(window))
                window = [word]
            else:
                window.append(word)
        if window:
            out.append(" ".join(window))
    return out


def chunk_text(
    text: str,
    token_counter: Callable[[str], int] | None = None,
    *,
    target_tokens: int = 300,
    max_tokens: int = DEFAULT_TOKEN_LIMIT,
    overlap_tokens: int = 40,
) -> list[str]:
    """Split `text` into overlapping chunks bounded by token count.

    `token_counter` should be `EmbeddingService.token_length`. When omitted a
    whitespace approximation is used, which is only suitable for tests.
    """
    if token_counter is None:
        def token_counter(s: str) -> int:  # noqa: ANN001
            return max(1, len(s) // 4)

    cleaned = _normalise(text)
    if not cleaned:
        return []

    if token_counter(cleaned) <= max_tokens:
        return [cleaned]

    # ---- pass 1: group blocks up to the soft target ----
    chunks: list[str] = []
    current = ""
    for block in _blocks(cleaned):
        if token_counter(block) > max_tokens:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(_split_long_block(block, token_counter, max_tokens))
            continue
        candidate = f"{current}\n\n{block}".strip() if current else block
        if token_counter(candidate) <= target_tokens:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = block
    if current:
        chunks.append(current)

    # ---- pass 2: apply overlap so meaning spanning a boundary is retrievable ----
    if overlap_tokens <= 0 or len(chunks) < 2:
        return chunks

    overlapped: list[str] = []
    for index, chunk in enumerate(chunks):
        if index == 0:
            overlapped.append(chunk)
            continue
        previous = chunks[index - 1]
        tail: list[str] = []
        for sentence in reversed([s for s in _SENTENCE_SPLIT.split(previous) if s.strip()]):
            trial = " ".join([*tail, sentence]).strip()
            if token_counter(trial) > overlap_tokens:
                break
            tail.insert(0, sentence)
        prefix = " ".join(tail).strip()
        overlapped.append(f"{prefix}\n\n{chunk}".strip() if prefix else chunk)
    return overlapped