# TEST74 PASS / TEST75 PALETTE STAGED — 2026-11-08

## TEST74 — PASS confirmado por el usuario

- Cerrar una playlist flotante no debe revelar el browser local obsoleto.
- Choose A SID vuelve a COMMUNITY PLAYLISTS.
- IMPORT SID funciona como ventana local separada, sin subir archivos.
- El motor de reproducción continúa operativo.
- Punto de regreso de código: commit `838dc82748e1f05233ced188b6089fb96c74855a` (index de TEST74) y estado anterior de CSS `4320a1bcfcfa8decdd3a1a3fc88e0624b643cf77`.

## TEST75 — corrección visual publicada; falta PASS del usuario

URL de prueba: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=75palette1

Se agregaron reglas CSS para unificar colores de:
- Botones, textos y bordes en la barra inferior, incluido PLAYLIST en estado activo, AUTO, osciloscopio, controles de subtune y About.
- Checkboxes de VOICE 1/2/3 y filtro mediante `accent-color`.
- Metadatos SID, canciones, autores, calificaciones y controles + / × / SAVE.
- REMIX PLAYLIST, IMPORT SID, campos de texto, diálogos de clave beta, botones PUBLISH, y controles disabled.
- Catálogo COMMUNITY PLAYLISTS, selector, filas, estrellas, y estados hover.
- Colores de CSS usan las variables que `sidPlayer.applyOscilloscopeColors()` ya sincroniza al cambiar el tema: `--rico-theme-bg`, `--rico-theme-fg`, `--rico-theme-border`, `--rico-theme-panel`, `--rico-theme-hover`.
- No se cambió código de audio, motor SID, Cloudflare, D1, ni datos de playlists.

### Regresión pendiente

1. Cambiar todos los colores con botón `Color:` (Original, Green Phosphor, Amber, Orange, P1 Phosphor, C64 BASIC, C64 Cyan, Retro Magenta).
2. Verificar texto, borde e iconos de barra inferior; el botón PLAYLIST activo ya no debe quedar verde al elegir naranja, por ejemplo.
3. Comprobar ventana de reproducción, COMMUNITY PLAYLISTS, REMIX PLAYLIST CREATOR, IMPORT SID, modal beta, estrellas y + / × / SAVE.
4. Confirmar legibilidad de todos los estados (hover, seleccionado, disabled, input, checkbox), y ausencia de regresión de reproducción.
5. Marcar TEST75 PASS solo si el usuario verifica.

