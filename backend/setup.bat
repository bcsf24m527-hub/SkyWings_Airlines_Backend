@echo off
REM SkyWings Airlines - Quick Setup Script for Windows
REM This script automates the entire setup process

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  SkyWings Airlines - Setup Script
echo ========================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Download from https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js installed

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found
    pause
    exit /b 1
)
echo OK: npm installed

REM Check .env file
echo.
echo Checking .env configuration...
if not exist ".env" (
    echo ERROR: .env file not found
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy .env.example .env
        echo WARNING: Please edit .env with your MySQL password
    )
    pause
    exit /b 1
)
echo OK: .env file exists

REM Install dependencies
echo.
echo Installing dependencies...
if not exist "node_modules" (
    echo Running: npm install
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
) else (
    echo OK: Dependencies already installed
)

REM Database setup
echo.
echo Setting up database...
echo Creating database from schema...
mysql -u root -p"password" -e "DROP DATABASE IF EXISTS skywings_airlines; CREATE DATABASE skywings_airlines;" >nul 2>&1
mysql -u root -p"password" skywings_airlines < database\schema.sql >nul 2>&1
if errorlevel 1 (
    echo ERROR: Database setup failed
    echo Make sure MySQL is running and password is correct in .env
    pause
    exit /b 1
)
echo OK: Database created

REM Load demo data
echo.
echo Loading demo data...
node src\scripts\initialize_database.js >nul 2>&1
echo OK: Demo data loaded

REM Success
echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Server Information:
echo   URL: http://localhost:3000
echo   API: http://localhost:3000/api
echo   Database: skywings_airlines
echo.
echo Test Credentials:
echo   User Email: user@skywings.com
echo   User Password: user123
echo   Admin Email: admin@skywings.com
echo   Admin Password: admin123
echo.
echo Next Steps:
echo   1. Run: npm start
echo   2. Open: http://localhost:3000
echo   3. Login with test credentials
echo.
pause
