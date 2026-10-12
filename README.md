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
## Simulación de tráfico y árbol 3D

- La escena **TODO 3D** reproduce las trayectorias del módulo de referencia: **4.202 vehículos identificados**, hasta **2.581 carros simultáneos** y **1.499 segundos (24:59)** de duración, en un ciclo continuo.
- Las trayectorias se guardan en `data3d/vehicles.bin` para no descargar un JSON de 58 MB y conservar una carga más rápida.
- El roble entregado (`data3d/roble.IT.bol`) queda versionado junto con su textura web `data3d/roble.png`; el visor usa esa textura en árboles 3D instanciados.
- El agua del modo TODO 3D usa una malla y shader continuo, sin capas de partículas/puntos sobre la superficie.

## Modelos reales (carros, arboles, pasto, agua, aves)

- `data3d/real3d.js` construye los carros (cinco estilos, siempre de frente: el modelo mira hacia +Z y el giro usa `atan2(dx, dz)`), cuatro especies de arboles reales 3D (cerca y a media distancia) con siluetas reales de lejos, pasto y juncos 3D verdes y plantas reales cerca de la camara (parques y alrededor del agua), el agua con ondas reales y las aves de los humedales.
- Los modelos estan en `data3d/models/` y los creditos en `data3d/CREDITOS.txt`.
- El modo TODO 3D vuelve a cargar `real3d.js` (árboles 3D reales con LOD, pasto/juncos/plantas 3D y agua con mapa de normales). Si falla, usa los árboles de planos cruzados y el pasto de tarjetas como respaldo.
- El suelo de los parques usa una textura de pasto repetible generada por código (`grassGroundTexture` en `index.html`), mezclada a dos escalas para que no se note el mosaico.
- Arboles: nivel 0 = modelo real completo, nivel 1 = modelo real reducido, nivel 2 = arbol 3D de bajos poligonos (tronco + copa con varias masas) hasta 1.100 m. Las siluetas planas solo quedan mas alla de ese rango. Si eal3d.js no carga, se usan los arboles de planos cruzados como respaldo.
- El suelo de fondo usa una textura de concreto repetible generada por codigo (concreteTex en index.html).
- Simulacion de carros: la flota de eal3d.js (cinco estilos, de frente) sigue las trayectorias de data3d/kennedy_vehiculos.json; arranca en marcha a las 16:40 y la barra de abajo permite pausar y mover el tiempo.
- Suelo realista: data3d/materiales.js aplica fotos reales (concreto para piso, vias y aceras; pasto) con muestreo sin repeticion visible (baldosas desplazadas al azar y mezcladas + variacion de tono a gran escala), asi el suelo es continuo y no se ve el mosaico al alejarse. Texturas en data3d/textures/ (creditos en CREDITOS.txt).
- Vias: cintas continuas con uniones en las curvas (sin cortes), calzada de concreto claro, acera con adoquin, talud y rayas centrales; major 15 m, mid 10 m, local 6 m.
- Agua: refleja el cielo con nubes (entorno makeEnv) y su oleaje no repite mosaico.
- Arboles lejanos: nivel 2 = arbol 3D de bajos poligonos con color real de las hojas, moteado de follaje y viento; los arboles reales tambien se mecen.
- Simulaciones: carros (trayectorias reales, barra de tiempo), peatones por las aceras (solo se dibujan cerca de la camara), viento en arboles y pasto, oleaje y nubes.
- Aves 3D (data3d/aves3d.js): patos macho y hembra, fochas y garzas blancas posadas, mas garzas y patos en vuelo batiendo las alas; modelos de varias piezas con color por vertice, repartidos por todos los humedales y lagunas (no solo El Burro). Los patos nadan, se detienen y meten la cabeza al agua; las garzas caminan por la orilla.
- Arboles lejanos: la copa de nivel 2 se deriva del volumen de hojas del modelo real de cada especie, asi la silueta coincide con la del arbol cercano.
- `?liviano=1` abre el modo TODO 3D sin edificios ni sombras (equipos modestos o pruebas).
- Para usar otra foto de ave, reemplaza los PNG de `data3d/aves/`.
