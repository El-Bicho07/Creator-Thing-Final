import os
import sys
import subprocess
import time
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(root_dir))

from app.config import UPLOADS_DIR, CLIPS_DIR
from app.db import init_db, get_connection, get_all_processed_videos, get_clips_for_video
from app.video.ffmpeg_service import get_video_duration, extract_audio, cut_clip
from app.transcription.whisper_service import transcribe_media, format_timestamped_transcript
from app.analysis.ollama_service import check_ollama_status
from app.analysis.clip_analyzer import analyze_transcript_for_clips
from app.server import get_best_available_model, run_pipeline, JOBS

def create_sample_video() -> str:
    """Generate a realistic spoken video about business & startups using macOS say & ffmpeg."""
    sample_mp4 = str(UPLOADS_DIR / "founder_interview.mp4")
    temp_aiff = str(UPLOADS_DIR / "speech.aiff")
    temp_wav = str(UPLOADS_DIR / "speech.wav")

    # If sample already exists, return it
    if os.path.exists(sample_mp4) and os.path.getsize(sample_mp4) > 10000:
        return sample_mp4

    print("🎙️ Generating realistic spoken audio using speech synthesis...")
    script_text = (
        "The biggest mistake I made in my entire career was hiring too quickly. "
        "In 2018, I started my first technology company with zero employees and a big vision. "
        "We raised two million dollars from venture capital, and we thought we needed to expand overnight. "
        "Instead of focusing on our core product, we hired thirty people in just three months. "
        "Our burn rate went through the roof, and within six months we almost went completely bankrupt. "
        "The truth is, building a resilient startup means keeping your team lean. "
        "Hire slowly, fire fast, and talk directly to your customers every single day."
    )

    # Use macOS say command to create clear spoken speech
    subprocess.run(["say", "-v", "Daniel", "-r", "160", "-o", temp_aiff, script_text], check=True)

    # Convert to 16kHz mono WAV
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", temp_aiff, "-ar", "16000", "-ac", "1", temp_wav], check=True)

    # Get audio duration
    dur = get_video_duration(temp_wav)
    print(f"🔊 Audio synthesized: {dur:.1f} seconds.")

    # Mux audio with dynamic animated visual pattern into MP4 video
    print("🎬 Muxing into 1080p video with FFmpeg...")
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-f", "lavfi", "-i", f"testsrc=size=1920x1080:rate=30:duration={dur:.2f}",
        "-i", temp_wav,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-shortest",
        "-c:a", "aac", "-b:a", "128k",
        sample_mp4
    ]

    subprocess.run(cmd, check=True)

    # Clean up temp audio files
    if os.path.exists(temp_aiff): os.unlink(temp_aiff)
    if os.path.exists(temp_wav): os.unlink(temp_wav)

    print(f"✅ Video ready: {sample_mp4} ({get_video_duration(sample_mp4):.1f}s)")
    return sample_mp4

def run_end_to_end_execution():
    print("\n" + "="*70)
    print("🚀 EXECUTING AI LONG-FORM VIDEO TO SHORTS PIPELINE")
    print("="*70 + "\n")

    # Step 1: Ensure SQLite DB is initialized
    init_db()

    # Step 2: Create sample video
    video_path = create_sample_video()
    video_dur = get_video_duration(video_path)

    # Step 3: Run pipeline
    job_id = "test_run_01"
    JOBS[job_id] = {"stage": 0, "result": None, "error": None, "video_path": video_path}

    print("\n--- STAGE 1: Audio Demuxing & Speech-to-Text Transcription ---")
    active_model = get_best_available_model()
    print(f"🤖 Active Local LLM Model detected: {active_model}")
    print("⏳ Running pipeline (Transcribe ➔ Understand ➔ Score ➔ Rank ➔ Persist)...")

    run_pipeline(job_id=job_id, video_path=video_path, top=4)

    job = JOBS[job_id]
    if job.get("error"):
        print(f"❌ Error encountered in pipeline: {job['error']}")
        return

    clips = job.get("result", [])
    print(f"\n🎉 Successfully discovered & ranked {len(clips)} Short-form Moments!\n")

    # Step 4: Render first clip as 9:16 vertical Short with FFmpeg
    if clips:
        best_clip = clips[0]
        out_clip_path = str(CLIPS_DIR / f"rendered_short_01_{job_id}_916.mp4")
        print(f"✂️ Rendering Top Pick as 9:16 Vertical Short with FFmpeg...")
        cut_clip(
            video_path=video_path,
            start_sec=best_clip["start_sec"],
            end_sec=best_clip["end_sec"],
            output_clip_path=out_clip_path,
            vertical_crop=True
        )
        print(f"✅ Rendered 9:16 Short: {out_clip_path} ({os.path.getsize(out_clip_path)} bytes)")

    # Step 5: Verify SQLite Persistence
    print("\n--- STAGE 2: SQLite Persistence Verification ---")
    db_videos = get_all_processed_videos()
    print(f"📁 Videos saved in SQLite: {len(db_videos)}")
    for v in db_videos:
        print(f"   • Video ID: {v['id']} | File: {v['filename']} | Duration: {v['duration']:.1f}s | Clips count: {v['clip_count']}")

    db_clips = get_clips_for_video(job_id)
    print(f"\n📊 Retrieved {len(db_clips)} clips from SQLite database for video '{job_id}':\n")
    for c in db_clips:
        print(f"  #{c['rank_num']} [{c['start_time']} -> {c['end_time']}] Score: {c['score']}/100")
        print(f"     Title: {c['title']}")
        print(f"     Hook:  \"{c['hook']}\"")
        print(f"     Topic: {c['topic']} | Context Required: {c['context_required']}")
        print(f"     Reason: {c['reason']}")
        print(f"     Breakdown: {c['breakdown']}\n")

    print("="*70)
    print("✅ END-TO-END PIPELINE EXECUTION COMPLETED SUCCESSFULLY!")
    print("="*70)

if __name__ == "__main__":
    run_end_to_end_execution()
