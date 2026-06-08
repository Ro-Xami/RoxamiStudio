@echo off
title Roxami Studio
echo ================================
echo   Roxami Studio 启动中...
echo ================================
echo.
start http://localhost:8080
npx --yes http-server . -p 8080 -c-1
pause
