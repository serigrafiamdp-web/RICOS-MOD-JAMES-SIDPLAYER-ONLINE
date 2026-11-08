# TEST73 — IMPORT SID local y playlists dentro de COMMUNITY PLAYLISTS

**Estado:** código preparado en GitHub para prueba del usuario, NO PASS confirmado.
**URL:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=73import2

## Comportamiento

- Nuevo botón **IMPORT SID** en la barra inferior, independiente de Choose A SID y de HVSC LIBRARY.
- Ventana separada, movible y redimensionable para elegir archivos .sid o una carpeta, importar/exportar JSON de playlists, nombrar la lista y guardar con **SAVE LIST**.
- Los archivos importados se mantienen en `importedSidEntries` separado del buffer `custom` utilizado para reproducir otras listas. Así las listas comunitarias o rankings cargados no se guardan por error como archivos locales.
- Guardado local persistente mediante **IndexedDB** ya existente: `ricos-sid-playlists`, store `playlists`; formato v1 con SID codificados en Base64. El almacenamiento está sujeto a cuota y políticas del navegador: crear backups mediante DOWNLOAD JSON.
- Una playlist local **solo se añade a COMMUNITY PLAYLISTS después de SAVE LIST**, donde convive con las listas públicas y remixes. Su fila incluye **LOAD**, **DELETE** local y **PUBLISH** deshabilitado. El botón PUBLISH muestra información de que aún no está implementada la subida de los SID binarios.
- PLAYLISTS de D1 permanecen independientes. No se transmite ningún archivo SID al Worker ni a Cloudflare, ni se da de alta en HVSC o CSDb.
- La futura publicación requerirá almacenamiento de bytes en Cloudflare R2 (u otro almacenamiento de objetos), metadatos de D1, clave de autorización, validación PSID/RSID, límites y controles sobre derechos de publicación. No se considera implementada.

## Comprobaciones de usuario pendientes

1. Click IMPORT SID -> abre ventana sin cambiar el browser Choose A SID.
2. Importar varios SID y verificar contador y lista; guardar con SAVE LIST usando un nombre.
3. Abrir COMMUNITY PLAYLISTS: aparece la lista local con LOAD DELETE PUBLISH (deshabilitado).
4. Recargar la página y verificar persistencia; LOAD reproduce; DELETE la elimina localmente (no afecta listas públicas).
5. Confirmar que no aparecen los SID de la playlist comunitaria cargada por error en la lista de importación.
6. Probar cambios de paleta y redimensionado sin afectar reproducción.

No marcar PASS hasta confirmar pruebas reales de usuario.
