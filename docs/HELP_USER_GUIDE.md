# RICOS MOD – JAMES SIDPLAYER ONLINE: HELP / User Guide

**Interface language:** English, with **ESPAÑOL** available in the built-in HELP window.

## Player overview / Uso general

**EN** — Click **CHOOSE A SID** to open the browser with COMMUNITY PLAYLISTS, GAMES (22), TOP 100 HVSC GAMES, TOP GROUPS, TOP MUSICIANS, HVSC LIBRARY and OUR COLLECTION. Start playback by selecting a SID or clicking PLAY on a playlist. **PLAYLIST** shows or hides the floating track list. The player also includes PLAY, STOP, NEXT SID, waveform palette/display controls and voice/filter switches.

**ES** — Pulsá **CHOOSE A SID** y elegí entre COMMUNITY PLAYLISTS, GAMES, TOP 100, TOP GROUPS, TOP MUSICIANS, HVSC LIBRARY y OUR COLLECTION. Seleccioná un SID o una playlist para reproducir. **PLAYLIST** muestra u oculta la ventana flotante. También hay PLAY, STOP, NEXT SID, osciloscopio y controles de voces y filtro.

## Create a REMIX playlist / Crear una lista REMIX

1. **EN:** Open **REMIX PLAYLIST**, then **NEW REMIX**. **ES:** Abrí **REMIX PLAYLIST** y elegí **NEW REMIX**.
2. **EN:** Set the playlist name and **Playlist by** creator. **ES:** Completá nombre y autor.
3. **EN:** Click **DONE**. Browse other songs and click **+** next to any compatible SID to add it to the selected REMIX. **ES:** Pulsá **DONE**, buscá canciones y usá **+** para agregarlas.
4. **EN:** Use the arrows in the REMIX editor or the floating player to reorder; **PLAY REMIX** plays the draft. **ES:** Ordená con las flechas o reproducí con **PLAY REMIX**.
5. **EN:** SAVE in the floating playlist preserves an unpublished REMIX order in browser storage; **PUBLISH REMIX** requests the beta key and publishes it to Cloudflare. **ES:** SAVE conserva localmente el orden del REMIX sin publicar; **PUBLISH REMIX** pide clave beta y publica en Cloudflare.

## Playlist ordering and saving / Ordenar y guardar

| Type / Tipo | SAVE behavior / Comportamiento | Beta key / Clave |
| --- | --- | --- |
| Unpublished REMIX / REMIX sin publicar | Saves the existing draft locally / Guarda el borrador local | No |
| Local import or other local list / Lista local | Saves in browser IndexedDB / Guarda en este navegador | No |
| Public HVSC-reference playlist / Playlist pública | Updates reference order on Cloudflare / Actualiza el orden público | Yes / Sí |
| Published contributed SID collection / Colección publicada | Updates SID reference order on Cloudflare / Actualiza el orden público | Yes / Sí |
| TOP 100 ranked lists / TOP 100 rankeadas | Protected read-only order / Orden protegido | SAVE unavailable |

**Controls / Controles:** single-click ↑ / ↓ moves one position; double-click moves ten; hover displays the hint. The playing SID continues without restarting. SAVE appears for non-ranked editable playlists and enables when changes are pending.

**Confirmed checkpoint:** TEST108 **PASS** for UCTUMI (99) public collection order persistence after save + beta key + reload, with TEST107 server read-back verifying the exact order. This does **not** imply every other playlist route has been browser-tested.

**IMPORTANT:** For a public playlist, wait for **SAVE verified** before reloading. If the UI shows **SAVE NOT VERIFIED**, keep the current list open, retry and check that the Cloudflare Worker exposes `playlistReorder:true` and `sidCollectionReorder:true` at [capabilities](https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities). Local saves are private to the current browser.

## Import SID / Importar archivos

**EN** — **IMPORT SID** lets you add local SID files and manage locally saved lists; supported JSON export/import is available. Uploading or publishing a public SID collection is a separate, beta-key-authorized operation. Personal lists stored in the browser are not remotely shared.

**ES** — **IMPORT SID** permite cargar archivos SID del equipo, guardarlos en el navegador y usar importación/exportación JSON. Publicar una colección compartida es otra operación y exige clave beta.

## AUTO & TIMER / AUTO y temporizador

**EN** — AUTO advances to the next SID. The MM:SS TIMER in the floating playlist caps the playing time. The player may advance early after sustained actual audio silence. For multi-subtune SID files, select subtunes with the < and > controls.

**ES** — AUTO avanza de SID automáticamente. TIMER en formato MM:SS fija el tiempo máximo por canción. Puede pasar antes si detecta silencio de audio sostenido. Los SID con varios subtunes tienen controles < y >.

## HELP window / Ventana HELP

The new **HELP** button is immediately to the right of **ABOUT** in the player controls. It displays an English/Spanish in-app guide with **ENGLISH** / **ESPAÑOL** language buttons and **CLOSE**. The bottom buttons read **ABOUT SID CHIP**, **ABOUT**, **HELP**, all uppercase with content-sized widths.

**Source files:** `index.html` (markup), `js/help.test109.js` (open/close/language, no playback logic), `css/style.css` (compact controls and themed HELP). GitHub Pages asset URLs carry `test109help` cache version.

## Verification and status

**TEST109 — PUBLISHED, BROWSER PASS PENDING.** The implementation does not modify audio engine, SID binaries, the Worker, the database, replay timers, or underlying playlist save/publish logic. Validate that the HELP window opens, switches languages, scrolls, closes, and reopens while music keeps playing; the ABOUT and ABOUT SID CHIP controls must remain functional.

## Links

- [Open the player](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=109help)
- [TEST108 PASS for UCTUMI persistence](TEST108_UCTUMI_SAVE_ORDER_PASS.md)
- [TEST107 order verification](TEST107_SAVE_RELOAD_VERIFY.md)
- [TEST94 Worker deployment checklist](TEST94_REORDER_DEPLOY.md)
