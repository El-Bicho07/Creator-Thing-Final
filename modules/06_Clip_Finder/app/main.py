import os
import sys
from pathlib import Path

# Ensure project root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import streamlit as st
import app.premium_ui as ui
from app.config import UPLOADS_DIR, CLIPS_DIR, OLLAMA_MODEL, WHISPER_MODEL
from app.video.ffmpeg_service import check_ffmpeg_installed, get_video_duration, extract_audio, cut_clip
from app.transcription.whisper_service import transcribe_media, format_timestamped_transcript
from app.analysis.ollama_service import check_ollama_status
from app.analysis.clip_analyzer import analyze_transcript_for_clips
from app.models.schemas import seconds_to_timestamp, ClipCandidate
from app.db import get_all_processed_videos, get_clips_for_video, get_video, save_video_metadata, save_transcripts, save_clips
from app.video.youtube_service import is_youtube_url, download_youtube_video
import uuid


# Page Configuration
st.set_page_config(page_title="AI Clip Finder", page_icon="🎬", layout="wide")
ui.inject_css()

def main():
    st.markdown("""
        <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 14px 20px; border-radius: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 14px rgba(217, 119, 6, 0.3);">
            <div>
                <strong>⚛️ New Apple + Atomic Habits HTML Interface Live:</strong> Experience the smooth HTML/CSS interface at 
                <a href="http://localhost:8008" target="_blank" style="color: white; font-weight: 700; text-decoration: underline; margin-left: 6px;">http://localhost:8008</a>
            </div>
            <a href="http://localhost:8008" target="_blank" style="background: white; color: #D97706; padding: 6px 16px; border-radius: 99px; text-decoration: none; font-weight: 700; font-size: 13px;">Open HTML UI ›</a>
        </div>
    """, unsafe_allow_html=True)
    # --- Sidebar Configuration ---
    with st.sidebar:
        st.markdown("## ⚙️ Settings")
        whisper_model = st.selectbox(
            "Whisper Speech-to-Text Model",
            ["tiny", "base", "small", "medium"],
            index=2,
            help="Smaller runs faster; larger is more accurate."
        )

        # Detect installed Ollama models
        ollama_ok_probe, available_models, _ = check_ollama_status()
        if available_models:
            default_idx = 0
            for i, m in enumerate(available_models):
                if OLLAMA_MODEL in m:
                    default_idx = i
                    break
            ollama_model_name = st.selectbox(
                "Ollama LLM Model",
                options=available_models + ["Custom..."],
                index=default_idx,
                help="Select one of your installed local models"
            )
            if ollama_model_name == "Custom...":
                ollama_model_name = st.text_input("Custom Model Name", value=OLLAMA_MODEL)
        else:
            ollama_model_name = st.text_input("Ollama LLM Model", value=OLLAMA_MODEL)

        vertical_crop = st.checkbox("Crop to 9:16 vertical (Shorts/Reels)", value=True)
        max_clips = st.slider("Max recommended clips", 1, 12, 6)

        # Saved analyses from SQLite
        db_videos = get_all_processed_videos()
        if db_videos:
            st.markdown("---")
            st.markdown("## 📁 Saved Analyses")
            video_options = {f"🎬 {v['filename']} ({v['clip_count']} clips)": v['id'] for v in db_videos}
            selected_label = st.selectbox("Select saved run", ["-- Choose video --"] + list(video_options.keys()))
            if selected_label != "-- Choose video --":
                vid_id = video_options[selected_label]
                if st.button("📂 Load Selected Run", use_container_width=True):
                    db_clips_raw = get_clips_for_video(vid_id)
                    vid_info = get_video(vid_id)
                    st.session_state["clips"] = [
                        ClipCandidate(
                            title=c["title"],
                            start_time=c["start_time"],
                            end_time=c["end_time"],
                            start_sec=c["start_sec"],
                            end_sec=c["end_sec"],
                            duration=c["duration"],
                            score=c["score"],
                            topic=c.get("topic", "General"),
                            hook=c.get("hook", ""),
                            reason=c.get("reason", ""),
                            context_required=bool(c.get("context_required", False)),
                            breakdown=c.get("breakdown", {})
                        )
                        for c in db_clips_raw
                    ]
                    st.session_state["video_path"] = vid_info["file_path"] if vid_info else ""
                    st.session_state["video_duration"] = vid_info["duration"] if vid_info else 0.0
                    st.session_state["pipeline_step"] = 3
                    st.rerun()

    # --- Header & Diagnostics ---
    ui.hero(
        "AI Clip Finder",
        "Drop in a long video. Get ranked, self-contained Shorts moments with titles and reasons."
    )


    # Check FFmpeg & Ollama statuses
    ffmpeg_ok, ffmpeg_msg = check_ffmpeg_installed()
    ollama_ok, _, ollama_msg = check_ollama_status(target_model=ollama_model_name)

    # Form status pills
    status_items = []
    if ffmpeg_ok:
        ver = ffmpeg_msg.split()[2] if len(ffmpeg_msg.split()) > 2 else "installed"
        status_items.append(("FFmpeg", "ok", f"v{ver}"))
    else:
        status_items.append(("FFmpeg", "bad", "not found"))

    if ollama_ok and "ready at" in ollama_msg.lower():
        status_items.append(("Ollama", "ok", f"active · {ollama_model_name}"))
    elif ollama_ok:
        status_items.append(("Ollama", "warn", f"fallback mode · {ollama_model_name} missing"))
    else:
        status_items.append(("Ollama", "bad", "offline"))

    ui.status_row(status_items)

    # Determine current pipeline step
    current_step = 0
    if "pipeline_step" in st.session_state:
        current_step = st.session_state["pipeline_step"]
    elif "clips" in st.session_state and st.session_state["clips"]:
        current_step = 3

    ui.stepper(current_step)

    # Setup guidance if Ollama model is missing
    if not ollama_ok or "ready at" not in ollama_msg.lower():
        with st.expander("ℹ️ How to set up Ollama locally (Free AI Inference)"):
            st.markdown(f"""
            1. **Install Ollama:** Download from [ollama.com](https://ollama.com)
            2. **Start Server:** Run `ollama serve` in your terminal
            3. **Pull Model:** Run `ollama pull {ollama_model_name}` (or choose an installed model in the sidebar)
            4. *Note: If Ollama is offline or model is missing, the app automatically falls back to heuristic boundary analysis.*
            """)

    # --- Video Input Section ---
    st.markdown("## Video Input")
    tab_upload, tab_yt = st.tabs(["📁 Upload Video File", "▶️ Paste YouTube Link"])

    video_path_to_process = None
    display_title = None

    with tab_upload:
        uploaded_file = st.file_uploader(
            "Choose a long-form video",
            type=["mp4", "mov", "mkv", "webm"],
            label_visibility="collapsed"
        )
        if uploaded_file is not None:
            saved_path = str(UPLOADS_DIR / uploaded_file.name)
            with open(saved_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            video_path_to_process = saved_path
            display_title = uploaded_file.name

    with tab_yt:
        yt_input_url = st.text_input(
            "Paste YouTube Video Link",
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/...",
            help="Downloads full audio/video stream using yt-dlp"
        )
        if st.button("📥 Download YouTube Video", use_container_width=True):
            if not is_youtube_url(yt_input_url):
                st.error("Please enter a valid YouTube video URL.")
            else:
                with st.spinner("Downloading YouTube video with yt-dlp..."):
                    try:
                        dl_path, dl_title, dl_dur = download_youtube_video(yt_input_url)
                        st.session_state["pending_video_path"] = dl_path
                        st.session_state["pending_title"] = dl_title
                        st.success(f"Downloaded: {dl_title}")
                    except Exception as yt_err:
                        st.error(f"Download failed: {yt_err}")

        if "pending_video_path" in st.session_state and os.path.exists(st.session_state["pending_video_path"]):
            video_path_to_process = st.session_state["pending_video_path"]
            display_title = st.session_state.get("pending_title", Path(video_path_to_process).name)

    if video_path_to_process:
        video_duration = get_video_duration(video_path_to_process)

        col_v1, col_v2 = st.columns([1, 2])
        with col_v1:
            st.video(video_path_to_process)
        with col_v2:
            st.markdown(f"**Title:** `{display_title}`")
            st.markdown(f"**Duration:** `{seconds_to_timestamp(video_duration)}` ({round(video_duration, 1)}s)")
            st.markdown(f"**Path:** `{Path(video_path_to_process).name}`")

            if st.button("🚀 Transform Video to Shorts", type="primary", use_container_width=True):
                # Step 1: Transcribe
                st.session_state["pipeline_step"] = 1
                with st.spinner("Extracting audio and transcribing with faster-whisper..."):
                    audio_path = str(UPLOADS_DIR / f"{Path(video_path_to_process).stem}.wav")
                    extract_audio(video_path_to_process, audio_path)
                    segments = transcribe_media(audio_path, model_size=whisper_model)
                    formatted_transcript = format_timestamped_transcript(segments)

                # Step 2: Analyze
                st.session_state["pipeline_step"] = 2
                with st.spinner(f"Finding viral shorts with {ollama_model_name}..."):
                    clips = analyze_transcript_for_clips(
                        segments,
                        formatted_transcript,
                        model_name=ollama_model_name
                    )
                    clips = clips[:max_clips]

                # Persist to SQLite
                job_uuid = uuid.uuid4().hex[:12]
                try:
                    save_video_metadata(job_uuid, display_title, video_duration, video_path_to_process)
                    save_transcripts(job_uuid, segments)
                    save_clips(job_uuid, clips)
                except Exception:
                    pass

                # Step 3: Finished
                st.session_state["pipeline_step"] = 3
                st.session_state["clips"] = clips
                st.session_state["transcript_segments"] = segments
                st.session_state["video_path"] = video_path_to_process
                st.session_state["video_duration"] = video_duration
                st.rerun()


    # --- Recommended Clips Section ---
    if "clips" in st.session_state and st.session_state["clips"]:
        clips = st.session_state["clips"]
        video_path = st.session_state["video_path"]
        video_duration = st.session_state.get("video_duration", 0.0)
        segments = st.session_state.get("transcript_segments", [])

        st.markdown("## Recommended clips")

        # Metrics row
        c1, c2, c3 = st.columns(3)
        c1.metric("Clips found", len(clips))
        avg_score = int(sum(c.score for c in clips) / len(clips)) if clips else 0
        c2.metric("Avg score", f"{avg_score}")
        c3.metric("Video length", seconds_to_timestamp(video_duration))

        # View full transcript expander
        with st.expander("📜 Full Timestamped Transcript"):
            st.text(format_timestamped_transcript(segments))

        # Render clip cards
        for idx, clip in enumerate(clips, 1):
            ui.clip_card(
                rank=idx,
                title=clip.title,
                start=clip.start_time,
                end=clip.end_time,
                score=clip.score,
                reason=f"{clip.reason} • Hook: \"{clip.hook}\"" if clip.hook else clip.reason,
                breakdown=clip.breakdown,
                duration=clip.duration
            )

            # Interactive action buttons per card
            col_actions, col_preview = st.columns([1, 1])
            out_clip_filename = f"clip_{idx}_{Path(video_path).stem}.mp4"
            out_clip_path = str(CLIPS_DIR / out_clip_filename)

            with col_actions:
                gen_btn = st.button(f"✂️ Generate Clip #{idx}", key=f"btn_gen_{idx}")
                if gen_btn:
                    with st.spinner("Cutting clip with FFmpeg..."):
                        cut_clip(
                            video_path=video_path,
                            start_sec=clip.start_sec,
                            end_sec=clip.end_sec,
                            output_clip_path=out_clip_path,
                            vertical_crop=vertical_crop
                        )
                        st.success(f"Clip #{idx} rendered!")

                if os.path.exists(out_clip_path):
                    with open(out_clip_path, "rb") as f:
                        st.download_button(
                            label=f"⬇️ Download Clip #{idx} (MP4)",
                            data=f,
                            file_name=out_clip_filename,
                            mime="video/mp4",
                            key=f"btn_dl_{idx}"
                        )

            with col_preview:
                if os.path.exists(out_clip_path):
                    st.video(out_clip_path)

            st.markdown("<hr style='margin: 1.5rem 0; opacity: 0.15;'/>", unsafe_allow_html=True)

if __name__ == "__main__":
    main()
