import pytest
from app.models.schemas import timestamp_to_seconds, seconds_to_timestamp

def test_timestamp_to_seconds():
    assert timestamp_to_seconds("00:42:15") == 2535.0
    assert timestamp_to_seconds("01:30") == 90.0
    assert timestamp_to_seconds("45") == 45.0
    assert timestamp_to_seconds("") == 0.0
    assert timestamp_to_seconds(None) == 0.0

def test_seconds_to_timestamp():
    assert seconds_to_timestamp(2535) == "00:42:15"
    assert seconds_to_timestamp(90) == "01:30"
    assert seconds_to_timestamp(0) == "00:00"
