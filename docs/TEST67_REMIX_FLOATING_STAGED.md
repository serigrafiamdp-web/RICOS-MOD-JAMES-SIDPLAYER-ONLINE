# TEST67 — REMIX PLAYLIST CREATOR FLOATING WINDOW (STAGED)

**Estado:** código publicado en GitHub Pages para pruebas; **NO PASS** hasta la confirmación del usuario.  
**URL:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=67float1  
**Base:** TEST66; checkpoints anteriores TEST64 PASS y TEST65 Cloudflare metadata-and-delete activado.

## Implementación

- El botón **REMIX PLAYLIST** de la lista en reproducción **abre la ventana flotante REMIX PLAYLIST CREATOR**.
- En la lista en reproducción quedan el botón REMIX PLAYLIST, el desplegable **ADD + TO** para escoger el remix destinatario, el contador y los botones **+** junto a las canciones.
- La ventana separada tiene título movible, botón cerrar **×**, selector de remix para edición, nombre, creador, **NEW REMIX**, lista de canciones del remix con ×, **PLAY REMIX** y **PUBLISH REMIX**.
- Cambiar destinatario en cualquiera de los dos desplegables actualiza el único `remixTarget`; los + posteriores se añaden únicamente a esa lista.
- La ventana Remix Creator tiene scroll propio para las canciones, dimensiones editables con CSS resize, paleta compartida con `--rico-theme-bg`, `--rico-theme-fg`, `--rico-theme-panel`, `--rico-theme-hover` y `--rico-theme-border`.
- La lista principal dedica altura restante a su scroll, con `flex:1 1 0` y `min-height:0`; al alargar la ventana principal la zona útil de canciones se extiende.
- Los remixes en preparación siguen almacenados **solo en sessionStorage**; no se publican hasta PUBLISH REMIX y clave beta. Los + no cambian la reproducción.
- Ningún cambio del Worker o del esquema D1 es necesario para TEST67.

## Regresiones a comprobar

1. Cargar playlist pública v2 con referencias HVSC; abrir REMIX PLAYLIST y comprobar ventana flotante independiente.
2. Crear REMIX 1 y REMIX 2, elegir destino en desplegable de playlist y agregar con + sin interrumpir audio.
3. Cerrar y volver a abrir flotante: drafts mantienen canciones, nombre y creador.
4. Mover y redimensionar ventana flotante, cambiar paleta y verificar contraste.
5. Ampliar playlist principal hacia abajo: scroll de canciones ocupa la altura nueva.
6. PLAY REMIX reproduce draft; PUBLISH REMIX solicita clave beta y publica lista nueva solo tras confirmación.
7. Las listas v1 históricas y rankings sin mapeo HVSC no pueden publicar referencias inexistentes: se avisa sin inventarlas.
8. SAVE, EDIT, DELETE, funcionamiento SID y navegación original intactos.

**No marcar PASS sin verificación del usuario.**
