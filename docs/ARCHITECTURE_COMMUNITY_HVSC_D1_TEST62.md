# RICOS MOD – JAMES SIDPLAYER ONLINE
## Arquitectura técnica y operación — TEST62 PASS

**Fecha:** 2026-11-08 (Argentina)  
**Estado:** TEST62 PASS confirmado por el usuario mediante prueba de publicación comunitaria.  
**Repositorio:** https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE  
**Player:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/  
**API:** https://ricos-sid-community.serigrafiamdp.workers.dev  
**Check de lectura:** https://ricos-sid-community.serigrafiamdp.workers.dev/playlists

> Este documento describe el estado real del código y la infraestructura en el checkpoint; no equivale a una auditoría de seguridad, pruebas masivas ni garantía de disponibilidad. **GitHub Pages no recibe escritura pública.** La publicación compartida se resuelve en Cloudflare.

### 1. Objetivo del sistema

Permitir a cualquier visitante seleccionar SID existentes en **HVSC LIBRARY**, construir una playlist, escribir **nombre de la playlist** y **apodo/creador**, y pulsar **PUBLISH PLAYLIST**. La lista pasa al catálogo **COMMUNITY PLAYLISTS**, disponible para otros visitantes. **No se suben SID nuevos, ni se duplican los binarios** en D1: cada canción se representa por `pack` (ZIP publicado) y `file` (ruta del SID dentro del ZIP). Los rankings y las colecciones curadas son inmutables para los visitantes.

El apodo elegido se muestra como **Playlist by NOMBRE**. **No es una cuenta autenticada ni acredita identidad**.

### 2. Arquitectura y límites

```text
Visitante / navegador
  ├─ GitHub Pages: HTML / CSS / JS y reproductor SID
  │   ├─ index.html
  │   ├─ js/customPlaylist.js    pestañas, HVSC, playlists, llamadas API
  │   ├─ js/sidPlayer.js         motor de reproducción/orquestación
  │   ├─ js/backend_tinysid.js  emulación SID
  │   └─ css/style.css          diseño minimalista + variables de tema
  │
  ├─ GitHub Pages: catálogo HVSC inmutable
  │   ├─ library/index.json
  │   ├─ library/data/{musicians,demos}-*.json  (navegación por sección)
  │   └─ library/packs/{musicians,demos}/**/*.zip (audio original)
  │
  ├─ GitHub Pages: listas curadas históricas
  │   ├─ community/playlists.json
  │   └─ community/playlists/*.json (formato v1 con SID embebidos)
  │
  └─ Cloudflare Worker: API JSON pública /playlists
      └─ Binding DB → Cloudflare D1 'ricos-sid-community'
          ├─ playlists: id, title, creator, track_count, payload, created_at
          └─ submissions: ip_hash, created_ms (limitación de envíos)
```

**Separación fundamental:** D1 contiene metadatos/rutas de playlists comunitarias; **no es la biblioteca de música**. GitHub Pages sirve los ZIP originales e índices. GitHub y Cloudflare son servicios distintos y las modificaciones del Worker desplegado **no** se aplican simplemente editando los archivos del repo.

### 3. Estado de bibliotecas y navegación

- Colección de referencia **HVSC #85**, índice publicado de **59.626 SID originales**: **56.568 MUSICIANS**, **3.058 DEMOS**. El total cuenta archivos originales, no vistas virtuales.
- `tools/build_hvsc_library.py` organiza SID en ZIP por músico o sección DEMOS y genera índices `library/index.json` y `library/data/*.json`.
- `.github/workflows/build-hvsc-library.yml` construye y publica `library/` desde el archivo HVSC #85. Una modificación al generador puede disparar una **reconstrucción grande** de la colección. No dispararla sin intención.
- Letras **0–9, A–Z**, secciones/músicos a la izquierda y canciones a la derecha; scroll independiente. Buscar desde un campo dentro de la sección/letra seleccionada; **todavía no hay búsqueda global por toda HVSC**.
- Ejemplo de índice virtual: **Glenn Rune Gallefoss** bajo letra G, `virtualArtist:true`, enlazando SID acreditados desde otras rutas originales; cada referencia puede llevar `pack`, `file`, `origin`. No duplicar el SID en otro ZIP. El primer índice publicado verificó 529 SID acreditados desde `Blues_Muz`; el generador busca además coincidencias de crédito en el árbol completo cuando se ejecuta.
- Las pestañas de rankings **TOP 100 HVSC GAMES**, **TOP GROUPS**, **TOP MUSICIANS** no deben permitir a visitantes alterar los catálogos fijos.
- `USER LOCAL` conserva herramientas históricas de archivo local y guardado local. **COMMUNITY PLAYLISTS ya no muestra colecciones locales**. No confundir ambas rutas.

### 4. Flujo exacto de publicación comunitaria

1. Visitante abre **HVSC LIBRARY** (MUSICIANS o DEMOS).
2. Clic en pista = agregar a la bandeja **MY PLAYLIST**, no reproducir inmediatamente. **ADD ALL FROM ARTIST** agrega la selección del músico actual. La reproducción activa no debe detenerse.
3. Bandeja: revisar/quitar, **NEW LIST**, nombre de lista y apodo `Playlist by`.
4. **PUBLISH PLAYLIST** envía HTTPS `POST /playlists` a Cloudflare con objeto **`ricos-sid-playlist` versión 2**; **no** llama al almacenamiento local IndexedDB.
5. Worker valida longitud/formato, referencias, repetidos y límite de publicaciones; inserta la playlist en D1 y devuelve ID generado.
6. El navegador consulta `GET /playlists` y agrega las nuevas filas **después de las tres listas curadas** en **COMMUNITY PLAYLISTS**, con el mismo diseño, estrellas ilustrativas y botón **LOAD**.
7. Al abrir una comunitaria, pide `GET /playlists/{id}`, resuelve las referencias a los ZIP de GitHub, extrae los SID, valida, y recién entonces cambia a esa playlist e inicia su reproducción.

**Fuentes de comunidad:**
- Originales editadas manualmente en `community/playlists.json`: **LOS PAT MORITAS (34)**, **RICO (13)**, **SID MIX 1 (36)**. Se cargan desde JSON estático `version:1`, con SID codificado en Base64. No migradas a referencias HVSC.
- Nuevas de visitantes: filas D1 `version:2`, referencias `pack/file` solamente. El listado API devuelve metadatos; el detalle devuelve referencias.
- Orden actual de nuevas D1: `created_at ASC`; la consulta tiene `LIMIT 500`. No hay paginación aún.

### 5. Modelo de datos: playlist pública sin SID duplicados

Petición `POST /playlists` (ejemplo ilustrativo de formato):

```json
{
  "format": "ricos-sid-playlist",
  "version": 2,
  "name": "My Favorite SID",
  "createdBy": "RICO",
  "tracks": [
    {
      "pack": "library/packs/musicians/U/Uctumi.zip",
      "file": "Balloon_Country_Bursts.sid"
    }
  ]
}
```

**Cuidado:** `pack` es ruta relativa a la raíz de GitHub Pages del proyecto (no URL pública de terceros). `file` es nombre/ruta **dentro** del ZIP indicado, sensible a mayúsculas, acentos y directorios. Ej.: `library/packs/musicians/B/Blues_Muz.zip` contiene música acreditada a Gallefoss. Una vista virtual puede utilizar `track.pack` distinto del ZIP de la carpeta virtual.

Respuesta de publicación: `201` con `id`, `title`, `createdBy`, `tracks`. Worker agrega `createdAt` e ID UUID generado por servidor. Se guarda un documento JSON `payload` en D1.

`GET /playlists` responde:
```json
{
  "format": "ricos-community-catalog",
  "version": 1,
  "playlists": [
    {"id":"UUID","title":"My Favorite SID","createdBy":"RICO","tracks":1}
  ]
}
```
`GET /playlists/{id}` devuelve la playlist `version:2` completa con sus rutas, no los bytes de música.

**Formato anterior:** `version:1` con `tracks[].sidBase64`. Se mantiene para las tres listas curadas y algunas playlists locales históricas. No mezclar ambos contratos ni eliminar la compatibilidad sin migración probada.

### 6. Cloudflare Worker / D1

**Worker público:** `ricos-sid-community`, dominio `ricos-sid-community.serigrafiamdp.workers.dev`.  
**D1:** `ricos-sid-community`.  
**Binding obligatorio:** `DB` (exactamente en mayúsculas), entorno **Production**.  
**Tablas creadas en consola D1:** esquema en `community/api/schema.sql`.

Tabla `playlists`:
- `id TEXT PRIMARY KEY`: UUID de publicación
- `title TEXT NOT NULL`: nombre visible
- `creator TEXT NOT NULL`: apodo visible
- `track_count INTEGER NOT NULL`: cantidad
- `payload TEXT NOT NULL`: JSON completo con referencias y metadatos
- `created_at INTEGER NOT NULL`: timestamp Unix en milisegundos
- índice `playlists_created_at`

Tabla `submissions`:
- `ip_hash TEXT NOT NULL`: hash del IP usado para limitación básica
- `created_ms INTEGER NOT NULL`
- índice `submissions_ip_time`

**Archivos relevantes:**
- `community/api/worker.js`: versión de referencia del servidor que se pegó y desplegó **manualmente** en el editor de Cloudflare.
- `community/api/schema.sql`: esquema D1.
- `community/api/wrangler.toml`: nombre, binding `DB` e identificador D1 registrado.
- `community/config.json`: registra el endpoint; **en TEST62 el JS también lleva la URL fija en `communityApiBase`**. Si se cambia el dominio, actualizar ambos o refactorizar a una única configuración probada.

**Rutas API implementadas:**
- `GET /playlists`: primeras 500 playlists públicas, orden cronológico ascendente.
- `GET /playlists/{uuid}`: payload de una lista.
- `POST /playlists`: nueva playlist, versión 2.
- `OPTIONS`: preflight CORS para el origen permitido.

**Restricciones del Worker:**
- `Origin` esperado para POST: `https://serigrafiamdp-web.github.io`; no confundir origen con ruta de repositorio.
- CORS con ese origen en respuestas cuando el header coincide.
- POST limitado a unas **180.000 letras** de JSON, **máximo 2.000 referencias**; nombre hasta 100 caracteres, creador hasta 60; referencias a los patrones `library/packs/musicians|demos/...`.
- No se permiten referencias duplicadas dentro de una misma playlist.
- Límite básico de **5 publicaciones por hora por hash de IP**, con tabla `submissions`.
- No hay endpoint de edición o borrado público; cada publicación genera un UUID nuevo.
- El Worker **valida el formato de la referencia, pero no comprueba antes de publicarla que el archivo exista efectivamente en el ZIP**. Si una referencia desaparece, puede fallar la reproducción.

### 7. Estado de seguridad y pendientes (NO dar por resueltos)

- **Sin login:** `createdBy` es un apodo autodeclarado; puede haber nombres repetidos o suplantaciones. No prometer identidad verificada ni atribución autenticada.
- **No hay moderación previa, reportes, borrado administrativo en UI ni política antiabuso completa.** Abrir escritura a internet implica riesgo de spam y contenido ofensivo en nombres/créditos.
- **CORS y comparar Origin no son autenticación:** clientes fuera del navegador pueden falsificar ese encabezado. El rate limit por hash de IP es una primera defensa, no garantía.
- `RATE_SALT` opcional en el código se usa vacío si no se configura; establecer secret aleatorio y estudiar mejor rate limiting/CAPTCHA/Turnstile, moderación y limpieza de `submissions`.
- El límite de 500 resultados requiere paginación cuando crezca la comunidad.
- No se admiten actualmente ediciones, eliminación por creador, votaciones reales, reordenamiento público ni deduplicación entre playlists distintas.
- La carga de una playlist con referencias ZIP extrae/valida **todos** los SID antes del primer audio; en listas grandes o repartidas en muchos ZIP puede demorar. Optimización futura: reproducción/carga progresiva sin alterar garantías de formato.
- Música y software de terceros: respetar derechos, atribuciones y condiciones de distribución; el diseño de referencias no sustituye esa revisión.

### 8. Recuperación y mantenimiento

**Conservar siempre por separado:**
1. **Repositorio GitHub** (historial + `index.html`, `css/`, `js/`, `community/api/`, `community/playlists/`, `tools/`, `library/`).
2. **Worker desplegado** en Cloudflare Production (puede diferir del código del repo si se editó desde el panel). Exportar/respaldar código de la versión que funciona antes de editar o redeplegar.
3. **D1 real**, que contiene playlists creadas por visitantes. **No está respaldada por GitHub ni por el JSON estático**. Programar exportación/backup D1 y ensayar recuperación.
4. **Binding** `DB` en Production y URL `workers.dev`.
5. Registro de **TEST62 PASS** y enlace de validación.

**Para revisar salud sin publicar nada:**
- Abrir `https://ricos-sid-community.serigrafiamdp.workers.dev/playlists`; debe entregar JSON `format:ricos-community-catalog` `version:1`, array `playlists`.
- Abrir GitHub Pages → COMMUNITY PLAYLISTS; debe mostrar las tres curadas primero y las nuevas de D1 debajo, con idénticos controles visuales.
- Desde un navegador diferente o ventana privada comprobar que una playlist pública se ve, en vez de confiar en almacenamiento local.
- Probar `LOAD` de una playlist v2 y otra v1; comprobar metadatos, autores, audio y AUTO.
- Verificar D1 Console `SELECT COUNT(*) FROM playlists;` y registros de Worker/errores si falla la publicación.
- Evitar crear playlists de prueba repetidamente en producción; no hay botón de borrado público.

**Diagnóstico rápido:**
- `GET /playlists` falla: revisar Worker activo, D1 binding `DB`, tablas y logs.
- POST falla por CORS: revisar dominio/origen exacto y preflight OPTIONS. `curl` y el navegador se comportan distinto.
- POST `400`: nombre/creador vacíos, tracks mal formateados, referencias repetidas, tamaño excesivo.
- POST `429`: límite de 5 publicaciones/hora por IP hash.
- Publica pero no reproduce: revisar `pack` y `file` exactos en GitHub y cómo se resuelve el ZIP.
- Playlists nuevas no aparecen: comprobar el endpoint en `js/customPlaylist.js`, caché `?v=test62public` y la respuesta GET de D1; no modificar los 3 JSON curados por error.
- Desplegar nueva versión del Worker: cambiar en **Cloudflare**; subir `worker.js` a GitHub **no redespliega** el Worker creado desde Hello World.

### 9. Política de compatibilidad de interfaz / producto

- Mantener nombre del proyecto, créditos del creador original James/Jojati y motor TinySID/WebSID; no reemplazar motor al modificar playlists.
- Mantener la ventana principal centrada, tamaño ajustable, diseño minimalista, paletas del osciloscopio y temas de colores.
- Mantener pestaña **COMMUNITY PLAYLISTS** como **una sola lista visible**, sin bloques separados entre lo curado y lo creado por usuarios; conservar arriba las tres listas originales y continuar abajo con las nuevas.
- **PUBLISH PLAYLIST** significa guardar **en D1 para todos**, no localmente. No mostrar éxito si el POST falla.
- No cargar/reproducir automáticamente cuando el visitante **agrega** SID desde la biblioteca; la escucha activa sigue intacta.
- Mantener `Playlist by` (creador de la lista) separado del compositor/autor de cada SID.
- Conservar rankings inmutables, SID binarios originales, orden de playlists y créditos existentes.

### 10. Pruebas y checkpoint

**TEST62 PASS**: el usuario confirmó explícitamente que la publicación comunitaria funciona después de configurar Cloudflare Worker y D1 e integrar GitHub Pages. La respuesta GET `{"format":"ricos-community-catalog","version":1,"playlists":[]}` también se observó antes de publicar la primera playlist de prueba.

La confirmación **no** implica que los mecanismos pendientes de seguridad, backups, paginación o reproducción de las 59.626 pistas hayan sido auditados.

**Archivos relacionados:** `README.md`, `docs/CHECKPOINT_TEST62_PASS_2026-11-08.md`, `community/api/{worker.js,schema.sql,wrangler.toml}`, `community/config.json`, `community/playlists.json`, `tools/build_hvsc_library.py`, `js/customPlaylist.js`, `index.html` y `css/style.css`.
