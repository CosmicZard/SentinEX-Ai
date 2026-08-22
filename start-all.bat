@echo off
echo ==============================================
echo  Launching SentinEx-AI Full Stack Platform
echo ==============================================
start "SentinEx-AI Backend" cmd /k "cd /d %~dp0Backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
start "SentinEx-AI Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Backend running on:  http://localhost:8000
echo Swagger API Docs on: http://localhost:8000/docs
echo Frontend running on: http://localhost:5173
