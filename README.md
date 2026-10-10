# REN3D • Kennedy Hiperrealista 3D

Videojuego / visor 3D hiperrealista con **Gaussian Splatting** usando `luma-web` (mismo motor de tus ejemplos).

## Ver en web
Una vez subido con GitHub Pages:
`https://anasoficasca-code.github.io/REN3D/`

Con tu captura de Kennedy:
`https://anasoficasca-code.github.io/REN3D/?capture=https://lumalabs.ai/capture/TU-ID`

## Cómo subir (borra lo viejo y sube esto)
Este `index.html` REEMPLAZA todo lo anterior (la versión de cajitas no era hiperrealista).

```powershell
cd "C:\Users\ACER\Documents\Default Project\REN3D"
git init
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/anasoficasca-code/REN3D.git
git add index.html .nojekyll README.md
git commit -m "REN3D hiperrealista: Luma Gaussian Splatting + modo juego"
git push -u origin main --force
```

Luego activa la web: en GitHub → repo REN3D → Settings → Pages → Deploy from branch → `main` / `(root)` → Save.
Espera 1-2 min y abre el link de arriba.

## Cómo poner KENNEDY real (importante)
Google Earth **no sirve** para esta calidad (licencia + sin splats). Necesitas 1 captura Luma:

1. Graba Kennedy con dron o celular (video dando vueltas / flythrough, 1-3 min).
2. Súbelo a https://lumalabs.ai → te devuelve un link `https://lumalabs.ai/capture/...` público.
3. Pégalo en la barra inferior del juego ("Cargar Kennedy") o en `?capture=`.

La escena demo incluida es el castillo hiperrealista de tu foto, para que veas el nivel visual objetivo.
