@echo off
cd /d "%~dp0"
git init
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/anasoficasca-code/REN3D.git
git add index.html .nojekyll README.md
git commit -m "REN3D hiperrealista: Luma Gaussian Splatting + modo juego" 2>nul
echo.
echo Se abrira el login de GitHub. Inicia sesion y autoriza.
git push -u origin main --force
echo.
echo Listo. Ahora activa Pages en: https://github.com/anasoficasca-code/REN3D/settings/pages
echo Tu web quedara en: https://anasoficasca-code.github.io/REN3D/
pause
