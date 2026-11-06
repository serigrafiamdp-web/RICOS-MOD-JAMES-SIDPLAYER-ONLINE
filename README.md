# RICOS MOD - JAMES SIDPLAYER ONLINE

Archivo funcional y modificaciones del reproductor web SID originalmente alojado en http://level3.jojati.com/sidplayer/.

## Reproductor

GitHub Pages: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/

- 22 SID originales preservados con sus imágenes y tiempos documentados.
- Osciloscopio original o con relleno, y paletas retro.
- AUTO ON/OFF: avanza subtunes y SID según duración conocida o tiempo de respaldo.
- TEST04: CUSTOM playlist de múltiples archivos SID locales, sin miniaturas; seleccionar archivos múltiples, carpeta de SID (Chrome/Edge) o arrastrar archivos/carpetas.
- Lectura de metadata PSID/RSID (título, autor, año/copyright, cantidad de subtunes y subtune inicial).
- DEFAULT restaura la lista original; CUSTOM usa los archivos locales en memoria.
- Los archivos locales NO se suben a este repositorio ni a un servidor y se pierden al recargar la página.
- Los encabezados PSID/RSID **no incluyen duración de reproducción**: AUTO para CUSTOM usa el tiempo de respaldo configurable (180 segundos inicialmente) hasta incorporar una fuente de duraciones fiable.

## Respaldo de pruebas

Rama: `pass-test03-before-custom-playlist`. Es una copia previa al TEST04 para recuperar la versión anterior.

## Código original y créditos

- Web original: http://level3.jojati.com/sidplayer/
- Fuente modificada publicada allí: `src/sidplayersrc.zip`.
- Motor de SID: WebSid (Tiny'R'Sid), Juergen Wothke: https://github.com/wothke/websid.
- Versión anterior del sitio: `old/`.

Mantener los créditos originales y consultar las licencias indicadas en la página fuente. El sitio describe el código de WebSid y sus modificaciones como CC BY-NC-SA 4.0. Los derechos de los archivos musicales pueden tener condiciones adicionales.

Esta conservación y modificación es independiente de los autores originales.
