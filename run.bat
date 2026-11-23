@echo off
REM Levanta backend (FastAPI) y frontend (Vite) en dos ventanas.
REM Requiere haber creado backend\env e instalado dependencias (ver README).

echo Iniciando backend en http://localhost:8000 ...
start "Dashboard Analitico - API" cmd /k "cd /d %~dp0backend && call env\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

echo Iniciando frontend en http://localhost:5173 ...
start "Dashboard Analitico - Web" cmd /k "cd /d %~dp0frontend && npm run dev"
