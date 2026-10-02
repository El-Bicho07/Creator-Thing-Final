import pytest
from app.analysis.clip_analyzer import clean_json_response, parse_llm_clip_response

def test_clean_json_response():
    markdown_llm_output = """Here is your JSON response:
```json
{
  "clips": [
    {
      "title": "The $2 Million Mistake",
      "start_time": "00:42:15",
      "end_time": "00:43:08",
      "score": 91,
      "topic": "Business",
      "hook": "I lost $2 million because of one decision.",
      "reason": "Strong personal story.",
      "context_required": false
    }
  ]
}
```
Hope this helps!
"""
    cleaned = clean_json_response(markdown_llm_output)
    assert cleaned.startswith("{")
    assert cleaned.endswith("}")

def test_parse_llm_clip_response():
    raw_json = """{
  "clips": [
    {
      "title": "The $2 Million Mistake",
      "start_time": "00:42:15",
      "end_time": "00:43:08",
      "score": 91,
      "topic": "Business",
      "hook": "I lost $2 million because of one decision.",
      "reason": "Strong personal story.",
      "context_required": false
    }
  ]
}"""
    clips = parse_llm_clip_response(raw_json)
    assert len(clips) == 1
    assert clips[0].title == "The $2 Million Mistake"
    assert clips[0].score == 91
    assert clips[0].start_sec == 2535.0
    assert clips[0].end_sec == 2588.0
    assert clips[0].duration == 53.0
