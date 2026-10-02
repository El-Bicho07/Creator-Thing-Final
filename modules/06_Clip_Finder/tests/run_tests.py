import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from app.models.schemas import timestamp_to_seconds, seconds_to_timestamp, ClipCandidate
from app.analysis.clip_analyzer import clean_json_response, parse_llm_clip_response

def run_all_tests():
    print("Running tests...")

    # Test 1: timestamp parsing
    assert timestamp_to_seconds("00:42:15") == 2535.0, "Timestamp parsing failed"
    assert seconds_to_timestamp(2535) == "00:42:15", "Seconds formatting failed"
    print("✓ Timestamp parser tests passed.")

    # Test 2: Clip candidate
    clip = ClipCandidate(
        title="Test Clip",
        start_time="00:01:00",
        end_time="00:01:45",
        start_sec=60.0,
        end_sec=105.0,
        duration=45.0,
        score=92,
        topic="Tech",
        hook="Hook here",
        reason="Good reason"
    )
    assert clip.score == 92
    assert clip.duration == 45.0
    print("✓ Clip candidate validation tests passed.")

    # Test 3: LLM JSON cleaning & parsing
    dirty_json = "```json\n{\"clips\": [{\"title\": \"Sample\", \"start_time\": \"00:00:10\", \"end_time\": \"00:00:40\", \"score\": 85}]}\n```"
    cleaned = clean_json_response(dirty_json)
    parsed = parse_llm_clip_response(cleaned)
    assert len(parsed) == 1
    assert parsed[0].title == "Sample"
    assert parsed[0].start_sec == 10.0
    assert parsed[0].end_sec == 40.0
    print("✓ LLM JSON parser tests passed.")

    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_all_tests()
