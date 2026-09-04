@echo off
echo ==============================================
echo  Starting SentinEx-AI FastAPI Backend Server
echo ==============================================
cd /d "%~dp0Backend"
if exist "..\venv\Scripts\python.exe" (
    "..\venv\Scripts\python.exe" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
) else (
    python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
)
pause
