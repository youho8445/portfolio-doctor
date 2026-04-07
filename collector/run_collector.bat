@echo off
cd /d C:\dev\project4\collector
call venv\Scripts\activate
python fetch_prices.py
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] 수집 중 오류가 발생했습니다. logs\ 폴더를 확인하세요.
)
