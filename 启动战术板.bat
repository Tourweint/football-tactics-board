@echo off
chcp 65001 >nul
title 足球战术板 Football Tactics Board
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 npm，请先安装 Node.js：https://nodejs.org/
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo 首次运行：正在安装依赖，请稍候...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络后重试
        pause
        exit /b 1
    )
)

echo 正在启动战术板，浏览器将自动打开...
call npm run dev -- --open

echo.
echo 开发服务器已停止。
pause
