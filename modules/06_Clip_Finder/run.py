import sys
import subprocess
import uvicorn

def main():
    if "--streamlit" in sys.argv:
        print("Launching Streamlit App at http://localhost:8501...")
        cmd = [sys.executable, "-m", "streamlit", "run", "app/main.py"]
        subprocess.run(cmd)
    else:
        print("Launching Clipsmith App at http://localhost:8008...")
        uvicorn.run("app.server:app", host="0.0.0.0", port=8008, reload=True)

if __name__ == "__main__":
    main()
