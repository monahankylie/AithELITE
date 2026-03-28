@echo off
set "SOURCE_DIR=ParsedGames"
set "TARGET_DIR=games_w_players"

:: Validation
if not exist "%SOURCE_DIR%" (
    echo Error: %SOURCE_DIR% not found.
    exit /b 1
)

:: Create target directory
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: Execution
:: /P: Path to search
:: /M: File mask
:: /S: Recurse subdirectories
:: /C: Command to execute
:: @fsize: Variable for file size in bytes
:: @path: Variable for full path of the file
forfiles /P "%SOURCE_DIR%" /M *.json /S /C "cmd /c if @fsize GTR 1000 copy @path ..\%TARGET_DIR% >nul"

echo Processing complete.