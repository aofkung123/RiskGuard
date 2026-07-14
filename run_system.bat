@echo off
echo ===================================================
echo   Starting RiskGuard Platform (Lightweight Mode)...
echo ===================================================

:: 1. Database (SQLite is used by default)
:: By default, RiskGuard uses local SQLite database files (riskguard.db & riskguard_dw.db).
:: PostgreSQL in Docker Compose is NOT used unless DATABASE_URL is configured in a .env file.
:: We comment this out to save a massive amount of RAM and CPU resources.
:: Uncomment the lines below if you explicitly configure and use PostgreSQL.
::
:: echo [1/3] Starting Database via Docker Compose...
:: docker-compose up -d
:: if %errorlevel% neq 0 (
::     echo [WARNING] Failed to start Docker Compose.
:: ) else (
::     echo [SUCCESS] Database container started.
:: )
echo [1/3] Database: Using SQLite (Local files: riskguard.db). No Docker container needed.

:: 2. Start Backend in a new window
echo [2/3] Starting FastAPI Backend in a new window...
:: Optimized: Removed 'pip install -r requirements.txt' from every run to boot up instantly.
:: If you add new packages in requirements.txt, please run pip install manually.
start "RiskGuard Backend" cmd /k "cd backend && echo Starting Backend... && python run.py"

:: 3. Start Frontend in a new window
echo [3/3] Starting Next.js Frontend in a new window...
:: Optimized: Only run 'npm install' if 'node_modules' folder is missing.
start "RiskGuard Frontend" cmd /k "cd frontend && (if not exist node_modules (echo Installing dependencies... && npm install) else (echo Dependencies already installed, skipping npm install.)) && echo Starting Frontend... && npm run dev"

echo ===================================================
echo   Startup commands triggered successfully!
echo   Please check the newly opened windows for logs.
echo ===================================================
pause

