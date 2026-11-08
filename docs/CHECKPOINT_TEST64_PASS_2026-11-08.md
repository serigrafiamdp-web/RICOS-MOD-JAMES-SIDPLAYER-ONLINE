# TEST64 PASS — RICOS MOD – JAMES SIDPLAYER ONLINE

**Estado:** PASS confirmado por el usuario el 8 de noviembre de 2026 (hora de Argentina).  
**Referencia anterior:** [TEST62 PASS](CHECKPOINT_TEST62_PASS_2026-11-08.md).  
**Desarrollo intermedio:** [TEST63](TEST63_BETA_EDITS_STAGED.md).  
**Arquitectura:** [ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md](ARCHITECTURE_COMMUNITY_HVSC_D1_TEST62.md).

## Funciones verificadas por el usuario

1. El Worker de Cloudflare responde en `GET /capabilities` con `betaKeyRequired:true`, `editMode:"remove-only"` y `configured:true`.
2. Se pueden crear y publicar playlists comunitarias desde **HVSC LIBRARY** mediante **PUBLISH PLAYLIST** y la clave beta.
3. El botón **×** de cada canción permite quitarla de la reproducción/lista temporal.
4. En listas comunitarias creadas por usuarios (Cloudflare D1), el botón pequeño **SAVE** está fijo en la cabecera de la ventana flotante, a la izquierda de cerrar. Se habilita cuando hay eliminaciones.
5. **SAVE** muestra un diálogo emergente de clave beta y envía `PUT /playlists/{id}` para persistir los cambios en D1.
6. Al volver a cargar, las eliminaciones guardadas permanecen en la lista pública. Confirmación general **PASS** del propietario tras la secuencia de pruebas.

## Reglas estables

- La **clave beta compartida** autoriza publicación y modificaciones persistentes; se almacena como Secret `BETA_EDIT_KEY` en la configuración de Production de Cloudflare. **Nunca se incluye su valor en el repositorio**.
- Los visitantes pueden reproducir y quitar temporalmente canciones sin clave; al recargar se recupera la versión pública si no se guardaron cambios.
- Solo listas públicas **v2** alojadas en D1 admiten **SAVE**. Las originales **LOS PAT MORITAS, RICO y SID MIX 1** siguen siendo JSON estáticos en GitHub y no se sobrescriben. Rankings TOP 100 permanecen protegidos.
- Worker aplica validación de clave **en el servidor**, no solo en el navegador. El modo PUT permite únicamente quitar canciones existentes manteniendo orden, nombre y creador; no elimina la lista completa.
- Playlist D1 guarda **referencias pack/file**, no copias SID.
- Mantener motor SID, AUTO, diseño minimalista, ventanas movibles/redimensionables, paletas e interfaz aprobadas.
- Los botones **+** junto a canciones de listas existentes para añadir a una lista en preparación **todavía no están implementados**. Es una futura prueba independiente, no incluida en este PASS.

## Entradas operativas

- Player: https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=64save
- Worker: https://ricos-sid-community.serigrafiamdp.workers.dev
- API health: https://ricos-sid-community.serigrafiamdp.workers.dev/capabilities
- GitHub fuentes: `index.html`, `js/customPlaylist.js`, `css/style.css`, `community/api/worker.js`.
- D1: `ricos-sid-community`; binding `DB` en Production. Tablas existentes `playlists` y `submissions`.
- Los despliegues del Worker se hacen **por Cloudflare**. Los commits a GitHub no actualizan ese despliegue automáticamente.
- Antes de cambios posteriores, conservar un respaldo del Worker en producción y de D1.

## Siguiente desarrollo

**TEST65 propuesto:** botón **+** junto a cada SID elegible de playlists comunitarias y listas preestablecidas; añade a **MY PLAYLIST** sin cambiar el SID en reproducción. No ofrecer **×** de eliminación en rankings TOP 100. Las canciones de playlists v1 embebidas pueden necesitar correspondencia con HVSC antes de publicarse por referencias. Separar claramente el checkpoint PASS actual de funcionalidades nuevas.
