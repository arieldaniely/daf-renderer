@echo off
chcp 65001 >nul

echo בונה את הפרויקט...
call npm run build

echo.
echo מכין את תיקיית האתר (_site)...
if not exist "_site\dist" mkdir "_site\dist"
if not exist "_site\fonts" mkdir "_site\fonts"
if not exist "_site\assets" mkdir "_site\assets"

copy /Y site\index.html _site\index.html >nul
copy /Y site\assets\* _site\assets\ >nul
copy /Y dist\daf-renderer.esm.js _site\dist\ >nul
copy /Y examples\fonts\*.ttf _site\fonts\ >nul

echo.
echo מפעיל שרת מקומי ופותח את הדפדפן...
call npx http-server _site -c-1 -o